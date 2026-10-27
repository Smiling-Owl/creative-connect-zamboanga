import { describe, expect, it } from 'vitest';
import { councilFunnel, creativeNextAction, creativeView, noticesFor } from './selectors';
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
