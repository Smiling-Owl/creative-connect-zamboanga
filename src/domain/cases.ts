import { can } from './policy';
import { cloneData, fail, findRecord, findReferral, log, nextId, reasonMissing, requireReason } from './core';
import { OUTCOME_STATES } from './referral';
import type { Case, CaseKind, Ctx, DomainData, OutcomeState, Result } from './types';

// Correction, human-review, and withdrawal requests. Requests never delete records.
// Council decides; the outcome and reason stay visible to the creative.

export function openCase(
  data: DomainData,
  ctx: Ctx,
  input: { kind: CaseKind; recordId: string; referralId?: string | null; reason: string; personAgreed?: boolean },
): Result {
  const reason = requireReason(input.reason);
  if (!reason) return reasonMissing('send this request');
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');

  if (ctx.actor.role === 'coordinator' && (input.kind === 'profile_correction' || input.kind === 'withdrawal' || input.kind === 'outcome_correction')) {
    if (!ctx.settings.online) return fail('offline', 'This request needs a connection. It has not been sent to the council.');
    if (input.personAgreed !== true) return fail('consent_required', 'Confirm that the person agreed to send this request.');
    if (!can(ctx.actor, 'request_case', { siteId: record.siteId })) return fail('forbidden', 'Only the coordinator for this record’s site can send this request.');
  } else if (input.kind === 'human_review') {
    if (!can(ctx.actor, 'request_case', { personId: record.personId, siteId: record.siteId })) {
      return fail('forbidden', 'Only the creator, or the coordinator for this record, can request a human review.');
    }
    if (record.application.state !== 'declined') {
      return fail('invalid_state', 'A human review can be requested only after a decline.');
    }
  } else if (!can(ctx.actor, 'request_case', { personId: record.personId })) {
    return fail('forbidden', 'Only the creator can send this request.');
  }

  let referralId: string | null = null;
  if (input.kind === 'outcome_correction') {
    const referral = input.referralId ? findReferral(data, input.referralId) : null;
    if (!referral || referral.recordId !== record.id) return fail('not_found', 'That referral could not be found.');
    if (!OUTCOME_STATES.includes(referral.state as OutcomeState)) {
      return fail('no_outcome', 'An outcome can be questioned only after it has been recorded.');
    }
    referralId = referral.id;
  }

  const duplicate = data.cases.some(
    (c) =>
      c.state === 'open' &&
      c.kind === input.kind &&
      c.recordId === record.id &&
      (input.kind !== 'outcome_correction' || c.referralId === referralId),
  );
  if (duplicate) return fail('already_open', 'A request like this is already waiting for the council.');

  const next = cloneData(data);
  if (input.kind === 'withdrawal') {
    const targetRecord = findRecord(next, record.id)!;
    targetRecord.optedIn = false;
    log(next, ctx, { entityType: 'record', entityId: record.id, action: 'withdrawal_requested', from: 'listing_on', to: 'listing_off', reason, viaId: ctx.actor.role === 'coordinator' ? ctx.actor.id : null });
  }
  const id = nextId(next, 'case');
  const created: Case = {
    id,
    kind: input.kind,
    recordId: record.id,
    referralId,
    state: 'open',
    reason,
    resolution: null,
    openedBy: ctx.actor.id,
  };
  next.cases.push(created);
  log(next, ctx, {
    entityType: 'case',
    entityId: id,
    action: 'opened',
    to: input.kind,
    reason,
    viaId: ctx.actor.role === 'coordinator' ? ctx.actor.id : null,
  });
  return { ok: true, data: next, id };
}

export function resolveCase(
  data: DomainData,
  ctx: Ctx,
  input: { caseId: string; resolution: string; reopen?: boolean; newOutcome?: OutcomeState },
): Result {
  if (!can(ctx.actor, 'council_decide')) return fail('forbidden', 'Only council staff can resolve a case.');
  const resolution = requireReason(input.resolution);
  if (!resolution) return reasonMissing('resolve this case');
  const existing = data.cases.find((c) => c.id === input.caseId);
  if (!existing || existing.state !== 'open') return fail('not_open', 'That case is not open.');
  if (existing.kind === 'outcome_correction') {
    if (input.newOutcome !== undefined && !OUTCOME_STATES.includes(input.newOutcome)) {
      return fail('invalid_outcome', 'Choose a listed support outcome or keep the current outcome.');
    }
    const referral = existing.referralId ? findReferral(data, existing.referralId) : null;
    if (!referral || referral.recordId !== existing.recordId || !OUTCOME_STATES.includes(referral.state as OutcomeState)) {
      return fail('no_outcome', 'This outcome can no longer be changed because no recorded outcome is available.');
    }
  } else if (input.newOutcome !== undefined) {
    return fail('invalid_case_action', 'An outcome change can only resolve an outcome-correction request.');
  }

  const next = cloneData(data);
  const target = next.cases.find((c) => c.id === input.caseId)!;
  const record = findRecord(next, target.recordId)!;

  switch (target.kind) {
    case 'human_review': {
      if (input.reopen) {
        record.application.state = 'under_review';
        record.application.reason = null;
        log(next, ctx, { entityType: 'record', entityId: record.id, action: 'review_reopened', from: 'declined', to: 'under_review', reason: resolution });
      } else {
        log(next, ctx, { entityType: 'record', entityId: record.id, action: 'decline_upheld', from: 'declined', to: 'declined', reason: resolution });
      }
      break;
    }
    case 'outcome_correction': {
      const referral = next.referrals.find((r) => r.id === target.referralId);
      if (input.newOutcome && referral) {
        const from = referral.state;
        referral.state = input.newOutcome;
        referral.updatedAt = ctx.at;
        log(next, ctx, { entityType: 'referral', entityId: referral.id, action: 'outcome_corrected', from, to: input.newOutcome, reason: resolution });
      } else {
        log(next, ctx, { entityType: 'referral', entityId: target.referralId ?? '', action: 'outcome_upheld', reason: resolution });
      }
      break;
    }
    case 'withdrawal': {
      record.optedIn = false;
      log(next, ctx, { entityType: 'record', entityId: record.id, action: 'withdrawal_disposition_recorded', from: 'listing_off', to: 'listing_off', reason: resolution });
      break;
    }
    case 'profile_correction': {
      log(next, ctx, { entityType: 'record', entityId: record.id, action: 'correction_resolved', reason: resolution });
      break;
    }
  }

  target.state = 'resolved';
  target.resolution = resolution;
  log(next, ctx, { entityType: 'case', entityId: target.id, action: 'resolved', from: 'open', to: 'resolved', reason: resolution });
  return { ok: true, data: next, id: target.id };
}
