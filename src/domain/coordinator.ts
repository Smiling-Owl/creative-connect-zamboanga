import { can } from './policy';
import { cloneData, fail, findRecord, log, requireReason, reasonMissing } from './core';
import type { Ctx, DomainData, Result } from './types';

/** Adds an audited follow-up entry to an assigned record without creating another entity or private channel. */
export function recordFollowupNote(data: DomainData, ctx: Ctx, input: { recordId: string; note: string }): Result {
  const note = requireReason(input.note);
  if (!note) return reasonMissing('record this follow-up note');
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (!can(ctx.actor, 'record_followup_note', { siteId: record.siteId })) {
    return fail('forbidden', 'Only the coordinator for this record’s site can record a follow-up note.');
  }
  const next = cloneData(data);
  log(next, ctx, {
    entityType: 'record',
    entityId: record.id,
    action: 'followup_note_recorded',
    reason: note,
    viaId: ctx.actor.id,
  });
  return { ok: true, data: next, id: record.id };
}
