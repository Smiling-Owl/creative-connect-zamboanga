import { can } from './policy';
import { cloneData, fail, findRecord, log } from './core';
import { receiveNewApplication } from './application';
import type { Ctx, DomainData, QueueItem, Result } from './types';

// Device queue on a coordinator's approved device. An item reaches the council only when a
// simulated delivery succeeds. Delivered items are never sent again, so retries cannot duplicate.

const FAILURE_MESSAGE = 'The connection dropped before the council confirmed receipt. Nothing was received. Retry when connected.';

function isPending(item: QueueItem): boolean {
  return item.status === 'waiting' || item.status === 'failed';
}

/** Sends waiting or failed items in order. Stops at the first simulated failure so the rest stay queued. */
export function syncQueue(data: DomainData, ctx: Ctx, input: { itemId?: string } = {}): Result {
  if (!can(ctx.actor, 'sync_queue', { siteId: ctx.actor.siteId })) {
    return fail('forbidden', 'Only a coordinator device can send its queue.');
  }
  if (!ctx.settings.online) {
    return fail('offline', 'Connect to send. Queued items stay on this device until then.');
  }
  const next = cloneData(data);
  const pending = next.queue
    .filter((i) => i.coordinatorId === ctx.actor.id && isPending(i) && (!input.itemId || i.id === input.itemId))
    .sort((a, b) => (a.queuedAt === b.queuedAt ? a.id.localeCompare(b.id) : a.queuedAt.localeCompare(b.queuedAt)));

  if (input.itemId && pending.length === 0) {
    return fail('not_pending', 'That item is no longer waiting to be sent.');
  }

  let failedItemId: string | undefined;
  for (const item of pending) {
    item.attempts += 1;
    if (ctx.settings.failNextSend) {
      item.status = 'failed';
      item.lastError = FAILURE_MESSAGE;
      failedItemId = item.id;
      log(next, ctx, { entityType: 'queue', entityId: item.id, action: 'send_failed', from: 'waiting', to: 'failed', viaId: ctx.actor.id });
      break;
    }

    if (item.kind === 'new_application') {
      const recordId = receiveNewApplication(next, ctx, {
        fields: item.fields,
        source: item.source,
        optedIn: item.optedIn,
        personId: null,
        viaId: ctx.actor.id,
      });
      item.status = 'delivered';
      item.deliveredRecordId = recordId;
      item.lastError = null;
      log(next, ctx, { entityType: 'queue', entityId: item.id, action: 'delivered', from: 'waiting', to: 'delivered', viaId: ctx.actor.id });
      continue;
    }

    const record = item.recordId ? findRecord(next, item.recordId) : null;
    const stillMatches =
      record !== null && record.application.version === item.baseVersion && record.application.state === 'changes_requested';
    if (!record || !stillMatches) {
      item.status = 'conflict';
      item.lastError = 'The council record changed after this was queued. Review the change and resubmit, or discard it.';
      log(next, ctx, { entityType: 'queue', entityId: item.id, action: 'conflict', from: 'waiting', to: 'conflict', viaId: ctx.actor.id });
      continue;
    }

    record.intake = item.fields;
    record.application.version += 1;
    record.application.state = 'received';
    record.application.reason = null;
    record.lastConfirmed = ctx.at;
    item.status = 'delivered';
    item.deliveredRecordId = record.id;
    item.lastError = null;
    log(next, ctx, { entityType: 'record', entityId: record.id, action: 'resubmitted', from: 'changes_requested', to: 'received', viaId: ctx.actor.id });
    log(next, ctx, { entityType: 'queue', entityId: item.id, action: 'delivered', from: 'waiting', to: 'delivered', viaId: ctx.actor.id });
  }

  return { ok: true, data: next, failedItemId };
}

/** Coordinator resolves a conflicting item: resubmit against the current version, or discard the queued change. */
export function resolveConflict(
  data: DomainData,
  ctx: Ctx,
  input: { itemId: string; action: 'resubmit' | 'discard' },
): Result {
  if (!can(ctx.actor, 'sync_queue', { siteId: ctx.actor.siteId })) {
    return fail('forbidden', 'Only a coordinator device can resolve a queued item.');
  }
  const item = data.queue.find((i) => i.id === input.itemId);
  if (!item || item.coordinatorId !== ctx.actor.id) return fail('not_found', 'That queued item could not be found.');
  if (item.status !== 'conflict') return fail('not_conflict', 'Only items that need attention can be resolved this way.');

  const next = cloneData(data);
  const target = next.queue.find((i) => i.id === input.itemId)!;
  if (input.action === 'discard') {
    next.queue = next.queue.filter((i) => i.id !== input.itemId);
    log(next, ctx, { entityType: 'queue', entityId: input.itemId, action: 'discarded', from: 'conflict', to: null, viaId: ctx.actor.id });
    return { ok: true, data: next, id: input.itemId };
  }

  const record = target.recordId ? findRecord(next, target.recordId) : null;
  if (!record || record.application.state !== 'changes_requested') {
    return fail('not_correctable', 'This record is no longer waiting for changes. Discard the queued item instead.');
  }
  target.baseVersion = record.application.version;
  target.status = 'waiting';
  target.lastError = null;
  log(next, ctx, { entityType: 'queue', entityId: target.id, action: 'conflict_resubmitted', from: 'conflict', to: 'waiting', viaId: ctx.actor.id });
  return { ok: true, data: next, id: target.id };
}
