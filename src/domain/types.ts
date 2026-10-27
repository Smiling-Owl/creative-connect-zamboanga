// Domain entities and state unions. Business rules live in the sibling modules.
// All identifiers are strings. Timestamps are ISO strings from the demo clock.

export type Role = 'guest' | 'creative' | 'coordinator' | 'council';

/** Who is acting. For creatives `id` is the person id; for staff it is the staff id. */
export interface Actor {
  role: Role;
  id: string;
  siteId?: string;
}

export interface DemoSettings {
  online: boolean;
  /** When true, the next delivery attempt during sync fails once, then the flag clears. */
  failNextSend: boolean;
}

export interface Ctx {
  actor: Actor;
  /** ISO timestamp from the demo clock. */
  at: string;
  settings: DemoSettings;
}

export type FollowUp =
  | { kind: 'own_channel'; channelLabel: string }
  | { kind: 'coordinator_mediated'; coordinatorId: string };

export type EvidenceKind = 'link' | 'sample' | 'assisted_description';

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  text: string;
  /** Creator opt-in for showing this item on the public profile. */
  publicApproved: boolean;
}

export interface IntakeFields {
  name: string;
  displayName: string;
  domain: string;
  practice: string;
  skills: string[];
  area: string;
  interests: string[];
  followUp: FollowUp;
  evidence: EvidenceItem[];
  acknowledged: boolean;
}

export interface IntakeSource {
  mode: 'self_service' | 'assisted';
  siteId: string | null;
  coordinatorId: string | null;
  capturedOn: string;
}

/** An unsent intake (new application or correction) on a device or account. */
export interface Draft {
  id: string;
  ownerId: string;
  /** Null for a new application; set when correcting an existing record. */
  recordId: string | null;
  source: IntakeSource;
  fields: IntakeFields;
  updatedAt: string;
}

export type ApplicationState = 'received' | 'under_review' | 'changes_requested' | 'declined' | 'verified';

export interface DuplicateFlag {
  candidateRecordId: string;
  status: 'open' | 'not_duplicate' | 'linked';
  reason: string | null;
}

export interface Application {
  /** Council reference assigned on receipt, e.g. CCZ-0007. */
  reference: string;
  state: ApplicationState;
  /** Increments on every received submission or correction. */
  version: number;
  receivedAt: string;
  /** Latest reason from a council decision (changes requested or declined). */
  reason: string | null;
  duplicate: DuplicateFlag | null;
  /** Set when a verified record changes substantive fields; does not revoke verification. */
  updatePending: boolean;
  /** Council's reason when it asks for changes to a pending update. Null when no changes are requested. */
  updateReason: string | null;
}

export interface CreativeRecord {
  id: string;
  /** Linked creative account, set on claim. Null for assisted records without an account. */
  personId: string | null;
  accountState: 'none' | 'invited' | 'active';
  inviteCode: string | null;
  intake: IntakeFields;
  source: IntakeSource;
  siteId: string | null;
  coordinatorId: string | null;
  /** Creator's public-listing choice. Starts false unless chosen at submission. */
  optedIn: boolean;
  /** Fingerprint of the public fields the council last approved. Null means never approved. */
  publicApprovedFingerprint: string | null;
  application: Application;
  lastConfirmed: string;
  /** Council-only notes. Never included in public output. */
  internalNotes: string[];
}

export type TransferStatus = 'waiting' | 'sending' | 'failed' | 'conflict' | 'delivered';

/** An item queued on a coordinator device. It has not reached the council until delivered. */
export interface QueueItem {
  id: string;
  deviceRef: string;
  coordinatorId: string;
  siteId: string;
  /** Null for a new application; the record id for a correction. */
  recordId: string | null;
  kind: 'new_application' | 'correction';
  baseVersion: number;
  fields: IntakeFields;
  source: IntakeSource;
  optedIn: boolean;
  status: TransferStatus;
  attempts: number;
  lastError: string | null;
  deliveredRecordId: string | null;
  queuedAt: string;
}

export type OpportunityType = 'workshop' | 'clinic' | 'support' | 'other';
export type OpportunityState = 'draft' | 'published' | 'closed' | 'cancelled';

export interface Opportunity {
  id: string;
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
  state: OpportunityState;
  cancelReason: string | null;
}

export type ReferralState =
  | 'interest'
  | 'under_review'
  | 'offered'
  | 'not_selected'
  | 'accepted'
  | 'declined'
  | 'confirmed'
  | 'completed'
  | 'did_not_attend'
  | 'awaiting_follow_up'
  | 'cancelled';

export type OutcomeState = 'completed' | 'did_not_attend' | 'awaiting_follow_up';

export interface Referral {
  id: string;
  recordId: string;
  opportunityId: string;
  origin: 'interest' | 'invitation';
  state: ReferralState;
  reason: string | null;
  /** Coordinator who relayed the creative's response, if any. */
  via: string | null;
  instructions: string | null;
  updatedAt: string;
}

export type CaseKind = 'human_review' | 'profile_correction' | 'withdrawal' | 'outcome_correction';

export interface Case {
  id: string;
  kind: CaseKind;
  recordId: string;
  referralId: string | null;
  state: 'open' | 'resolved';
  reason: string;
  resolution: string | null;
  openedBy: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: { role: Role; id: string };
  /** Coordinator who relayed the action on the creative's behalf. */
  via: string | null;
  entityType: 'draft' | 'record' | 'queue' | 'opportunity' | 'referral' | 'case';
  entityId: string;
  action: string;
  from: string | null;
  to: string | null;
  reason: string | null;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  kind: 'barangay' | 'school';
}

export interface StaffMember {
  id: string;
  role: 'coordinator' | 'council';
  name: string;
  siteId: string | null;
}

export interface DomainData {
  /** Monotonic counter for deterministic ids and references. */
  seq: number;
  sites: Site[];
  staff: StaffMember[];
  records: CreativeRecord[];
  drafts: Draft[];
  queue: QueueItem[];
  opportunities: Opportunity[];
  referrals: Referral[];
  cases: Case[];
  audit: AuditEvent[];
}

/** `id` is the primary id created or affected by the action, when there is one. */
export type Result =
  | { ok: true; data: DomainData; id?: string; failedItemId?: string }
  | { ok: false; code: string; message: string };
