import { listingStatus, isListed } from './visibility';
import { CAPACITY_STATES } from './referral';
import type { Actor, CreativeRecord, DomainData, OpportunityState, Referral, ReferralState } from './types';

// Derived reads. Counts are always computed from current state; nothing is cached or hardcoded.
// Council-side reads see every record, because a record exists only after the council receives it.
// Queued and draft items are excluded from council counts.

const OPPORTUNITY_STATES: OpportunityState[] = ['draft', 'published', 'closed', 'cancelled'];
const REFERRAL_STATES: ReferralState[] = [
  'interest',
  'under_review',
  'offered',
  'not_selected',
  'accepted',
  'declined',
  'confirmed',
  'completed',
  'did_not_attend',
  'awaiting_follow_up',
  'cancelled',
];

export interface CouncilCounts {
  received: number;
  underReview: number;
  changesRequested: number;
  declined: number;
  verified: number;
  verifiedNotListed: number;
  listed: number;
  openDuplicates: number;
  updatesPending: number;
  openCases: number;
  opportunities: Record<OpportunityState, number>;
  referrals: Record<ReferralState, number>;
}

export function councilCounts(data: DomainData): CouncilCounts {
  const records = data.records.filter((r) => r.application.duplicate?.status !== 'linked');
  const byState = (state: string) => records.filter((r) => r.application.state === state).length;
  const opportunities = Object.fromEntries(
    OPPORTUNITY_STATES.map((s) => [s, data.opportunities.filter((o) => o.state === s).length]),
  ) as Record<OpportunityState, number>;
  return {
    received: byState('received'),
    underReview: byState('under_review'),
    changesRequested: byState('changes_requested'),
    declined: byState('declined'),
    verified: byState('verified'),
    verifiedNotListed: records.filter((r) => r.application.state === 'verified' && !isListed(r)).length,
    listed: records.filter(isListed).length,
    openDuplicates: records.filter((r) => r.application.duplicate?.status === 'open').length,
    updatesPending: records.filter((r) => r.application.updatePending).length,
    openCases: data.cases.filter((c) => c.state === 'open').length,
    opportunities,
    referrals: Object.fromEntries(REFERRAL_STATES.map((state) => [state, data.referrals.filter((r) => r.state === state).length])) as Record<ReferralState, number>,
  };
}

export interface CapacityView {
  used: number;
  capacity: number;
  remaining: number;
}

export function opportunityCapacity(data: DomainData, opportunityId: string): CapacityView | null {
  const opportunity = data.opportunities.find((o) => o.id === opportunityId);
  if (!opportunity) return null;
  const used = data.referrals.filter((r) => r.opportunityId === opportunityId && CAPACITY_STATES.includes(r.state)).length;
  return { used, capacity: opportunity.capacity, remaining: Math.max(opportunity.capacity - used, 0) };
}

/** Verified, non-alias records for manual referral review. Private records are intentionally included. */
export function verifiedReferralCandidates(data: DomainData, opportunityId: string) {
  return data.records
    .filter((record) => record.application.state === 'verified' && record.application.duplicate?.status !== 'linked')
    .map((record) => ({
      record,
      referral: data.referrals.find((item) => item.recordId === record.id && item.opportunityId === opportunityId) ?? null,
    }))
    .sort((a, b) => a.record.intake.displayName.localeCompare(b.record.intake.displayName));
}

export function opportunityReferralRoster(data: DomainData, opportunityId: string): Record<ReferralState, Referral[]> {
  const referrals = data.referrals.filter((item) => item.opportunityId === opportunityId);
  return Object.fromEntries(REFERRAL_STATES.map((state) => [state, referrals.filter((item) => item.state === state)])) as Record<ReferralState, Referral[]>;
}

export function opportunityReferralCounts(data: DomainData, opportunityId: string): Record<ReferralState, number> {
  const roster = opportunityReferralRoster(data, opportunityId);
  return Object.fromEntries(REFERRAL_STATES.map((state) => [state, roster[state].length])) as Record<ReferralState, number>;
}

/** What a coordinator sees: assigned site records, their own drafts, and their own device queue. */
export function coordinatorWorkspace(data: DomainData, actor: Actor) {
  return {
    records: data.records.filter((r) => actor.siteId !== undefined && r.siteId === actor.siteId),
    drafts: data.drafts.filter((d) => d.ownerId === actor.id),
    queue: data.queue.filter((q) => q.coordinatorId === actor.id),
  };
}

/** What a creative sees: their own linked record, drafts, and referrals. */
export function creativeView(data: DomainData, personId: string) {
  const record: CreativeRecord | null = data.records.find((r) => r.personId === personId) ?? null;
  const drafts = data.drafts.filter((d) => d.ownerId === personId);
  const referrals: Referral[] = record ? data.referrals.filter((r) => r.recordId === record.id) : [];
  return { record, drafts, referrals, listing: record ? listingStatus(record) : null };
}

export type CouncilQueueTab = 'new' | 'resubmitted' | 'under_review' | 'cases' | 'records';

/** Council queue is derived only from received records; local drafts and queues are not records. */
export function councilQueue(data: DomainData, tab: CouncilQueueTab = 'new'): CreativeRecord[] {
  const received = data.records.filter((record) => record.application.duplicate?.status !== 'linked');
  const selected = tab === 'records' ? data.records
    : tab === 'new' ? received.filter((record) => record.application.state === 'received' && record.application.version === 1)
    : tab === 'resubmitted' ? received.filter((record) => record.application.state === 'received' && record.application.version > 1)
    : tab === 'under_review' ? received.filter((record) => record.application.state === 'under_review' || (record.application.state === 'verified' && record.application.updatePending))
    : received.filter((record) => data.cases.some((item) => item.recordId === record.id && item.state === 'open'));
  return [...selected].sort((a, b) => b.application.receivedAt.localeCompare(a.application.receivedAt));
}

export function councilCases(data: DomainData) {
  return [...data.cases].sort((a, b) => {
    const aTime = data.audit.find((event) => event.entityType === 'case' && event.entityId === a.id && event.action === 'opened')?.at ?? '';
    const bTime = data.audit.find((event) => event.entityType === 'case' && event.entityId === b.id && event.action === 'opened')?.at ?? '';
    return bTime.localeCompare(aTime);
  });
}

/** The single most useful next step for a creative. Plain words; never a promise of work or a place. */
export function creativeNextAction(view: ReturnType<typeof creativeView>): { title: string; detail: string; to: string } {
  const { record, drafts, referrals } = view;
  if (!record) {
    return drafts.length > 0
      ? { title: 'Finish your draft', detail: 'Your draft is saved on this device. Add what is missing, then send it when connected.', to: '/apply' }
      : { title: 'Start your registration', detail: 'A portfolio link or description is enough. A business permit is not required.', to: '/apply' };
  }
  switch (record.application.state) {
    case 'received':
    case 'under_review':
      return { title: 'Waiting for council review', detail: 'Nothing is needed from you right now. Your reference is shown on your home page.', to: '/me' };
    case 'changes_requested':
      return { title: 'Correct the information you were asked about', detail: record.application.reason ?? 'See the reason below.', to: '/apply' };
    case 'declined':
      return { title: 'Review the decision', detail: 'You can ask for a human review of this decision.', to: '/me' };
    case 'verified': {
      const offer = referrals.find((r) => r.state === 'offered');
      if (offer) return { title: 'Respond to a place offer', detail: 'Accept or decline. Declining does not affect your membership.', to: '/me/referrals' };
      if (record.application.updatePending) {
        return { title: 'Update waiting for council review', detail: 'Your membership is kept. Changed details are not public until the council approves them.', to: '/me/profile' };
      }
      return { title: 'Check your profile is current', detail: 'Last confirmed: ' + record.lastConfirmed.slice(0, 10) + '.', to: '/me/profile' };
    }
  }
}

export interface FunnelStage {
  label: string;
  count: number;
  base: number;
  baseLabel: string;
}

/** Synthetic funnel. Every stage states its base, so a rate is never shown without its denominator. */
export function councilFunnel(data: DomainData): FunnelStage[] {
  const records = data.records.filter((r) => r.application.duplicate?.status !== 'linked');
  const primaryRecordId = (recordId: string) => {
    const record = data.records.find((item) => item.id === recordId);
    return record?.application.duplicate?.status === 'linked' ? record.application.duplicate.candidateRecordId : recordId;
  };
  const referrals = data.referrals;
  const received = records.length;
  const verified = records.filter((r) => r.application.state === 'verified').length;
  const listed = records.filter(isListed).length;
  const referred = new Set(referrals.map((r) => primaryRecordId(r.recordId))).size;
  const confirmed = new Set(referrals.filter((r) => CAPACITY_STATES.includes(r.state)).map((r) => primaryRecordId(r.recordId))).size;
  const attended = new Set(referrals.filter((r) => r.state === 'completed').map((r) => primaryRecordId(r.recordId))).size;
  return [
    { label: 'Received by the council', count: received, base: received, baseLabel: 'received records' },
    { label: 'Verified', count: verified, base: received, baseLabel: 'received records' },
    { label: 'Listed in the directory', count: listed, base: verified, baseLabel: 'verified records' },
    { label: 'Referred to an opportunity', count: referred, base: verified, baseLabel: 'verified records' },
    { label: 'Place confirmed', count: confirmed, base: referred, baseLabel: 'referred records' },
    { label: 'Attended or completed', count: attended, base: confirmed, baseLabel: 'confirmed records' },
  ];
}

export interface InAppNotice {
  id: string;
  at: string;
  text: string;
}

const NOTICE_TEXT: Record<string, (reference: string, detail: string | null) => string> = {
  received: (ref) => `The council received your application (reference ${ref}).`,
  review_started: () => 'Council review has started.',
  changes_requested: (_ref, detail) => `Changes requested: ${detail ?? 'see the reason'}.`,
  verified: () => 'Your membership was verified. This is not a quality rating.',
  declined: (_ref, detail) => `Your application was declined: ${detail ?? 'see the reason'}.`,
  resubmitted: () => 'Your corrected information was received for review.',
  state_changed: () => 'A referral you have is updated. Check My referrals.',
  reconfirmation_required: () => 'Opportunity details changed. The council will confirm your place again.',
  cancelled_by_opportunity: () => 'An opportunity you were linked to was cancelled. Your record is unchanged.',
  account_invited: () => 'An invitation to link your account is ready.',
  account_claimed: () => 'Your account is linked to your existing record.',
  offer_awaiting_response: () => 'A place offer is waiting for a response.',
  offer_response_relayed: () => 'A response to a place offer was recorded with coordinator assistance.',
  outcome_corrected: (_ref, detail) => `The council corrected the recorded support outcome: ${detail ?? 'see your referral details'}.`,
  outcome_upheld: () => 'The council reviewed your outcome request and kept the recorded outcome. See the council note.',
  instructions_recorded: () => 'The council added practical instructions for your confirmed place.',
};

/**
 * In-app notice examples for one persona, built from the audit log.
 * Creatives see their record and referrals; coordinators see their site and their relayed actions; council sees all.
 */
export function noticesFor(data: DomainData, actor: Actor, limit = 10): InAppNotice[] {
  const ownRecordIds = new Set(
    actor.role === 'creative' ? data.records.filter((r) => r.personId === actor.id).map((r) => r.id) : [],
  );
  const ownReferralIds = new Set(data.referrals.filter((r) => ownRecordIds.has(r.recordId)).map((r) => r.id));
  const siteRecordIds = new Set(
    actor.role === 'coordinator' ? data.records.filter((r) => r.siteId === actor.siteId).map((r) => r.id) : [],
  );
  const siteReferralIds = new Set(
    actor.role === 'coordinator'
      ? data.referrals.filter((referral) => siteRecordIds.has(referral.recordId)).map((referral) => referral.id)
      : [],
  );

  const visible = data.audit.filter((event) => {
    if (actor.role === 'council') return true;
    if (actor.role === 'creative') return ownRecordIds.has(event.entityId) || ownReferralIds.has(event.entityId);
    if (actor.role === 'coordinator') return event.via === actor.id || siteRecordIds.has(event.entityId) || siteReferralIds.has(event.entityId);
    return false;
  });

  return visible
    .filter((event) => event.action in NOTICE_TEXT)
    .slice(-limit)
    .reverse()
    .map((event) => {
      const record = data.records.find((r) => r.id === event.entityId);
      const reference = record?.application.reference ?? '';
      const describe = NOTICE_TEXT[event.action];
      const referralNotice = event.action === 'state_changed' && event.entityType === 'referral'
        ? event.to === 'offered'
          ? 'The council offered you a place. Review the details and respond.'
          : event.to === 'confirmed'
            ? 'The council confirmed your place. Check the practical instructions.'
            : event.to === 'completed'
              ? 'The council recorded attendance or completion for your support referral.'
              : event.to === 'did_not_attend'
                ? 'The council recorded that you did not attend. Contact the council if you need to follow up.'
                : event.to === 'awaiting_follow_up'
                  ? 'The council recorded that follow-up is still needed.'
                  : null
        : null;
      const text = referralNotice ?? describe?.(reference, event.reason) ?? 'A referral you are assigned to was updated.';
      return { id: event.id, at: event.at, text };
    });
}
