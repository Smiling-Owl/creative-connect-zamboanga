import { listingStatus, isListed } from './visibility';
import { CAPACITY_STATES } from './referral';
import type { Actor, AuditEvent, Case, CreativeRecord, DomainData, Opportunity, OpportunityState, Referral, ReferralState, Role } from './types';

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

/** A council application is overdue after this many demo days without a first decision. */
const OVERDUE_MS = 5 * 86_400_000;

/** Latest receipt for the clock: the most recent `received` or `resubmitted` record event, else the stored receipt time. */
export function latestReceiptAt(data: DomainData, record: CreativeRecord): string {
  let latest = record.application.receivedAt;
  for (const event of data.audit) {
    if (event.entityType !== 'record' || event.entityId !== record.id) continue;
    if ((event.action === 'received' || event.action === 'resubmitted') && event.at > latest) latest = event.at;
  }
  return latest;
}

/**
 * Overdue: still waiting for a first council decision, five or more demo days after the latest receipt or resubmission.
 * Shared by the M01 overview count and the queue marker.
 */
export function isOverdue(data: DomainData, record: CreativeRecord, at: string): boolean {
  const awaitingFirstDecision = record.application.state === 'received' || record.application.state === 'under_review';
  const now = Date.parse(at);
  const receivedAt = Date.parse(latestReceiptAt(data, record));
  return awaitingFirstDecision && Number.isFinite(now) && Number.isFinite(receivedAt) && now - receivedAt >= OVERDUE_MS;
}

/** Referral stages a referral has reached, either now or at some point in its recorded history. */
const OFFERED_OR_LATER: ReferralState[] = ['offered', 'accepted', 'declined', 'confirmed', 'completed', 'did_not_attend', 'awaiting_follow_up'];
const ACCEPTED_OR_LATER: ReferralState[] = ['accepted', 'confirmed', 'completed', 'did_not_attend', 'awaiting_follow_up'];
const CONFIRMED_OR_LATER: ReferralState[] = ['confirmed', 'completed', 'did_not_attend', 'awaiting_follow_up'];

/**
 * Attended stage: the referral reached `completed` and that outcome was not later corrected away.
 * Walks the history in order, so a completion replaced by a resolved correction does not count,
 * while a completion recorded again later does. Confirmed stays a lifecycle stage and is not affected.
 */
function reachedAttended(referral: Referral, history: AuditEvent[]): boolean {
  if (referral.state === 'completed') return true;
  let attended = false;
  for (const event of history) {
    if (event.to === 'completed') attended = true;
    else if (event.action === 'outcome_corrected' && event.from === 'completed') attended = false;
  }
  return attended;
}

/** Retained records that share a linked alias with a kept record. Views use this to reconcile record lists with overview totals. */
export function linkedDuplicateCount(data: DomainData): number {
  return data.records.filter((record) => record.application.duplicate?.status === 'linked').length;
}

export interface CouncilOverview {
  /** Calendar day of the demo clock, used in every "as of" phrase. */
  asOf: string;
  counts: CouncilCounts;
  /** Received records, with linked aliases excluded. Denominator for record figures. */
  receivedBase: number;
  /** All retained referrals. Denominator for referral figures. */
  referralBase: number;
  /** All opportunities. Denominator for opportunity-state figures. */
  opportunityBase: number;
  recordsByState: Record<'received' | 'under_review' | 'changes_requested' | 'declined' | 'verified', number>;
  pending: { new: number; resubmitted: number; underReview: number; profileUpdates: number; openCases: number; overdue: number };
  referrals: {
    current: Record<ReferralState, number>;
    /** Stages reached at any point in the recorded history. Never reduced when a later stage replaces an earlier one. */
    cumulative: { initiated: number; offered: number; accepted: number; confirmed: number; attended: number };
    exceptions: Record<'not_selected' | 'declined' | 'cancelled' | 'did_not_attend' | 'awaiting_follow_up', number>;
  };
  /** Keyed by site id, or `self_service` for records without a site. Views attach names and labels. */
  siteCoverage: Array<{ key: string; count: number; base: number }>;
  sourceCoverage: Array<{ key: 'assisted' | 'self_service'; count: number; base: number }>;
}

/** Current-state operational counts plus history-derived referral funnel, using council-received entities only. */
export function councilOverview(data: DomainData, at: string): CouncilOverview {
  const receivedRecords = data.records.filter((record) => record.application.duplicate?.status !== 'linked');
  const counts = councilCounts(data);
  const overdue = receivedRecords.filter((record) => isOverdue(data, record, at)).length;

  const historyByReferral = new Map<string, AuditEvent[]>();
  for (const event of data.audit) {
    if (event.entityType === 'referral') historyByReferral.set(event.entityId, [...(historyByReferral.get(event.entityId) ?? []), event]);
  }
  const reached = (referral: Referral, stages: ReferralState[]) =>
    stages.includes(referral.state)
    || (historyByReferral.get(referral.id) ?? []).some((event) => stages.some((stage) => stage === event.from || stage === event.to));

  const siteCoverage = [...data.sites.map((site) => site.id), 'self_service'].map((key) => ({
    key,
    count: receivedRecords.filter((record) => (record.source.siteId ?? 'self_service') === key).length,
    base: receivedRecords.length,
  }));
  const sourceCoverage = (['assisted', 'self_service'] as const).map((key) => ({
    key,
    count: receivedRecords.filter((record) => record.source.mode === key).length,
    base: receivedRecords.length,
  }));

  return {
    asOf: at.slice(0, 10),
    counts,
    receivedBase: receivedRecords.length,
    referralBase: data.referrals.length,
    opportunityBase: data.opportunities.length,
    recordsByState: { received: counts.received, under_review: counts.underReview, changes_requested: counts.changesRequested, declined: counts.declined, verified: counts.verified },
    pending: {
      new: councilQueue(data, 'new').length,
      resubmitted: councilQueue(data, 'resubmitted').length,
      underReview: councilQueue(data, 'under_review').filter((record) => !record.application.updatePending).length,
      profileUpdates: receivedRecords.filter((record) => record.application.updatePending).length,
      openCases: data.cases.filter((item) => item.state === 'open').length,
      overdue,
    },
    referrals: {
      current: counts.referrals,
      cumulative: {
        initiated: data.referrals.length,
        offered: data.referrals.filter((item) => reached(item, OFFERED_OR_LATER)).length,
        accepted: data.referrals.filter((item) => reached(item, ACCEPTED_OR_LATER)).length,
        confirmed: data.referrals.filter((item) => reached(item, CONFIRMED_OR_LATER)).length,
        attended: data.referrals.filter((item) => reachedAttended(item, historyByReferral.get(item.id) ?? [])).length,
      },
      exceptions: {
        not_selected: counts.referrals.not_selected,
        declined: counts.referrals.declined,
        cancelled: counts.referrals.cancelled,
        did_not_attend: counts.referrals.did_not_attend,
        awaiting_follow_up: counts.referrals.awaiting_follow_up,
      },
    },
    siteCoverage,
    sourceCoverage,
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

/**
 * What a coordinator sees: assigned site records, their own drafts, and their own device queue.
 * `notReceived` counts this device's items the council has not received. It is never a council figure.
 */
export function coordinatorWorkspace(data: DomainData, actor: Actor) {
  const queue = data.queue.filter((q) => q.coordinatorId === actor.id);
  return {
    records: data.records.filter((r) => actor.siteId !== undefined && r.siteId === actor.siteId),
    drafts: data.drafts.filter((d) => d.ownerId === actor.id),
    queue,
    notReceived: queue.filter((item) => item.status !== 'delivered').length,
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

export interface InAppNotice {
  id: string;
  at: string;
  text: string;
  /** Hash route for the related record or referral, when the persona can open one. */
  to?: string;
}

/** Index over the entities an audit event may point at, so each lookup is a map read. */
interface EventIndex {
  records: Map<string, CreativeRecord>;
  referrals: Map<string, Referral>;
  cases: Map<string, Case>;
  opportunities: Map<string, Opportunity>;
}

function indexFor(data: DomainData): EventIndex {
  return {
    records: new Map(data.records.map((record) => [record.id, record])),
    referrals: new Map(data.referrals.map((referral) => [referral.id, referral])),
    cases: new Map(data.cases.map((item) => [item.id, item])),
    opportunities: new Map(data.opportunities.map((item) => [item.id, item])),
  };
}

function recordIdFor(index: EventIndex, event: AuditEvent): string | undefined {
  if (event.entityType === 'record') return event.entityId;
  if (event.entityType === 'referral') return index.referrals.get(event.entityId)?.recordId;
  if (event.entityType === 'case') return index.cases.get(event.entityId)?.recordId;
  return undefined;
}

// Plain-language sentences. They are neutral in voice so the same event reads correctly for creatives,
// coordinators, and the council. Status words used here are the same as in labels.ts.
const NOTICE_TEXT: Record<string, (reference: string, detail: string | null) => string> = {
  received: (ref) => `The council received application ${ref}.`,
  review_started: () => 'Council review has started.',
  changes_requested: (_ref, detail) => `Changes requested: ${detail ?? 'see the reason'}.`,
  verified: () => 'Membership verified. This is not a quality rating.',
  declined: (_ref, detail) => `Application declined: ${detail ?? 'see the reason'}.`,
  resubmitted: () => 'Corrected information was received for review.',
  state_changed: (_ref, detail) => detail ?? 'A referral status changed. Review its current status.',
  reconfirmation_required: () => 'Opportunity details changed. The council will confirm the place again.',
  cancelled_by_opportunity: () => 'An opportunity linked to this referral was cancelled. The record is unchanged.',
  account_invited: () => 'An invitation to link an account is ready.',
  account_claimed: () => 'An account was linked to the existing record.',
  offer_awaiting_response: () => 'A place offer is waiting for a response.',
  offer_response_relayed: () => 'A response to a place offer was recorded with coordinator assistance.',
  outcome_corrected: (_ref, detail) => `The recorded support outcome was corrected: ${detail ?? 'see the referral details'}.`,
  outcome_upheld: () => 'An outcome correction was reviewed. The recorded outcome was kept; see the council note.',
  instructions_recorded: () => 'Practical instructions were added for a confirmed place.',
  opened: (_ref, detail) => `A council case was opened${detail ? `: ${detail}` : '.'}`,
  resolved: (_ref, detail) => `A council case was resolved${detail ? `: ${detail}` : '.'}`,
  public_content_approved: () => 'Public profile content was reviewed. Listing still depends on the separate directory choice.',
  profile_changed: () => 'Verified profile details were updated. Some public changes may still need council review.',
  update_approved: () => 'The council approved the profile update.',
  update_changes_requested: (_ref, detail) => `The council requested a change to the profile update: ${detail ?? 'see the record'}.`,
  withdrawal_requested: () => 'A withdrawal request was sent to the council. Public listing was turned off immediately.',
  withdrawal_disposition_recorded: (_ref, detail) => `The council recorded a withdrawal decision${detail ? `: ${detail}` : '.'}`,
  correction_resolved: (_ref, detail) => `The council responded to a correction request${detail ? `: ${detail}` : '.'}`,
  outcome_correction_requested: (_ref, detail) => `An outcome correction was requested${detail ? `: ${detail}` : '.'}`,
  created: (_ref, detail) => (detail ? `An opportunity was created (${detail}).` : 'An opportunity was created.'),
  published: () => 'An opportunity was published.',
  edited: () => 'Opportunity details were edited.',
  closed: () => 'An opportunity was closed.',
  cancelled: (_ref, detail) => `An opportunity was cancelled${detail ? `: ${detail}` : '.'}`,
  public_content_changes_requested: (_ref, detail) => `The council asked for changes to public profile content${detail ? `: ${detail}` : '.'}`,
  decline_upheld: (_ref, detail) => `The council kept the decision after a human review${detail ? `: ${detail}` : '.'}`,
  review_reopened: (_ref, detail) => `The council reopened review after a human-review request${detail ? `: ${detail}` : '.'}`,
};

function hasNoticeText(action: string): boolean {
  return Object.prototype.hasOwnProperty.call(NOTICE_TEXT, action);
}

/** Referral events need their own sentences: the same action names mean different things for referrals. */
function referralSentence(index: EventIndex, event: AuditEvent): string | null {
  const referral = index.referrals.get(event.entityId);
  const title = index.opportunities.get(referral?.opportunityId ?? '')?.title ?? 'an opportunity';
  if (event.action === 'created') {
    return event.to === 'offered'
      ? `The council offered a place for ${title}. Review the details and respond.`
      : `Interest was recorded for ${title}.`;
  }
  if (event.action !== 'state_changed') return null;
  switch (event.to) {
    case 'offered': return `The council offered a place for ${title}. Review the details and respond.`;
    case 'accepted': return 'The offer was accepted. The council still needs to confirm capacity and arrangements.';
    case 'confirmed': return 'The council confirmed the place. Check the practical instructions.';
    case 'completed': return 'Attendance or completion was recorded for this support referral.';
    case 'did_not_attend': return 'A did-not-attend outcome was recorded. Contact the council if you need to follow up.';
    case 'awaiting_follow_up': return 'The referral is awaiting follow-up.';
    case 'declined': return 'The place offer was declined.';
    case 'cancelled': return 'The referral was cancelled. Review the reason.';
    case 'not_selected': return 'The council did not select this referral for the opportunity.';
    case 'under_review': return 'The council is reviewing this referral.';
    default: return null;
  }
}

function sentenceFor(index: EventIndex, event: AuditEvent): string {
  if (event.entityType === 'referral') {
    const sentence = referralSentence(index, event);
    if (sentence) return sentence;
  }
  const recordId = recordIdFor(index, event);
  const reference = recordId ? index.records.get(recordId)?.application.reference ?? '' : '';
  const detail = event.reason ?? (event.entityType === 'case' ? index.cases.get(event.entityId)?.reason ?? null : null);
  const describe = NOTICE_TEXT[event.action];
  return describe ? describe(reference, detail) : 'A related record changed. Review its current status.';
}

/** The page a persona can open for this event. Creatives and coordinators stay on their own records. */
function linkFor(index: EventIndex, role: Role, event: AuditEvent, recordId: string | undefined): string | undefined {
  const caseReferralId = event.entityType === 'case' ? index.cases.get(event.entityId)?.referralId ?? null : null;
  const referralId = event.entityType === 'referral' ? event.entityId : caseReferralId;
  if (role === 'creative') return referralId ? '/me/referrals' : '/me';
  if (role === 'coordinator') return recordId ? `/coordinator/records/${encodeURIComponent(recordId)}` : undefined;
  if (role === 'council') {
    if (event.entityType === 'opportunity') return '/council/opportunities';
    if (referralId) {
      const opportunityId = index.referrals.get(referralId)?.opportunityId ?? '';
      return `/council/referrals/${encodeURIComponent(opportunityId)}`;
    }
    return recordId ? `/council/applications/${encodeURIComponent(recordId)}` : '/council';
  }
  return undefined;
}

function noticeFor(index: EventIndex, role: Role, event: AuditEvent): InAppNotice {
  const recordId = recordIdFor(index, event);
  return { id: event.id, at: event.at, text: sentenceFor(index, event), to: linkFor(index, role, event, recordId) };
}

/**
 * In-app notice examples for one persona, built from the audit log.
 * Creatives see events on their own record; coordinators see events on their site's records; council sees received records and referrals.
 * Queue and draft events are device-side and never appear in any list.
 */
export function noticesFor(data: DomainData, actor: Actor, limit = 10): InAppNotice[] {
  const index = indexFor(data);
  const ownRecordIds = new Set(actor.role === 'creative' ? data.records.filter((r) => r.personId === actor.id).map((r) => r.id) : []);
  const siteRecordIds = new Set(actor.role === 'coordinator' ? data.records.filter((r) => r.siteId === actor.siteId).map((r) => r.id) : []);
  const visible = data.audit.filter((event) => {
    if (event.entityType === 'queue' || event.entityType === 'draft') return false;
    if (!hasNoticeText(event.action)) return false;
    if (actor.role === 'council') return event.entityType !== 'record' || index.records.has(event.entityId);
    const recordId = recordIdFor(index, event);
    if (!recordId) return false;
    if (actor.role === 'creative') return ownRecordIds.has(recordId);
    if (actor.role === 'coordinator') return siteRecordIds.has(recordId);
    return false;
  });

  return visible
    .slice(-limit)
    .reverse()
    .map((event) => noticeFor(index, actor.role, event));
}
