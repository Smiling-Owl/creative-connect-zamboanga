import { can } from './policy';
import { cloneData, deadlinePassed, fail, findOpportunity, findRecord, findReferral, log, nextId, reasonMissing, requireReason } from './core';
import type { Ctx, DomainData, OutcomeState, Referral, ReferralState, Result } from './types';

// Referral: one record per creative and opportunity. Interest and invitation never reserve a place.
// Canonical order: council offers → creative accepts → council confirms → outcome recorded.

/** States that hold a place once the council confirms it. */
export const CAPACITY_STATES: ReadonlyArray<ReferralState> = ['confirmed', 'completed', 'did_not_attend', 'awaiting_follow_up'];
export const OUTCOME_STATES: ReadonlyArray<OutcomeState> = ['completed', 'did_not_attend', 'awaiting_follow_up'];
/** States a cancelled opportunity moves to `cancelled`. Recorded outcomes are never changed by a cancellation. */
export const ACTIVE_BEFORE_OUTCOME: ReadonlyArray<ReferralState> = ['interest', 'under_review', 'offered', 'accepted', 'confirmed'];

export function capacityUsed(data: DomainData, opportunityId: string): number {
  return data.referrals.filter((r) => r.opportunityId === opportunityId && CAPACITY_STATES.includes(r.state)).length;
}

function findPair(data: DomainData, recordId: string, opportunityId: string): Referral | null {
  return data.referrals.find((r) => r.recordId === recordId && r.opportunityId === opportunityId) ?? null;
}

function setState(
  d: DomainData,
  ctx: Ctx,
  referral: Referral,
  to: ReferralState,
  reason: string | null = null,
  viaId: string | null = null,
): void {
  const from = referral.state;
  referral.state = to;
  referral.updatedAt = ctx.at;
  if (reason !== null) referral.reason = reason;
  log(d, ctx, { entityType: 'referral', entityId: referral.id, action: 'state_changed', from, to, reason, viaId });
}

/** Creative expresses interest in a published opportunity. Repeating it returns the existing referral. */
export function expressInterest(data: DomainData, ctx: Ctx, input: { recordId: string; opportunityId: string }): Result {
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (!can(ctx.actor, 'express_interest', { personId: record.personId })) {
    return fail('forbidden', 'Only the creator can express interest.');
  }
  if (record.application.state !== 'verified') {
    return fail('not_verified', 'You can express interest after the council verifies your record.');
  }
  const opportunity = findOpportunity(data, input.opportunityId);
  if (!opportunity) return fail('not_found', 'That opportunity could not be found.');
  const existing = findPair(data, record.id, opportunity.id);
  if (existing) return { ok: true, data, id: existing.id };
  if (opportunity.state !== 'published') return fail('opportunity_closed', 'This opportunity is no longer open to interest.');
  if (deadlinePassed(opportunity.deadline, ctx.at)) return fail('deadline_passed', `The deadline was ${opportunity.deadline}.`);
  if (capacityUsed(data, opportunity.id) >= opportunity.capacity) {
    return fail('full', 'This opportunity is full. No new interest can be recorded for it.');
  }

  const next = cloneData(data);
  const id = nextId(next, 'ref');
  next.referrals.push({
    id,
    recordId: record.id,
    opportunityId: opportunity.id,
    origin: 'interest',
    state: 'interest',
    reason: null,
    via: null,
    instructions: null,
    updatedAt: ctx.at,
  });
  log(next, ctx, { entityType: 'referral', entityId: id, action: 'created', to: 'interest' });
  return { ok: true, data: next, id };
}

/**
 * Council invites a verified creative. An existing interest moves to offered; a new invitation starts at offered.
 * Any other existing referral for the pair blocks a new invitation.
 */
export function inviteCreative(data: DomainData, ctx: Ctx, input: { recordId: string; opportunityId: string }): Result {
  if (!can(ctx.actor, 'manage_referral')) return fail('forbidden', 'Only council staff can invite a creative.');
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (record.application.state !== 'verified') return fail('not_verified', 'Only verified records can be invited.');
  const opportunity = findOpportunity(data, input.opportunityId);
  if (!opportunity) return fail('not_found', 'That opportunity could not be found.');
  if (opportunity.state !== 'published') return fail('opportunity_closed', 'Only published opportunities can take invitations.');
  if (deadlinePassed(opportunity.deadline, ctx.at)) return fail('deadline_passed', `The deadline was ${opportunity.deadline}.`);
  if (capacityUsed(data, opportunity.id) >= opportunity.capacity) {
    return fail('full', 'This opportunity is full. Free a place before inviting another creative.');
  }

  const existing = findPair(data, record.id, opportunity.id);
  if (existing && (existing.state === 'interest' || existing.state === 'under_review')) {
    const next = cloneData(data);
    const target = findReferral(next, existing.id)!;
    setState(next, ctx, target, 'offered');
    return { ok: true, data: next, id: target.id };
  }
  if (existing) return fail('already_referred', 'This creative already has a referral for this opportunity.');

  const next = cloneData(data);
  const id = nextId(next, 'ref');
  next.referrals.push({
    id,
    recordId: record.id,
    opportunityId: opportunity.id,
    origin: 'invitation',
    state: 'offered',
    reason: null,
    via: null,
    instructions: null,
    updatedAt: ctx.at,
  });
  log(next, ctx, { entityType: 'referral', entityId: id, action: 'created', to: 'offered' });
  return { ok: true, data: next, id };
}

function transitionFromCouncil(
  data: DomainData,
  ctx: Ctx,
  referralId: string,
  allowedFrom: ReferralState[],
  to: ReferralState,
  options: { reason?: string | null; checkCapacity?: boolean; requirePublished?: boolean; checkDeadline?: boolean } = {},
): Result {
  if (!can(ctx.actor, 'manage_referral')) return fail('forbidden', 'Only council staff can change referrals.');
  const referral = findReferral(data, referralId);
  if (!referral) return fail('not_found', 'That referral could not be found.');
  if (!allowedFrom.includes(referral.state)) {
    return fail('invalid_state', 'This step is not available for this referral right now.');
  }
  const opportunity = findOpportunity(data, referral.opportunityId)!;
  if ((options.requirePublished ?? true) && opportunity.state !== 'published') {
    return fail('opportunity_closed', 'This opportunity is closed or cancelled, so new offers, selections, and confirmations are not possible.');
  }
  if (options.checkDeadline && deadlinePassed(opportunity.deadline, ctx.at)) {
    return fail('deadline_passed', `The deadline was ${opportunity.deadline}.`);
  }
  if (options.checkCapacity && capacityUsed(data, opportunity.id) >= opportunity.capacity) {
    return fail('full', 'All places are confirmed for this opportunity. Free a place or increase capacity first.');
  }
  const next = cloneData(data);
  setState(next, ctx, findReferral(next, referralId)!, to, options.reason ?? null);
  return { ok: true, data: next, id: referralId };
}

export function startReferralReview(data: DomainData, ctx: Ctx, referralId: string): Result {
  return transitionFromCouncil(data, ctx, referralId, ['interest'], 'under_review', { checkDeadline: true });
}

export function offerReferral(data: DomainData, ctx: Ctx, referralId: string): Result {
  return transitionFromCouncil(data, ctx, referralId, ['interest', 'under_review'], 'offered', { checkCapacity: true, checkDeadline: true });
}

export function markNotSelected(data: DomainData, ctx: Ctx, input: { referralId: string; reason: string }): Result {
  const reason = requireReason(input.reason);
  if (!reason) return reasonMissing('record this decision');
  return transitionFromCouncil(data, ctx, input.referralId, ['interest', 'under_review'], 'not_selected', { reason, requirePublished: false });
}

/** Creative, or a coordinator relaying the creative's answer, accepts or declines an offer. The relay is recorded. */
export function respondToOffer(
  data: DomainData,
  ctx: Ctx,
  input: { referralId: string; response: 'accept' | 'decline'; reason?: string },
): Result {
  const referral = findReferral(data, input.referralId);
  if (!referral) return fail('not_found', 'That referral could not be found.');
  const record = findRecord(data, referral.recordId)!;
  const relayed = ctx.actor.role === 'coordinator';
  const allowed = relayed
    ? can(ctx.actor, 'relay_response', { siteId: record.siteId })
    : can(ctx.actor, 'respond_referral', { personId: record.personId });
  if (!allowed) return fail('forbidden', 'Only the creator, or the coordinator for this record, can respond to this offer.');
  if (referral.state !== 'offered') return fail('invalid_state', 'There is no open offer to respond to.');
  const opportunity = findOpportunity(data, referral.opportunityId)!;
  if (opportunity.state !== 'published') return fail('opportunity_closed', 'This opportunity is no longer open for responses.');
  if (deadlinePassed(opportunity.deadline, ctx.at)) {
    return fail('deadline_passed', `The response deadline was ${opportunity.deadline}.`);
  }

  const next = cloneData(data);
  const target = findReferral(next, referral.id)!;
  target.via = relayed ? ctx.actor.id : null;
  const reason = input.response === 'decline' ? requireReason(input.reason) : null;
  setState(next, ctx, target, input.response === 'accept' ? 'accepted' : 'declined', reason, relayed ? ctx.actor.id : null);
  if (relayed) {
    log(next, ctx, { entityType: 'referral', entityId: target.id, action: 'offer_response_relayed', from: 'offered', to: target.state, reason, viaId: ctx.actor.id });
  }
  return { ok: true, data: next, id: target.id };
}

/** Council confirms a place after the creative accepted. Blocked when places are full. */
export function confirmPlace(data: DomainData, ctx: Ctx, input: { referralId: string; instructions?: string }): Result {
  const result = transitionFromCouncil(data, ctx, input.referralId, ['accepted'], 'confirmed', { checkCapacity: true });
  if (!result.ok) return result;
  const referral = findReferral(result.data, input.referralId)!;
  const instructions = input.instructions?.trim() ?? '';
  if (instructions) referral.instructions = instructions;
  return result;
}

/** Creative, or a coordinator relaying, withdraws after accepting or being confirmed. Frees a place. */
export function withdrawReferral(data: DomainData, ctx: Ctx, input: { referralId: string; reason: string }): Result {
  const referral = findReferral(data, input.referralId);
  if (!referral) return fail('not_found', 'That referral could not be found.');
  const record = findRecord(data, referral.recordId)!;
  const relayed = ctx.actor.role === 'coordinator';
  const allowed = relayed
    ? can(ctx.actor, 'relay_response', { siteId: record.siteId })
    : can(ctx.actor, 'withdraw_referral', { personId: record.personId });
  if (!allowed) return fail('forbidden', 'Only the creator, or the coordinator for this record, can withdraw.');
  if (!['accepted', 'confirmed'].includes(referral.state)) {
    return fail('invalid_state', 'Only an accepted or confirmed place can be withdrawn.');
  }
  const reason = requireReason(input.reason);
  if (!reason) return reasonMissing('withdraw');
  const next = cloneData(data);
  const target = findReferral(next, referral.id)!;
  target.via = relayed ? ctx.actor.id : null;
  setState(next, ctx, target, 'cancelled', reason, relayed ? ctx.actor.id : null);
  return { ok: true, data: next, id: target.id };
}

/** Council records what happened. Outcomes mean support was received, never paid work or income. */
export function recordOutcome(data: DomainData, ctx: Ctx, input: { referralId: string; outcome: OutcomeState }): Result {
  return transitionFromCouncil(data, ctx, input.referralId, ['confirmed', 'awaiting_follow_up'], input.outcome, { requirePublished: false });
}

/** Council records practical instructions for a confirmed place. The state does not change. */
export function recordInstructions(data: DomainData, ctx: Ctx, input: { referralId: string; instructions: string }): Result {
  if (!can(ctx.actor, 'manage_referral')) return fail('forbidden', 'Only council staff can record instructions.');
  const referral = findReferral(data, input.referralId);
  if (!referral) return fail('not_found', 'That referral could not be found.');
  if (referral.state !== 'confirmed') return fail('invalid_state', 'Instructions can be recorded once the place is confirmed.');
  const text = requireReason(input.instructions);
  if (!text) return fail('instructions_required', 'Add practical instructions, such as where to arrive and what to bring.');
  const next = cloneData(data);
  const target = findReferral(next, input.referralId)!;
  target.instructions = text;
  target.updatedAt = ctx.at;
  log(next, ctx, { entityType: 'referral', entityId: target.id, action: 'instructions_recorded', from: 'confirmed', to: 'confirmed' });
  return { ok: true, data: next, id: target.id };
}
