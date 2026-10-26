import { describe, expect, it } from 'vitest';
import { baselineData } from '../fixtures/baseline';
import { PERSONAS } from '../fixtures/personas';
import { GUIDANCE, GUIDANCE_DISCLAIMER } from '../fixtures/guidance';
import { councilCounts, opportunityCapacity } from './selectors';
import { publicDirectory } from './publicProfile';
import { CAPACITY_STATES } from './referral';

// Baseline data must satisfy the same invariants the transitions enforce.
describe('baseline fixtures', () => {
  const data = baselineData();

  it('keeps every referral within capacity', () => {
    for (const opp of data.opportunities) {
      const view = opportunityCapacity(data, opp.id)!;
      expect(view.used).toBeLessThanOrEqual(opp.capacity);
    }
  });

  it('has at most one referral per creative and opportunity', () => {
    const pairs = data.referrals.map((r) => `${r.recordId}|${r.opportunityId}`);
    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('references only records and opportunities that exist', () => {
    const recordIds = new Set(data.records.map((r) => r.id));
    const oppIds = new Set(data.opportunities.map((o) => o.id));
    for (const ref of data.referrals) {
      expect(recordIds.has(ref.recordId)).toBe(true);
      expect(oppIds.has(ref.opportunityId)).toBe(true);
    }
    for (const item of data.queue) {
      if (item.recordId) expect(recordIds.has(item.recordId)).toBe(true);
    }
  });

  it('lists exactly the verified, opted-in, approved records', () => {
    expect(publicDirectory(data).map((p) => p.id).sort()).toEqual(['rec-dani', 'rec-noel', 'rec-rhea', 'rec-vina']);
    expect(councilCounts(data).verifiedNotListed).toBe(1);
  });

  it('has no unexplained flags: the only open duplicate is the Joel Tan pair', () => {
    const open = data.records.filter((r) => r.application.duplicate?.status === 'open');
    expect(open.map((r) => r.id)).toEqual(['rec-joel-2']);
  });

  it('queued items are outside the council view: only the received record Ines counts', () => {
    const counts = councilCounts(data);
    expect(counts.received).toBe(1);
    expect(data.queue.every((q) => q.status !== 'delivered')).toBe(true);
  });

  it('has one known queue conflict and no stale waiting correction', () => {
    expect(data.queue.filter((q) => q.status === 'conflict').map((q) => q.id)).toEqual(['queue-gwen']);
  });

  it('gives every guidance card a source label, a review date, and no legal-advice claim', () => {
    for (const card of GUIDANCE) {
      expect(card.sourceLabel).toMatch(/Example source/);
      expect(card.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(GUIDANCE_DISCLAIMER).toMatch(/not legal advice/);
  });

  it('uses only fictional, labeled people and places', () => {
    const names = data.records.map((r) => r.intake.displayName);
    for (const name of names) expect(name).toMatch(/\(demo\)$/);
    for (const opp of data.opportunities) expect(opp.title + opp.provider).toMatch(/fictional|Demo/);
  });

  it('gives every persona a fixture-consistent site or record', () => {
    for (const persona of PERSONAS) {
      if (persona.actor.role === 'coordinator') {
        expect(data.staff.find((s) => s.id === persona.actor.id)?.siteId).toBe(persona.actor.siteId);
      }
    }
  });

  it('keeps capacity-consuming states consistent with the rule', () => {
    expect(CAPACITY_STATES).toEqual(['confirmed', 'completed', 'did_not_attend', 'awaiting_follow_up']);
  });
});
