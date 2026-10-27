import { can } from './policy';
import { cloneData, fail, findRecord, log } from './core';
import type { CreativeRecord, Ctx, DomainData, IntakeFields, Result } from './types';

// Public listing rules. Listing requires verification AND creator opt-in AND council approval
// of the exact public content. Verification alone never publishes (APPROVED business rule).

/** Fingerprint of the fields that appear publicly. Any change to them hides the listing until re-approved. */
export function publicFingerprint(intake: IntakeFields): string {
  return JSON.stringify({
    displayName: intake.displayName,
    domain: intake.domain,
    practice: intake.practice,
    skills: [...intake.skills],
    area: intake.area,
    evidence: intake.evidence.filter((e) => e.publicApproved).map((e) => ({ kind: e.kind, text: e.text })),
  });
}

export type ListingStatus = 'listed' | 'pending_review' | 'waiting_verification' | 'not_listed';

export function listingStatus(record: CreativeRecord): ListingStatus {
  if (!record.optedIn) return 'not_listed';
  if (record.application.state !== 'verified') return 'waiting_verification';
  const approved =
    record.publicApprovedFingerprint !== null && record.publicApprovedFingerprint === publicFingerprint(record.intake);
  return approved ? 'listed' : 'pending_review';
}

export function isListed(record: CreativeRecord): boolean {
  return listingStatus(record) === 'listed';
}

/** Creator turns public listing on or off. Turning it off removes the listing immediately and never affects support. */
export function setListing(data: DomainData, ctx: Ctx, input: { recordId: string; optedIn: boolean }): Result {
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (!can(ctx.actor, 'manage_visibility', { personId: record.personId })) {
    return fail('forbidden', 'Only the creator can change the public listing choice for this record.');
  }
  if (record.optedIn === input.optedIn) {
    return { ok: true, data, id: record.id };
  }
  const next = cloneData(data);
  const target = findRecord(next, input.recordId)!;
  const from = target.optedIn ? 'listing_on' : 'listing_off';
  target.optedIn = input.optedIn;
  log(next, ctx, {
    entityType: 'record',
    entityId: target.id,
    action: input.optedIn ? 'listing_chosen' : 'listing_withdrawn',
    from,
    to: input.optedIn ? 'listing_on' : 'listing_off',
  });
  return { ok: true, data: next, id: target.id };
}

/** Council approves the exact public content of a verified record. Clears a pending update flag. */
export function approvePublicContent(data: DomainData, ctx: Ctx, recordId: string): Result {
  if (!can(ctx.actor, 'council_decide')) return fail('forbidden', 'Only council staff can approve public content.');
  const record = findRecord(data, recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (record.application.state !== 'verified') {
    return fail('not_verified', 'Public content can be approved only after the record is verified.');
  }
  const next = cloneData(data);
  const target = findRecord(next, recordId)!;
  target.publicApprovedFingerprint = publicFingerprint(target.intake);
  const wasPending = target.application.updatePending;
  target.application.updatePending = false;
  target.application.updateReason = null;
  log(next, ctx, {
    entityType: 'record',
    entityId: target.id,
    action: 'public_content_approved',
    from: wasPending ? 'update_pending' : null,
    to: 'public_content_approved',
  });
  return { ok: true, data: next, id: target.id };
}
