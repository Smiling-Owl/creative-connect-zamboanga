import { can } from './policy';
import { cloneData, fail, findRecord, log, requireReason, reasonMissing } from './core';
import { applyReceivedFields, intakeValidationErrors } from './application';
import type { Ctx, DomainData, Result } from './types';

/** A coordinator submits a verified-record update only after the person agrees in the moment. */
export function assistProfileUpdate(
  data: DomainData,
  ctx: Ctx,
  input: { recordId: string; fields: import('./types').IntakeFields; personAgreed: boolean },
): Result {
  if (ctx.actor.role !== 'coordinator') return fail('forbidden', 'Only the assigned coordinator can assist with this profile update.');
  if (!ctx.settings.online) return fail('offline', 'Profile updates need a connection. Your assisted changes have not been saved.');
  if (input.personAgreed !== true) return fail('consent_required', 'Confirm that the person agreed to this exact profile update.');
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (!can(ctx.actor, 'assist_record', { siteId: record.siteId })) return fail('forbidden', 'Only the coordinator for this record’s site can assist with its profile update.');
  if (record.application.duplicate?.status === 'linked') return fail('linked_alias', 'Linked records keep separate histories and cannot receive new profile updates.');
  if (record.application.state !== 'verified') return fail('invalid_state', 'Assisted profile maintenance is available only for verified records.');
  const fields = input.fields.followUp.kind === 'coordinator_mediated'
    ? { ...input.fields, followUp: { kind: 'coordinator_mediated' as const, coordinatorId: ctx.actor.id } }
    : input.fields;
  const validation = intakeValidationErrors(fields);
  if (validation.length) return fail('invalid', validation[0]!.message);
  const next = cloneData(data);
  applyReceivedFields(next, ctx, record.id, fields, ctx.actor.id);
  return { ok: true, data: next, id: record.id };
}

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
