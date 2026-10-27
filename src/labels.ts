import type { ApplicationState, OpportunityState, ReferralState, Role, TransferStatus } from './domain/types';
import type { ListingStatus } from './domain/visibility';

// The one place where user-facing status wording lives. Matches the Status Vocabulary in context/ui-context.md.
// Never claim paid work, income, certification, a guaranteed place, or official endorsement.

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StatusLabel {
  label: string;
  tone: Tone;
}

/** Before submission. Not a council state. */
export const DRAFT_LABEL: StatusLabel = { label: 'Draft — not submitted', tone: 'neutral' };

export const APPLICATION_LABEL: Record<ApplicationState, StatusLabel> = {
  received: { label: 'Received by the council — reference shown', tone: 'info' },
  under_review: { label: 'Under council review', tone: 'info' },
  changes_requested: { label: 'Changes requested — see reason', tone: 'warning' },
  declined: { label: 'Declined — see reason; you can request a human review', tone: 'danger' },
  verified: { label: 'Verified member (council checks passed — not a quality rating)', tone: 'success' },
};

export const UPDATE_PENDING_LABEL: StatusLabel = { label: 'Update waiting for council review', tone: 'warning' };
export const DUPLICATE_LABEL: StatusLabel = { label: 'Possible duplicate — council must resolve', tone: 'warning' };

export const TRANSFER_LABEL: Record<TransferStatus, StatusLabel> = {
  waiting: { label: 'Queued on this device — the council has not received it', tone: 'warning' },
  sending: { label: 'Sending…', tone: 'info' },
  failed: { label: 'Sending failed — retry when connected', tone: 'danger' },
  conflict: { label: 'Needs attention — the council record changed', tone: 'danger' },
  delivered: { label: 'Received by the council', tone: 'info' },
};

export const LISTING_LABEL: Record<ListingStatus, StatusLabel> = {
  not_listed: { label: 'Not listed (private)', tone: 'neutral' },
  waiting_verification: { label: 'Not listed — waiting for verification', tone: 'neutral' },
  pending_review: { label: 'Listing pending review', tone: 'warning' },
  listed: { label: 'Listed in directory', tone: 'success' },
};

export const OPPORTUNITY_LABEL: Record<OpportunityState, StatusLabel> = {
  draft: { label: 'Draft', tone: 'neutral' },
  published: { label: 'Open (published)', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

export const REFERRAL_LABEL: Record<ReferralState, StatusLabel> = {
  interest: { label: 'Interest sent — waiting for council review', tone: 'info' },
  under_review: { label: 'Council reviewing suitability', tone: 'info' },
  offered: { label: 'Place offered — please respond', tone: 'warning' },
  not_selected: { label: 'Not selected this time', tone: 'neutral' },
  accepted: { label: 'Accepted — waiting for council confirmation', tone: 'info' },
  declined: { label: 'You declined this offer', tone: 'neutral' },
  confirmed: { label: 'Place confirmed — see instructions', tone: 'success' },
  completed: { label: 'Attended / completed (support received)', tone: 'success' },
  did_not_attend: { label: 'Did not attend', tone: 'neutral' },
  awaiting_follow_up: { label: 'Awaiting follow-up', tone: 'warning' },
  cancelled: { label: 'Cancelled — see reason', tone: 'danger' },
};

export const ROLE_LABEL: Record<Role, string> = {
  guest: 'Guest',
  creative: 'Creative',
  coordinator: 'Community coordinator',
  council: 'Council administrator',
};

// Council overview (Feature 08). Every figure is synthetic and states its denominator and window.
export const SYNTHETIC_DATA_LABEL = 'Synthetic demo data — not real results';
export const NOTIFICATION_LABEL = 'In-app example — no SMS or email is sent';
export const NOT_RECEIVED_NOTE = 'Device-only starts and submissions are not yet received by the council. They are excluded from every figure on this panel.';
export const NOT_EVIDENCE_NOTE = 'These figures describe council records and referral steps only. They are not evidence of impact, income, or paid work.';
export const FUNNEL_NOTE = 'Each stage counts referrals that reached it at any point in the recorded history. Moving on to a later step does not remove an earlier stage. Current totals are shown separately above.';
export const DEVICE_NOT_RECEIVED_LABEL = 'on devices, not received';
export const SINCE_DEMO_START = 'since demo start';
export const NO_RECORDS_YET = 'no records yet';
export const NO_REFERRALS_YET = 'no referrals yet';
export const NO_OPPORTUNITIES_YET = 'no opportunities yet';

export const SOURCE_LABEL: Record<'assisted' | 'self_service', string> = {
  assisted: 'Coordinator-assisted',
  self_service: 'Self-service',
};
export const SELF_SERVICE_SITE_LABEL = 'Self-service (no site)';

// Council-aggregate wording. Used only in council overview figures, and only where the canonical label
// (APPLICATION_LABEL / REFERRAL_LABEL) is written to the creative ("you", "please respond"). All other states
// use the canonical labels above, so each state reads the same in every role view.
export const COUNCIL_AGGREGATE_LABEL = {
  applicationDeclined: 'Declined — see reason',
  referralOffered: 'Place offered — awaiting creative response',
  referralDeclined: 'Offer declined by creative',
} as const;

/** Label for a received-application state in council aggregate figures. */
export function councilApplicationLabel(state: ApplicationState): string {
  return state === 'declined' ? COUNCIL_AGGREGATE_LABEL.applicationDeclined : APPLICATION_LABEL[state].label;
}

/** Label for a referral state in council aggregate figures. */
export function councilReferralLabel(state: ReferralState): string {
  if (state === 'offered') return COUNCIL_AGGREGATE_LABEL.referralOffered;
  if (state === 'declined') return COUNCIL_AGGREGATE_LABEL.referralDeclined;
  return REFERRAL_LABEL[state].label;
}

/** "Includes N linked duplicate records" note for the records list, so it reconciles with the overview. */
export function linkedDuplicateNote(count: number): string {
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  return `Includes ${n} linked duplicate record${n === 1 ? '' : 's'}. Linked duplicates keep their own history and are excluded from the record totals on the overview.`;
}

export const FUNNEL_STAGE_LABEL = {
  initiated: 'Interest or invitation started',
  offered: 'Offered a place',
  accepted: 'Accepted the offer',
  confirmed: 'Place confirmed',
  attended: 'Attended or completed',
} as const;

export const PENDING_LABEL = {
  new: 'New applications',
  resubmitted: 'Resubmitted applications',
  underReview: 'Under council review',
  profileUpdates: 'Profile updates waiting for review',
  openCases: 'Open cases',
  overdue: 'Overdue: 5 or more demo days waiting for a first decision',
} as const;

export const OVERVIEW_SECTION_LABEL = {
  pending: 'Pending reviews',
  recordsByStatus: 'Records by status',
  listing: 'Listed and private verified members',
  opportunities: 'Opportunities by state',
  currentReferrals: 'Current referrals by state',
  cumulativeFunnel: 'Referral funnel, cumulative',
  exceptions: 'Referral exceptions',
  siteCoverage: 'Coverage by site',
  sourceCoverage: 'Coverage by intake source',
  activity: 'Recent activity and notifications',
} as const;
