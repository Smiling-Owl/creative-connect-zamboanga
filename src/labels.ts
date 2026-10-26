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
