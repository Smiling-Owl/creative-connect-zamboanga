import { describe, expect, it } from 'vitest';
import { closeOpportunity } from './opportunity';
import { confirmPlace, inviteCreative, offerReferral, recordOutcome, respondToOffer, startReferralReview } from './referral';
import { ctxFor, fresh } from '../test/helpers';
import type { DomainData } from './types';

function step<T extends { ok: boolean }>(result: T): T & { ok: true } {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as T & { ok: true };
}

describe('closed and cancelled opportunities accept no new offers or confirmations', () => {
  it('an interest in a closed opportunity cannot be offered', () => {
    const closed: DomainData = step(closeOpportunity(fresh(), ctxFor('council'), { id: 'opp-film' })).data;
    const result = offerReferral(closed, ctxFor('council'), 'ref-0003');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('opportunity_closed');
  });

  it('review cannot start on a closed opportunity either', () => {
    const closed: DomainData = step(closeOpportunity(fresh(), ctxFor('council'), { id: 'opp-film' })).data;
    expect(startReferralReview(closed, ctxFor('council'), 'ref-0003').ok).toBe(false);
  });

  it('a place accepted before the opportunity closes cannot be confirmed afterwards', () => {
    let data: DomainData = step(inviteCreative(fresh(), ctxFor('council'), { recordId: 'rec-noel', opportunityId: 'opp-clinic' })).data;
    const id = data.referrals.find((r) => r.recordId === 'rec-noel' && r.opportunityId === 'opp-clinic')!.id;
    data = step(respondToOffer(data, ctxFor('noel'), { referralId: id, response: 'accept' })).data;
    data = step(closeOpportunity(data, ctxFor('council'), { id: 'opp-clinic' })).data;
    const result = confirmPlace(data, ctxFor('council'), { referralId: id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('opportunity_closed');
  });

  it('recording an outcome on a closed opportunity still works, because the event happened', () => {
    const data: DomainData = fresh();
    const result = recordOutcome(data, ctxFor('council'), { referralId: 'ref-0007', outcome: 'completed' });
    expect(result.ok).toBe(true);
  });
});
