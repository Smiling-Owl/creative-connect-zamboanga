import { describe, expect, it } from 'vitest';
import { councilCounts, councilFunnel, councilQueue, creativeNextAction, creativeView, noticesFor, opportunityCapacity } from './selectors';
import { searchDirectory } from './publicProfile';
import { ctxFor, fresh } from '../test/helpers';
import type { Actor } from './types';

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

describe('council funnel', () => {
  it('every stage states its base, and the base is the previous stage it depends on', () => {
    const stages = councilFunnel(fresh());
    expect(stages.length).toBeGreaterThan(0);
    for (const stage of stages) {
      expect(stage.baseLabel.length).toBeGreaterThan(0);
      expect(stage.count).toBeLessThanOrEqual(stage.base);
    }
  });

  it('shows an empty base as zero rather than dividing by it', () => {
    const data = fresh();
    const emptied = { ...data, records: [], referrals: [] };
    const stages = councilFunnel(emptied);
    expect(stages.every((s) => s.count === 0 && s.base === 0)).toBe(true);
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
    expect(councilFunnel(linked)[0]?.count).toBe((councilFunnel(data)[0]?.count ?? 0) - 1);
    expect(linked.referrals).toHaveLength(data.referrals.length);
  });

  it('keeps linked-alias referrals in referral and capacity totals while deduplicating person funnel counts', () => {
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
    expect(councilFunnel(linked).find((stage) => stage.label === 'Referred to an opportunity')?.count).toBe((councilFunnel(data).find((stage) => stage.label === 'Referred to an opportunity')?.count ?? 0) + 1);
    expect(councilFunnel(linked).find((stage) => stage.label === 'Attended or completed')?.count).toBe((councilFunnel(data).find((stage) => stage.label === 'Attended or completed')?.count ?? 0) + 1);
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
    expect(noticesFor({ ...data, audit: [event] }, ctxFor('coord-a').actor)[0]?.text).toBe('A place offer is waiting for a response.');
    expect(noticesFor({ ...data, audit: [event] }, ctxFor('coord-b').actor)).toEqual([]);
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
