import { describe, expect, it } from 'vitest';
import { coordinatorWorkspace, councilCounts, councilOverview, councilQueue, creativeNextAction, creativeView, isOverdue, linkedDuplicateCount, noticesFor, opportunityCapacity, opportunityReferralCounts, opportunityReferralRoster, verifiedReferralCandidates } from './selectors';
import { searchDirectory } from './publicProfile';
import { markNotSelected, recordOutcome } from './referral';
import { openCase, resolveCase } from './cases';
import { ctxFor, fresh, ORIGIN } from '../test/helpers';
import type { Actor, AuditEvent, DomainData } from './types';

describe('creative next action', () => {
  it('a person with no record is invited to start registration', () => {
    const data = fresh();
    const view = creativeView(data, 'person-nobody');
    expect(creativeNextAction(view).title).toBe('Start your registration');
  });

  it('a verified creative with an open offer is asked to respond, not told they have a place', () => {
    const data = fresh();
    const next = creativeNextAction(creativeView(data, 'person-rhea'));
    expect(next.title).toBe('Respond to a place offer');
    expect(next.detail).not.toMatch(/guarantee|confirmed place|hired/i);
  });

  it('a verified creative with no open items sees a profile check', () => {
    const data = fresh();
    expect(creativeNextAction(creativeView(data, 'person-noel')).title).toBe('Check your profile is current');
  });
});

describe('opportunity referral workspace selectors', () => {
  it('includes private verified records, excludes linked aliases, and sorts candidates alphabetically', () => {
    const data = fresh();
    const aliased = { ...data, records: data.records.map((record) => record.id === 'rec-joel-2'
      ? { ...record, application: { ...record.application, duplicate: { candidateRecordId: 'rec-joel', status: 'linked' as const, reason: 'Same fictional person.' } } }
      : record) };
    const candidates = verifiedReferralCandidates(aliased, 'opp-clinic');
    expect(candidates.some((item) => item.record.id === 'rec-joel')).toBe(true);
    expect(candidates.some((item) => item.record.id === 'rec-joel-2')).toBe(false);
    expect(candidates.map((item) => item.record.intake.displayName)).toEqual([...candidates.map((item) => item.record.intake.displayName)].sort((a, b) => a.localeCompare(b)));
  });

  it('groups roster rows and counts all retained referral entities', () => {
    const data = fresh();
    const roster = opportunityReferralRoster(data, 'opp-film');
    const counts = opportunityReferralCounts(data, 'opp-film');
    expect(roster.offered.map((item) => item.id)).toContain('ref-0004');
    expect(counts.offered).toBe(roster.offered.length);
  });
});

describe('received-only council records', () => {
  it('excludes drafts and non-new states from the new queue, and separates received-record search', () => {
    const data = fresh();
    expect(councilQueue(data).map((record) => record.id)).toEqual(['rec-ines']);
    expect(councilQueue(data, 'resubmitted')).toEqual([]);
    expect(councilQueue(data, 'records')).toHaveLength(data.records.length);
    expect(councilQueue(data, 'records').some((record) => record.id === 'draft-mika')).toBe(false);
  });

  it('excludes linked aliases from aggregate record counts while retaining separate records and referrals', () => {
    const data = fresh();
    const records = data.records.map((record) => {
      if (record.id !== 'rec-joel-2') return record;
      return { ...record, application: { ...record.application, duplicate: { candidateRecordId: 'rec-joel', status: 'linked' as const, reason: 'Same record (demo).' } } };
    });
    const linked = { ...data, records };
    expect(councilQueue(linked, 'records').find((record) => record.id === 'rec-joel-2')).toBeDefined();
    expect(councilCounts(linked).underReview).toBe(councilCounts(data).underReview - 1);
    expect(councilOverview(linked, ORIGIN).receivedBase).toBe(councilOverview(data, ORIGIN).receivedBase - 1);
    expect(linked.referrals).toHaveLength(data.referrals.length);
  });

  it('keeps linked-alias referrals in referral, capacity, and cumulative totals, since each referral holds its own place', () => {
    const data = fresh();
    const base = data.referrals.find((item) => item.opportunityId === 'opp-clinic')!;
    const keeperReferral = { ...base, id: 'ref-linked-keeper', recordId: 'rec-joel', state: 'completed' as const };
    const aliasReferral = { ...base, id: 'ref-linked-alias', recordId: 'rec-joel-2', state: 'completed' as const };
    const record = data.records.find((item) => item.id === 'rec-joel-2')!;
    const linked = {
      ...data,
      referrals: [...data.referrals, keeperReferral, aliasReferral],
      records: data.records.map((item) => item.id === record.id ? { ...item, application: { ...item.application, duplicate: { candidateRecordId: 'rec-joel', status: 'linked' as const, reason: 'Same fictional person.' } } } : item),
    };
    expect(councilCounts(linked).referrals.completed).toBe(councilCounts(data).referrals.completed + 2);
    expect(opportunityCapacity(linked, 'opp-clinic')?.used).toBe((opportunityCapacity(data, 'opp-clinic')?.used ?? 0) + 2);
    const before = councilOverview(data, ORIGIN);
    const after = councilOverview(linked, ORIGIN);
    expect(after.referrals.cumulative.initiated).toBe(before.referrals.cumulative.initiated + 2);
    expect(after.referrals.cumulative.attended).toBe(before.referrals.cumulative.attended + 2);
  });
});

describe('in-app notices are scoped to the persona', () => {
  it('a creative sees only events about their own record', () => {
    const data = fresh();
    const actor: Actor = ctxFor('rhea').actor;
    const notices = noticesFor(
      { ...data, audit: [{ id: 'evt-1', at: '2026-10-26T09:00:00.000Z', actor: { role: 'council', id: 'council-1' }, via: null, entityType: 'record', entityId: 'rec-noel', action: 'verified', from: null, to: 'verified', reason: null }] },
      actor,
    );
    expect(notices).toEqual([]);
  });

  it('a council administrator sees the review activity written in plain words', () => {
    const data = fresh();
    const withEvent = {
      ...data,
      audit: [{ id: 'evt-2', at: '2026-10-26T09:00:00.000Z', actor: { role: 'council' as const, id: 'council-1' }, via: null, entityType: 'record' as const, entityId: 'rec-ines', action: 'review_started', from: 'received', to: 'under_review', reason: null }],
    };
    expect(noticesFor(withEvent, ctxFor('council').actor).map((n) => n.text)).toEqual(['Council review has started.']);
  });

  it('a coordinator sees an offer notice only for a referral assigned to their site', () => {
    const data = fresh();
    const event = { id: 'evt-offer', at: '2026-10-26T09:00:00.000Z', actor: { role: 'council' as const, id: 'council-1' }, via: null, entityType: 'referral' as const, entityId: 'ref-0004', action: 'state_changed', from: 'under_review', to: 'offered', reason: null };
    expect(noticesFor({ ...data, audit: [event] }, ctxFor('coord-a').actor)[0]?.text).toBe('The council offered a place for Short Film Sound Workshop (fictional). Review the details and respond.');
    expect(noticesFor({ ...data, audit: [event] }, ctxFor('coord-b').actor)).toEqual([]);
  });

  it('a referral created by invitation is described as a place offer, not as an opportunity event', () => {
    const data = fresh();
    const event = { id: 'evt-created', at: '2026-10-26T09:00:00.000Z', actor: { role: 'council' as const, id: 'council-1' }, via: null, entityType: 'referral' as const, entityId: 'ref-0004', action: 'created', from: null, to: 'offered', reason: null };
    const [notice] = noticesFor({ ...data, audit: [event] }, ctxFor('council').actor);
    expect(notice?.text).not.toMatch(/opportunity was created/i);
    expect(notice?.text).toMatch(/place/i);
  });

  it('each persona notice links to a route they can open, scoped to the related record or referral', () => {
    const data = fresh();
    const event = { id: 'evt-link', at: '2026-10-26T09:00:00.000Z', actor: { role: 'council' as const, id: 'council-1' }, via: null, entityType: 'referral' as const, entityId: 'ref-0004', action: 'state_changed', from: 'under_review', to: 'offered', reason: null };
    const scoped = { ...data, audit: [event] };
    expect(noticesFor(scoped, ctxFor('rhea').actor)[0]?.to).toBe('/me/referrals');
    expect(noticesFor(scoped, ctxFor('coord-a').actor)[0]?.to).toBe('/coordinator/records/rec-rhea');
    expect(noticesFor(scoped, ctxFor('council').actor)[0]?.to).toBe('/council/referrals/opp-film');
  });
});

describe('council overview', () => {
  const at = ORIGIN;
  const auditEvent = (index: number, entityType: AuditEvent['entityType'], entityId: string, action: string, minute: number): AuditEvent => ({
    id: `evt-test-${index}`,
    at: new Date(Date.parse(ORIGIN) + minute * 60_000).toISOString(),
    actor: { role: 'council', id: 'council-1' },
    via: null,
    entityType,
    entityId,
    action,
    from: null,
    to: null,
    reason: null,
  });

  it('baseline values come from the fixtures: received, verification, referral stages, and exceptions', () => {
    const overview = councilOverview(fresh(), at);
    expect(overview.receivedBase).toBe(9);
    expect(overview.referralBase).toBe(7);
    expect(overview.recordsByState).toEqual({ received: 1, under_review: 1, changes_requested: 1, declined: 1, verified: 5 });
    expect(overview.counts.listed).toBe(4);
    expect(overview.counts.verifiedNotListed).toBe(1);
    expect(overview.pending).toEqual({ new: 1, resubmitted: 0, underReview: 1, profileUpdates: 0, openCases: 1, overdue: 1 });
    expect(overview.referrals.cumulative).toEqual({ initiated: 7, offered: 6, accepted: 5, confirmed: 5, attended: 1 });
    expect(overview.referrals.current.confirmed).toBe(2);
    expect(overview.referrals.exceptions).toEqual({ not_selected: 0, declined: 0, cancelled: 0, did_not_attend: 1, awaiting_follow_up: 1 });
    expect(noticesFor(fresh(), ctxFor('council').actor)).toEqual([]);
  });

  it('denominators are the received records and referrals, and coverage rows add up to the base', () => {
    const overview = councilOverview(fresh(), at);
    expect(overview.siteCoverage.map((row) => row.count)).toEqual([5, 3, 1]);
    expect(overview.siteCoverage.reduce((sum, row) => sum + row.count, 0)).toBe(overview.receivedBase);
    expect(overview.sourceCoverage.map((row) => row.count)).toEqual([8, 1]);
    expect(overview.sourceCoverage.every((row) => row.base === overview.receivedBase)).toBe(true);
  });

  it('queued device items are excluded from every council number and from the activity list', () => {
    const data = fresh();
    const withDeviceItems: DomainData = {
      ...data,
      queue: [
        ...data.queue,
        { ...data.queue[0]!, id: 'queue-only', status: 'waiting', recordId: null, kind: 'new_application', deliveredRecordId: null, lastError: null, attempts: 0, fields: { ...data.queue[0]!.fields, displayName: 'Queued only (fictional)' } },
      ],
      audit: [auditEvent(1, 'queue', 'queue-only', 'send_failed', 3)],
    };
    const overview = councilOverview(withDeviceItems, at);
    expect(overview).toEqual(councilOverview(data, at));
    expect(JSON.stringify(overview)).not.toContain('Queued only');
  });

  it('a duplicate-linked alias is counted once in record totals, coverage, and state counts', () => {
    const data = fresh();
    const linked: DomainData = {
      ...data,
      records: data.records.map((record) => record.id === 'rec-joel-2'
        ? { ...record, application: { ...record.application, duplicate: { candidateRecordId: 'rec-joel', status: 'linked' as const, reason: 'Same record (demo).' } } }
        : record),
    };
    const before = councilOverview(data, at);
    const after = councilOverview(linked, at);
    expect(after.receivedBase).toBe(before.receivedBase - 1);
    expect(after.siteCoverage[0]?.count).toBe((before.siteCoverage[0]?.count ?? 0) - 1);
    expect(after.recordsByState.under_review).toBe(before.recordsByState.under_review - 1);
    expect(after.referralBase).toBe(before.referralBase);
  });

  it('after confirmed becomes completed, cumulative confirmed stays and current confirmed decreases', () => {
    const data = fresh();
    const before = councilOverview(data, at);
    const result = recordOutcome(data, ctxFor('council', {}, '2026-10-27T09:00:00.000Z'), { referralId: 'ref-0001', outcome: 'completed' });
    expect(result.ok).toBe(true);
    const after = councilOverview(result.ok ? result.data : data, '2026-10-27T09:00:00.000Z');
    expect(after.referrals.current.confirmed).toBe(before.referrals.current.confirmed - 1);
    expect(after.referrals.current.completed).toBe(before.referrals.current.completed + 1);
    expect(after.referrals.cumulative.confirmed).toBe(before.referrals.cumulative.confirmed);
    expect(after.referrals.cumulative.attended).toBe(before.referrals.cumulative.attended + 1);
  });

  it('a referral that was never offered does not enter the cumulative offered stage when it is not selected', () => {
    const data = fresh();
    const before = councilOverview(data, at);
    const result = markNotSelected(data, ctxFor('council'), { referralId: 'ref-0003', reason: 'Not selected in this round (fictional).' });
    expect(result.ok).toBe(true);
    const after = councilOverview(result.ok ? result.data : data, at);
    expect(after.referrals.current.not_selected).toBe(1);
    expect(after.referrals.exceptions.not_selected).toBe(1);
    expect(after.referrals.cumulative.offered).toBe(before.referrals.cumulative.offered);
    expect(after.referrals.cumulative.initiated).toBe(before.referrals.cumulative.initiated);
  });

  it('an empty dataset has zero bases and no NaN or Infinity anywhere in the overview', () => {
    const empty: DomainData = { ...fresh(), records: [], referrals: [], opportunities: [], cases: [], queue: [], drafts: [], audit: [] };
    const overview = councilOverview(empty, at);
    expect(overview.receivedBase).toBe(0);
    expect(overview.referralBase).toBe(0);
    expect(overview.siteCoverage.every((row) => row.base === 0 && row.count === 0)).toBe(true);
    expect(overview.sourceCoverage.every((row) => row.base === 0 && row.count === 0)).toBe(true);
    expect(JSON.stringify(overview)).not.toMatch(/NaN|Infinity/);
  });

  it('a received application becomes overdue only after five demo days awaiting review', () => {
    const data = fresh();
    expect(councilOverview(data, '2026-10-15T09:59:00.000Z').pending.overdue).toBe(0);
    expect(councilOverview(data, '2026-10-15T10:00:00.000Z').pending.overdue).toBe(1);
  });

  it('the shared overdue rule matches the queue marker and excludes verified profile updates', () => {
    const data = fresh();
    const joelSecond = data.records.find((record) => record.id === 'rec-joel-2')!;
    const verifiedUpdate = data.records.find((record) => record.id === 'rec-rhea')!;
    const update = { ...verifiedUpdate, application: { ...verifiedUpdate.application, updatePending: true } };
    expect(isOverdue(data, joelSecond, '2026-10-15T10:00:00.000Z')).toBe(true);
    expect(isOverdue(data, joelSecond, '2026-10-15T09:59:00.000Z')).toBe(false);
    expect(isOverdue({ ...data, records: [update] }, update, '2026-12-31T00:00:00.000Z')).toBe(false);
  });

  it('overdue for a resubmitted record is measured from the latest resubmission, not the original receipt', () => {
    const data = fresh();
    const joelSecond = data.records.find((record) => record.id === 'rec-joel-2')!;
    const resubmitted = { ...data, audit: [auditEvent(1, 'record', 'rec-joel-2', 'resubmitted', 0)] };
    const resubmittedAt = resubmitted.audit[0]!.at;
    const fourDaysLater = new Date(Date.parse(resubmittedAt) + 4 * 86_400_000).toISOString();
    const fiveDaysLater = new Date(Date.parse(resubmittedAt) + 5 * 86_400_000).toISOString();
    expect(isOverdue(resubmitted, joelSecond, fourDaysLater)).toBe(false);
    expect(isOverdue(resubmitted, joelSecond, fiveDaysLater)).toBe(true);
    // Ines (received 2026-10-24) is also overdue by then; only the resubmitted record should drop out of the count.
    expect(councilOverview(resubmitted, fourDaysLater).pending.overdue).toBe(councilOverview(data, fourDaysLater).pending.overdue - 1);
  });

  it('counts linked duplicate records so the records tab can reconcile with the overview', () => {
    const data = fresh();
    expect(linkedDuplicateCount(data)).toBe(0);
    const linked = { ...data, records: data.records.map((record) => record.id === 'rec-joel-2' ? { ...record, application: { ...record.application, duplicate: { candidateRecordId: 'rec-joel', status: 'linked' as const, reason: 'Same record (demo).' } } } : record) };
    expect(linkedDuplicateCount(linked)).toBe(1);
  });

  it('a cumulative attended stage drops a completed outcome that a resolved correction moved to did-not-attend, but keeps confirmed', () => {
    const start = fresh();
    const later = '2026-10-27T09:00:00.000Z';
    const before = councilOverview(start, later);
    const completed = recordOutcome(start, ctxFor('council', {}, later), { referralId: 'ref-0001', outcome: 'completed' });
    expect(completed.ok).toBe(true);
    if (!completed.ok) return;
    expect(councilOverview(completed.data, later).referrals.cumulative.attended).toBe(before.referrals.cumulative.attended + 1);
    const opened = openCase(completed.data, ctxFor('coord-b', {}, later), { kind: 'outcome_correction', recordId: 'rec-dani', referralId: 'ref-0001', reason: 'The outcome was recorded in error (fictional).', personAgreed: true });
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const corrected = resolveCase(opened.data, ctxFor('council', {}, later), { caseId: opened.id!, resolution: 'Corrected after review (fictional).', newOutcome: 'did_not_attend' });
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) return;
    const after = councilOverview(corrected.data, later);
    expect(corrected.data.referrals.find((item) => item.id === 'ref-0001')?.state).toBe('did_not_attend');
    expect(after.referrals.cumulative.attended).toBe(before.referrals.cumulative.attended);
    expect(after.referrals.cumulative.confirmed).toBe(before.referrals.cumulative.confirmed);
  });

  it('recent activity shows the ten most recent council-visible events, newest first, without queue or draft events', () => {
    const data = fresh();
    const events: AuditEvent[] = [];
    for (let index = 1; index <= 12; index += 1) events.push(auditEvent(index, 'record', 'rec-ines', 'review_started', index));
    events.push(auditEvent(13, 'queue', 'queue-gwen', 'delivered', 13));
    events.push(auditEvent(14, 'draft', 'draft-mika', 'saved', 14));
    const activity = noticesFor({ ...data, audit: events }, ctxFor('council').actor, 10);
    expect(activity).toHaveLength(10);
    expect(activity.map((item) => item.id)[0]).toBe('evt-test-12');
    expect(activity.map((item) => item.id)[9]).toBe('evt-test-3');
    expect(activity.some((item) => item.id === 'evt-test-13' || item.id === 'evt-test-14')).toBe(false);
  });
});

describe('device-side events and new council decision notices', () => {
  const stamp = '2026-10-26T09:00:00.000Z';

  it('queue and draft events never produce notices, even when their action has a sentence', () => {
    const data = fresh();
    const queueEvent = { id: 'evt-q', at: stamp, actor: { role: 'coordinator' as const, id: 'coord-a' }, via: 'coord-a', entityType: 'queue' as const, entityId: 'queue-gwen', action: 'received', from: null, to: 'delivered', reason: null };
    const draftEvent = { ...queueEvent, id: 'evt-d', entityType: 'draft' as const, entityId: 'draft-mika', action: 'opened' };
    const scoped = { ...data, audit: [queueEvent, draftEvent] };
    expect(noticesFor(scoped, ctxFor('council').actor)).toEqual([]);
    expect(noticesFor(scoped, ctxFor('coord-a').actor)).toEqual([]);
    expect(noticesFor(scoped, ctxFor('rhea').actor)).toEqual([]);
  });

  it('public-content changes, kept declines, and reopened reviews read in plain words and carry the council reason', () => {
    const data = fresh();
    const events = [
      { id: 'evt-pc', at: stamp, actor: { role: 'council' as const, id: 'council-1' }, via: null, entityType: 'record' as const, entityId: 'rec-rhea', action: 'public_content_changes_requested', from: 'under_review', to: 'update_pending', reason: 'Please update the sample description (fictional).' },
      { id: 'evt-du', at: stamp, actor: { role: 'council' as const, id: 'council-1' }, via: null, entityType: 'record' as const, entityId: 'rec-lorenz', action: 'decline_upheld', from: 'declined', to: 'declined', reason: 'Reviewed; the decision stands (fictional).' },
      { id: 'evt-ro', at: stamp, actor: { role: 'council' as const, id: 'council-1' }, via: null, entityType: 'record' as const, entityId: 'rec-lorenz', action: 'review_reopened', from: 'declined', to: 'under_review', reason: 'Reopened for a person to check (fictional).' },
    ];
    const scoped = { ...data, audit: events };
    const councilTexts = noticesFor(scoped, ctxFor('council').actor).map((notice) => notice.text);
    expect(councilTexts).toEqual([
      'The council reopened review after a human-review request: Reopened for a person to check (fictional).',
      'The council kept the decision after a human review: Reviewed; the decision stands (fictional).',
      'The council asked for changes to public profile content: Please update the sample description (fictional).',
    ]);
    expect(noticesFor(scoped, ctxFor('rhea').actor).map((notice) => notice.text)).toEqual([
      'The council asked for changes to public profile content: Please update the sample description (fictional).',
    ]);
  });
});

describe('coordinator device counts', () => {
  it('counts only this coordinator device items that the council has not received', () => {
    const data = fresh();
    expect(coordinatorWorkspace(data, ctxFor('coord-a').actor).notReceived).toBe(1);
    expect(coordinatorWorkspace(data, ctxFor('coord-b').actor).notReceived).toBe(0);
    const delivered = { ...data, queue: data.queue.map((item) => ({ ...item, status: 'delivered' as const })) };
    expect(coordinatorWorkspace(delivered, ctxFor('coord-a').actor).notReceived).toBe(0);
  });
});

describe('directory search', () => {
  it('filters by practice and area, and matches skills in the query', () => {
    const data = fresh();
    expect(searchDirectory(data, { practice: 'Crafts' }).map((p) => p.id)).toEqual(['rec-vina']);
    expect(searchDirectory(data, { query: 'watercolor' }).map((p) => p.id)).toEqual(['rec-dani']);
    expect(searchDirectory(data, { area: 'Area 9' })).toEqual([]);
  });

  it('never returns a private verified record', () => {
    const data = fresh();
    expect(searchDirectory(data, { query: 'Joel' })).toEqual([]);
  });
});
