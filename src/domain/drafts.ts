import { can } from './policy';
import { cloneData, fail, findRecord, nextId } from './core';
import type { Ctx, DomainData, IntakeFields, IntakeSource, Result } from './types';

// Drafts autosave while someone fills in intake. Incomplete drafts are allowed; validation runs on send.
// The intake source is derived from the acting user, never trusted from the caller.

type FollowUp = IntakeFields['followUp'];

/** Source the acting user is allowed to record. A coordinator's intake is always attributed to the coordinator and site. */
function sourceFor(ctx: Ctx, requested: IntakeSource): IntakeSource {
  if (ctx.actor.role === 'coordinator') {
    return {
      mode: 'assisted',
      siteId: ctx.actor.siteId ?? null,
      coordinatorId: ctx.actor.id,
      capturedOn: requested.capturedOn,
    };
  }
  return { mode: 'self_service', siteId: null, coordinatorId: null, capturedOn: requested.capturedOn };
}

/**
 * The follow-up arrangement a creative may store. A coordinator arrangement already on the record stays until
 * a coordinator changes it, and a creative cannot choose one. Returns null when the submitted choice is not allowed.
 */
export function creativeFollowUp(current: FollowUp | null, submitted: FollowUp): FollowUp | null {
  if (current?.kind === 'coordinator_mediated') return current;
  if (submitted.kind === 'coordinator_mediated') return null;
  return submitted;
}

/** A coordinator-mediated follow-up always names the coordinator who is saving the intake. */
function followUpFor(ctx: Ctx, submitted: FollowUp, current: FollowUp | null): FollowUp | null {
  if (ctx.actor.role === 'coordinator') {
    return submitted.kind === 'coordinator_mediated' ? { kind: 'coordinator_mediated', coordinatorId: ctx.actor.id } : submitted;
  }
  return creativeFollowUp(current, submitted);
}

/**
 * Creates or updates a draft owned by the acting user. A draft with a recordId is a correction for that record.
 * Drafts are preserved across navigation and persona switches; only sending or discarding removes them.
 */
export function saveDraft(
  data: DomainData,
  ctx: Ctx,
  input: { draftId: string | null; recordId: string | null; source: IntakeSource; fields: IntakeFields },
): Result {
  if (ctx.actor.role !== 'creative' && ctx.actor.role !== 'coordinator') {
    return fail('forbidden', 'Only creatives and coordinators can save intake drafts.');
  }

  const targetRecord = input.recordId ? findRecord(data, input.recordId) : null;
  const followUp = followUpFor(ctx, input.fields.followUp, targetRecord?.intake.followUp ?? null);
  if (!followUp) {
    return fail('invalid', 'Ask a coordinator to set up coordinator-mediated follow-up. You can choose your own channel here.');
  }
  const fields: IntakeFields = { ...input.fields, followUp };
  const source = sourceFor(ctx, input.source);

  const hasOwnRecord = data.records.some((r) => r.personId === ctx.actor.id);
  if (ctx.actor.role === 'creative' && !input.recordId && hasOwnRecord) {
    return fail('already_has_record', 'You already have a record with the council. Edit your profile or respond to the requested changes instead.');
  }

  if (input.recordId) {
    if (!targetRecord) return fail('not_found', 'The record for this correction could not be found.');
    const allowed =
      ctx.actor.role === 'creative'
        ? can(ctx.actor, 'edit_own_record', { personId: targetRecord.personId })
        : can(ctx.actor, 'assist_record', { siteId: targetRecord.siteId });
    if (!allowed) return fail('forbidden', 'This record is outside your permissions.');
  }

  const next = cloneData(data);
  const existing = input.draftId ? next.drafts.find((d) => d.id === input.draftId) : undefined;
  if (existing) {
    if (existing.ownerId !== ctx.actor.id) return fail('forbidden', 'Only the person who started this draft can change it.');
    existing.fields = fields;
    existing.source = source;
    existing.recordId = input.recordId;
    existing.updatedAt = ctx.at;
    return { ok: true, data: next, id: existing.id };
  }

  const id = nextId(next, 'draft');
  next.drafts.push({
    id,
    ownerId: ctx.actor.id,
    recordId: input.recordId,
    source,
    fields,
    updatedAt: ctx.at,
  });
  return { ok: true, data: next, id };
}
