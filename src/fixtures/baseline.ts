import { publicFingerprint } from '../domain/visibility';
import type {
  Application,
  CreativeRecord,
  DomainData,
  IntakeFields,
  IntakeSource,
  Opportunity,
  QueueItem,
  Referral,
  Case,
  Draft,
} from '../domain/types';

// Baseline fictional data. Every person, site, provider, and opportunity here is invented.
// Labeled "(fictional)" wherever it could be mistaken for a real place or organization.
// Adult participants only. No real contact details.

const RECEIVED = '2026-10-10T10:00:00.000Z';

const SOURCE_SELF: IntakeSource = { mode: 'self_service', siteId: null, coordinatorId: null, capturedOn: '2026-10-10' };
const SOURCE_A: IntakeSource = { mode: 'assisted', siteId: 'site-a', coordinatorId: 'coord-a', capturedOn: '2026-10-10' };
const SOURCE_B: IntakeSource = { mode: 'assisted', siteId: 'site-b', coordinatorId: 'coord-b', capturedOn: '2026-10-10' };


function intake(overrides: Partial<IntakeFields> & Pick<IntakeFields, 'displayName' | 'domain' | 'practice' | 'skills' | 'area'>): IntakeFields {
  const evidence = overrides.evidence ?? [
    { id: `ev-${overrides.displayName.replace(/\W+/g, '-').toLowerCase()}`, kind: 'sample', text: 'Sample set: six demo artworks (fictional)', publicApproved: true },
  ];
  return {
    name: overrides.displayName,
    interests: [],
    acknowledged: true,
    followUp: { kind: 'own_channel', channelLabel: `Demo contact: ${overrides.displayName}` },
    ...overrides,
    evidence,
  };
}

function application(
  reference: string,
  state: Application['state'],
  version: number,
  extra: Partial<Application> = {},
): Application {
  return {
    reference,
    state,
    version,
    receivedAt: RECEIVED,
    reason: null,
    duplicate: null,
    updatePending: false,
    updateReason: null,
    ...extra,
  };
}

function record(
  id: string,
  fields: IntakeFields,
  source: IntakeSource,
  app: Application,
  options: { personId?: string | null; optedIn?: boolean; approved?: boolean; inviteCode?: string | null } = {},
): CreativeRecord {
  const personId = options.personId ?? null;
  return {
    id,
    personId,
    accountState: personId ? 'active' : options.inviteCode ? 'invited' : 'none',
    inviteCode: options.inviteCode ?? null,
    intake: fields,
    source,
    siteId: source.siteId,
    coordinatorId: source.coordinatorId,
    optedIn: options.optedIn ?? false,
    publicApprovedFingerprint: options.approved === false ? null : publicFingerprint(fields),
    application: app,
    lastConfirmed: RECEIVED,
    internalNotes: [],
  };
}

const rhea = intake({
  displayName: 'Rhea Dimaano (demo)',
  domain: 'Design',
  practice: 'Graphic design',
  skills: ['Poster layout', 'Logo sketching'],
  area: 'Area 1 (broad, fictional)',
  followUp: { kind: 'own_channel', channelLabel: 'rhea@example.invalid' },
});

const dani = intake({
  displayName: 'Dani Ocampo (demo)',
  domain: 'Visual Arts',
  practice: 'Visual arts',
  skills: ['Watercolor', 'Illustration'],
  area: 'Area 2 (broad, fictional)',
  followUp: { kind: 'coordinator_mediated', coordinatorId: 'coord-b' },
  evidence: [{ id: 'ev-dani-1', kind: 'assisted_description', text: 'Described in person: a series of twelve watercolor studies (fictional)', publicApproved: true }],
});

const noel = intake({
  displayName: 'Noel Pascual (demo)',
  domain: 'Audiovisual Media',
  practice: 'Film / video',
  skills: ['Editing', 'Short documentary'],
  area: 'Area 3 (broad, fictional)',
  evidence: [{ id: 'ev-noel-1', kind: 'link', text: 'Demo link placeholder: short film (fictional, not opened)', publicApproved: true }],
});

const vina = intake({
  displayName: 'Vina Salazar (demo)',
  domain: 'Traditional Cultural Expressions',
  practice: 'Crafts',
  skills: ['Weaving'],
  area: 'Area 1 (broad, fictional)',
});

const joel = intake({
  displayName: 'Joel Tan (demo)',
  domain: 'Design',
  practice: 'Digital content',
  skills: ['Social graphics'],
  area: 'Area 1 (broad, fictional)',
  evidence: [{ id: 'ev-joel-1', kind: 'sample', text: 'Private sample set kept with the council (fictional)', publicApproved: false }],
});

const joelSecond = intake({
  displayName: 'Joel Tan (demo)',
  domain: 'Design',
  practice: 'Digital content',
  skills: ['Animated posters'],
  area: 'Area 1 (broad, fictional)',
  evidence: [{ id: 'ev-joel-2', kind: 'sample', text: 'Sample set: four animated posters (fictional)', publicApproved: false }],
});

const lorenz = intake({
  displayName: 'Lorenz Villanueva (demo)',
  domain: 'Publishing and Printed Media',
  practice: 'Other (writing and zines)',
  skills: ['Zine layout'],
  area: 'Area 3 (broad, fictional)',
  evidence: [{ id: 'ev-lorenz-1', kind: 'assisted_description', text: 'Described in person: two self-published zines (fictional)', publicApproved: false }],
});

const gwen = intake({
  displayName: 'Gwen Alcantara (demo)',
  domain: 'Design',
  practice: 'Graphic design',
  skills: ['Event flyers'],
  area: 'Area 2 (broad, fictional)',
  evidence: [],
});

const gwenRevised = intake({
  displayName: 'Gwen Alcantara (demo)',
  domain: 'Design',
  practice: 'Graphic design',
  skills: ['Event flyers', 'Signage'],
  area: 'Area 2 (broad, fictional)',
  evidence: [{ id: 'ev-gwen-2', kind: 'sample', text: 'Sample set: three event flyers (fictional)', publicApproved: false }],
});

const ines = intake({
  displayName: 'Ines Cabrera (demo)',
  domain: 'Visual Arts',
  practice: 'Visual arts',
  skills: ['Ink drawing'],
  area: 'Area 2 (broad, fictional)',
  followUp: { kind: 'coordinator_mediated', coordinatorId: 'coord-b' },
  evidence: [{ id: 'ev-ines-1', kind: 'assisted_description', text: 'Described in person: ink studies (fictional)', publicApproved: false }],
});

const mikaDraft = intake({
  displayName: 'Mika (demo)',
  name: 'Mika (fictional)',
  domain: 'Visual Arts',
  practice: 'Illustration',
  skills: ['Character design', 'Picture-book pages'],
  area: 'Area 2 (broad, fictional)',
  interests: ['Portfolio feedback'],
  followUp: { kind: 'coordinator_mediated', coordinatorId: 'coord-a' },
  acknowledged: false,
  evidence: [{ id: 'ev-mika-1', kind: 'assisted_description', text: 'Described in person: twelve picture-book pages, no online portfolio (fictional)', publicApproved: false }],
});

const junDraft = intake({
  displayName: 'Jun (demo)',
  name: 'Jun (fictional)',
  domain: 'Audiovisual Media',
  practice: 'Film / video',
  skills: ['Video editing'],
  area: 'Area 3 (broad, fictional)',
  followUp: { kind: 'own_channel', channelLabel: 'Demo contact: Jun (fictional)' },
  acknowledged: false,
  evidence: [],
});

const CLINIC = 'opp-clinic';
const PRINT = 'opp-print';
const FILM = 'opp-film';
const MURAL = 'opp-mural';
const DIGITAL = 'opp-digital';

function opportunity(overrides: Partial<Opportunity> & Pick<Opportunity, 'id' | 'title' | 'state' | 'capacity' | 'deadline'>): Opportunity {
  return {
    type: 'workshop',
    provider: 'Demo Provider (fictional)',
    description: 'Fictional opportunity for the prototype.',
    eligibility: 'Adult visual creatives; no online portfolio required.',
    costLabel: 'Free (demo)',
    dateLabel: 'Date to be confirmed (demo)',
    locationMode: 'In person — Demo Site A (fictional)',
    ownerId: 'council-1',
    nextStep: 'Respond to the place offer; the council confirms arrangements.',
    contactRoute: 'Council contact route (placeholder — not yet approved)',
    cancelReason: null,
    ...overrides,
  };
}

const queueGwen: QueueItem = {
  id: 'queue-gwen',
  deviceRef: 'DEV-A-011',
  coordinatorId: 'coord-a',
  siteId: 'site-a',
  recordId: 'rec-gwen',
  kind: 'correction',
  baseVersion: 1,
  fields: gwenRevised,
  source: SOURCE_A,
  optedIn: false,
  status: 'conflict',
  attempts: 1,
  lastError: 'The council record changed after this was queued. Review the change and resubmit, or discard it.',
  deliveredRecordId: null,
  queuedAt: '2026-10-14T08:30:00.000Z',
};

export function baselineData(): DomainData {
  const records: CreativeRecord[] = [
    record('rec-rhea', rhea, SOURCE_A, application('CCZ-0001', 'verified', 1), {
      personId: 'person-rhea',
      optedIn: true,
    }),
    record('rec-dani', dani, SOURCE_B, application('CCZ-0002', 'verified', 1), { optedIn: true, inviteCode: 'INV-DEMO-DANI' }),
    record('rec-noel', noel, SOURCE_SELF, application('CCZ-0003', 'verified', 1), {
      personId: 'person-noel',
      optedIn: true,
    }),
    record('rec-vina', vina, SOURCE_A, application('CCZ-0004', 'verified', 1), { optedIn: true }),
    record('rec-joel', joel, SOURCE_A, application('CCZ-0005', 'verified', 1), { optedIn: false }),
    record(
      'rec-joel-2',
      joelSecond,
      SOURCE_A,
      application('CCZ-0006', 'under_review', 1, {
        duplicate: { candidateRecordId: 'rec-joel', status: 'open', reason: null },
      }),
      { optedIn: false, approved: false },
    ),
    record(
      'rec-ines',
      ines,
      SOURCE_B,
      application('CCZ-0009', 'received', 1, { receivedAt: '2026-10-24T10:00:00.000Z' }),
      { optedIn: false, approved: false },
    ),
    record('rec-lorenz', lorenz, SOURCE_B, application('CCZ-0007', 'declined', 1, {
      reason: 'Demo reason: this practice is outside the current pilot priority areas (demo assumption).',
    }), { optedIn: false, approved: false }),
    record('rec-gwen', gwen, SOURCE_A, application('CCZ-0008', 'changes_requested', 2, {
      reason: 'Please add one work sample description or link so the council can check your practice.',
    }), { optedIn: false, approved: false }),
  ];

  const drafts: Draft[] = [
    {
      id: 'draft-mika',
      ownerId: 'coord-a',
      recordId: null,
      source: { mode: 'assisted', siteId: 'site-a', coordinatorId: 'coord-a', capturedOn: '2026-10-22' },
      fields: mikaDraft,
      updatedAt: '2026-10-22T09:00:00.000Z',
    },
    {
      id: 'draft-jun',
      ownerId: 'person-jun',
      recordId: null,
      source: SOURCE_SELF,
      fields: junDraft,
      updatedAt: '2026-10-22T11:00:00.000Z',
    },
  ];

  const opportunities: Opportunity[] = [
    opportunity({
      id: CLINIC,
      title: 'Portfolio Feedback Clinic (fictional)',
      type: 'clinic',
      provider: 'Demo Provider — Studio X (fictional)',
      description: 'A two-hour group review of work samples with a visiting illustrator (fictional).',
      costLabel: 'Free (demo)',
      capacity: 3,
      dateLabel: 'Saturday 14 November 2026, 9:00–11:00 (fictional)',
      deadline: '2026-11-10',
      locationMode: 'In person — Demo Site A hall (fictional)',
      state: 'published',
    }),
    opportunity({
      id: PRINT,
      title: 'Print Basics Workshop (fictional)',
      provider: 'Demo Provider — Print Shop (fictional)',
      capacity: 1,
      deadline: '2026-11-20',
      dateLabel: 'Saturday 21 November 2026 (fictional)',
      state: 'published',
    }),
    opportunity({
      id: FILM,
      title: 'Short Film Sound Workshop (fictional)',
      provider: 'Demo Provider — Sound Lab (fictional)',
      capacity: 4,
      deadline: '2026-12-01',
      dateLabel: 'Early December 2026 (fictional)',
      locationMode: 'Hybrid — Demo Site B (fictional)',
      state: 'published',
    }),
    opportunity({
      id: MURAL,
      title: 'Community Mural Day (fictional)',
      type: 'other',
      capacity: 20,
      deadline: '2026-12-15',
      state: 'draft',
    }),
    opportunity({
      id: DIGITAL,
      title: 'Digital Tools Session (fictional)',
      capacity: 3,
      deadline: '2026-10-01',
      dateLabel: 'Late September 2026 (fictional)',
      state: 'closed',
    }),
  ];

  const referrals: Referral[] = [
    referral('ref-0001', 'rec-dani', CLINIC, 'invitation', 'confirmed', '2026-10-15T10:00:00.000Z', 'Arrive 15 minutes early (fictional).'),
    referral('ref-0002', 'rec-vina', PRINT, 'interest', 'confirmed', '2026-10-15T10:05:00.000Z', 'Bring printed samples (fictional).'),
    referral('ref-0003', 'rec-noel', FILM, 'interest', 'interest', '2026-10-16T09:00:00.000Z'),
    referral('ref-0004', 'rec-rhea', FILM, 'invitation', 'offered', '2026-10-16T09:30:00.000Z'),
    referral('ref-0005', 'rec-dani', DIGITAL, 'invitation', 'completed', '2026-09-28T10:00:00.000Z'),
    referral('ref-0006', 'rec-vina', DIGITAL, 'interest', 'did_not_attend', '2026-09-28T10:00:00.000Z'),
    referral('ref-0007', 'rec-rhea', DIGITAL, 'invitation', 'awaiting_follow_up', '2026-09-28T10:00:00.000Z'),
  ];

  const cases: Case[] = [
    {
      id: 'case-0001',
      kind: 'human_review',
      recordId: 'rec-lorenz',
      referralId: null,
      state: 'open',
      reason: 'Please have a person check my practice description before the decision stands.',
      resolution: null,
      openedBy: 'coord-b',
    },
  ];

  return {
    seq: 20,
    sites: [
      { id: 'site-a', code: 'A', name: 'Demo Site A — barangay hall (fictional)', kind: 'barangay' },
      { id: 'site-b', code: 'B', name: 'Demo Site B — school (fictional)', kind: 'school' },
    ],
    staff: [
      { id: 'coord-a', role: 'coordinator', name: 'Demo Coordinator A (fictional)', siteId: 'site-a' },
      { id: 'coord-b', role: 'coordinator', name: 'Demo Coordinator B (fictional)', siteId: 'site-b' },
      { id: 'council-1', role: 'council', name: 'Demo Council Administrator (fictional)', siteId: null },
    ],
    records,
    drafts,
    queue: [queueGwen],
    opportunities,
    referrals,
    cases,
    audit: [],
  };
}

function referral(
  id: string,
  recordId: string,
  opportunityId: string,
  origin: Referral['origin'],
  state: Referral['state'],
  updatedAt: string,
  instructions: string | null = null,
): Referral {
  return { id, recordId, opportunityId, origin, state, reason: null, via: null, instructions, updatedAt };
}

export const SITE_A_ID = 'site-a';
export const OPPORTUNITY_IDS = { CLINIC, PRINT, FILM, MURAL, DIGITAL };
