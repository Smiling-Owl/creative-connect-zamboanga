import { can } from './policy';
import { cloneData, fail, findOpportunity, log, nextId, reasonMissing, requireReason } from './core';
import { ACTIVE_BEFORE_OUTCOME, capacityUsed } from './referral';
import type { Ctx, DomainData, Opportunity, OpportunityType, Result } from './types';

// Opportunity lifecycle: draft → published → closed; published → cancelled (cascades to referrals).

export interface OpportunityInput {
  title: string;
  type: OpportunityType;
  provider: string;
  description: string;
  eligibility: string;
  costLabel: string;
  capacity: number;
  dateLabel: string;
  deadline: string;
  locationMode: string;
  ownerId: string;
  nextStep: string;
  contactRoute: string;
}

/** Fields whose change after publishing requires confirmed creatives to confirm again. */
const MATERIAL_FIELDS = ['dateLabel', 'locationMode', 'costLabel'] as const;

export function validateOpportunity(input: OpportunityInput): string | null {
  if (input.title.trim() === '') return 'Add a title.';
  if (input.provider.trim() === '') return 'Name the provider. Use a fictional name in this prototype.';
  if (input.description.trim() === '') return 'Describe what participants can expect.';
  if (input.costLabel.trim() === '') return 'Describe the cost or say if there is no fee.';
  if (input.ownerId.trim() === '') return 'Name the responsible council owner.';
  if (!Number.isInteger(input.capacity) || input.capacity < 1) return 'Capacity must be a whole number of at least 1.';
  const deadline = new Date(`${input.deadline}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deadline) || Number.isNaN(deadline.getTime()) || deadline.toISOString().slice(0, 10) !== input.deadline) {
    return 'Set a real calendar deadline in the form YYYY-MM-DD.';
  }
  if (input.dateLabel.trim() === '') return 'Describe the date or schedule.';
  if (input.locationMode.trim() === '') return 'Describe the location or delivery mode.';
  if (input.eligibility.trim() === '') return 'Describe who is eligible.';
  if (input.nextStep.trim() === '') return 'Describe the next step for participants.';
  if (input.contactRoute.trim() === '') return 'Add the council contact route.';
  return null;
}

export function createOpportunity(data: DomainData, ctx: Ctx, input: OpportunityInput): Result {
  if (!can(ctx.actor, 'manage_opportunity')) return fail('forbidden', 'Only council staff can manage opportunities.');
  const problem = validateOpportunity(input);
  if (problem) return fail('invalid', problem);
  const next = cloneData(data);
  const id = nextId(next, 'opp');
  const created: Opportunity = { ...input, id, state: 'draft', cancelReason: null };
  next.opportunities.push(created);
  log(next, ctx, { entityType: 'opportunity', entityId: id, action: 'created', to: 'draft' });
  return { ok: true, data: next, id };
}

export function updateOpportunity(
  data: DomainData,
  ctx: Ctx,
  input: { id: string; fields: OpportunityInput },
): Result {
  if (!can(ctx.actor, 'manage_opportunity')) return fail('forbidden', 'Only council staff can manage opportunities.');
  const current = findOpportunity(data, input.id);
  if (!current) return fail('not_found', 'That opportunity could not be found.');
  if (current.state === 'closed' || current.state === 'cancelled') {
    return fail('read_only', 'Closed or cancelled opportunities cannot be edited.');
  }
  const problem = validateOpportunity(input.fields);
  if (problem) return fail('invalid', problem);
  const used = capacityUsed(data, current.id);
  if (input.fields.capacity < used) {
    return fail('capacity_below_used', `${used} places are already in use. Capacity cannot go below ${used}.`);
  }

  const next = cloneData(data);
  const target = findOpportunity(next, input.id)!;
  const materialChange = current.state === 'published' && MATERIAL_FIELDS.some((f) => current[f] !== input.fields[f]);
  Object.assign(target, input.fields, { id: target.id, state: target.state, cancelReason: target.cancelReason });
  log(next, ctx, { entityType: 'opportunity', entityId: target.id, action: 'edited', from: current.state, to: current.state });

  if (materialChange) {
    for (const referral of next.referrals) {
      if (referral.opportunityId === target.id && referral.state === 'confirmed') {
        referral.state = 'accepted';
        referral.updatedAt = ctx.at;
        referral.instructions = null;
        log(next, ctx, {
          entityType: 'referral',
          entityId: referral.id,
          action: 'reconfirmation_required',
          from: 'confirmed',
          to: 'accepted',
          reason: 'Opportunity details changed. The council must confirm the place again.',
        });
      }
    }
  }
  return { ok: true, data: next, id: target.id };
}

export function publishOpportunity(data: DomainData, ctx: Ctx, input: { id: string }): Result {
  if (!can(ctx.actor, 'manage_opportunity')) return fail('forbidden', 'Only council staff can publish opportunities.');
  const current = findOpportunity(data, input.id);
  if (!current) return fail('not_found', 'That opportunity could not be found.');
  if (current.state !== 'draft') return fail('invalid_state', 'Only draft opportunities can be published.');
  const problem = validateOpportunity(current);
  if (problem) return fail('invalid', problem);
  const next = cloneData(data);
  const target = findOpportunity(next, input.id)!;
  target.state = 'published';
  log(next, ctx, { entityType: 'opportunity', entityId: target.id, action: 'published', from: 'draft', to: 'published' });
  return { ok: true, data: next, id: target.id };
}

export function closeOpportunity(data: DomainData, ctx: Ctx, input: { id: string }): Result {
  if (!can(ctx.actor, 'manage_opportunity')) return fail('forbidden', 'Only council staff can close opportunities.');
  const current = findOpportunity(data, input.id);
  if (!current) return fail('not_found', 'That opportunity could not be found.');
  if (current.state !== 'published') return fail('invalid_state', 'Only published opportunities can be closed.');
  const next = cloneData(data);
  const target = findOpportunity(next, input.id)!;
  target.state = 'closed';
  log(next, ctx, { entityType: 'opportunity', entityId: target.id, action: 'closed', from: 'published', to: 'closed' });
  return { ok: true, data: next, id: target.id };
}

/** Cancels a published opportunity. Active referrals become cancelled with the reason. Outcomes stay as recorded. */
export function cancelOpportunity(data: DomainData, ctx: Ctx, input: { id: string; reason: string }): Result {
  if (!can(ctx.actor, 'manage_opportunity')) return fail('forbidden', 'Only council staff can cancel opportunities.');
  const reason = requireReason(input.reason);
  if (!reason) return reasonMissing('cancel this opportunity');
  const current = findOpportunity(data, input.id);
  if (!current) return fail('not_found', 'That opportunity could not be found.');
  if (current.state !== 'published') return fail('invalid_state', 'Only published opportunities can be cancelled.');

  const next = cloneData(data);
  const target = findOpportunity(next, input.id)!;
  target.state = 'cancelled';
  target.cancelReason = reason;
  log(next, ctx, { entityType: 'opportunity', entityId: target.id, action: 'cancelled', from: 'published', to: 'cancelled', reason });

  for (const referral of next.referrals) {
    if (referral.opportunityId === target.id && ACTIVE_BEFORE_OUTCOME.includes(referral.state)) {
      const from = referral.state;
      referral.state = 'cancelled';
      referral.reason = `Opportunity cancelled: ${reason}`;
      referral.updatedAt = ctx.at;
      log(next, ctx, { entityType: 'referral', entityId: referral.id, action: 'cancelled_by_opportunity', from, to: 'cancelled', reason });
    }
  }
  return { ok: true, data: next, id: target.id };
}
