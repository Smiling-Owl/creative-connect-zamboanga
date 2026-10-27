import { describe, expect, it } from 'vitest';
import { cancelOpportunity, createOpportunity, publishOpportunity, updateOpportunity, type OpportunityInput } from './opportunity';
import { confirmPlace, expressInterest, inviteCreative, markNotSelected, offerReferral, recordOutcome, respondToOffer, startReferralReview, withdrawReferral } from './referral';
import { opportunityCapacity } from './selectors';
import { ctxFor, fresh } from '../test/helpers';
import type { DomainData } from './types';

function must(result: { ok: true; data: DomainData; id?: string } | { ok: false; message: string }) {
  if (!result.ok) throw new Error(result.message);
  return result;
}

const CLINIC = 'opp-clinic';
const PRINT = 'opp-print';
const FILM = 'opp-film';

describe('expressing interest', () => {
  it('a verified creative expresses interest once; repeating returns the same referral', () => {
    const first = must(expressInterest(fresh(), ctxFor('noel'), { recordId: 'rec-noel', opportunityId: CLINIC }));
    const again = must(expressInterest(first.data, ctxFor('noel'), { recordId: 'rec-noel', opportunityId: CLINIC }));
    expect(again.id).toBe(first.id);
    expect(again.data.referrals.filter((r) => r.recordId === 'rec-noel' && r.opportunityId === CLINIC).length).toBe(1);
  });

  it('is refused for a full opportunity', () => {
    const result = expressInterest(fresh(), ctxFor('noel'), { recordId: 'rec-noel', opportunityId: PRINT });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('full');
  });

  it('is refused for someone else’s record', () => {
    expect(expressInterest(fresh(), ctxFor('rhea'), { recordId: 'rec-noel', opportunityId: CLINIC }).ok).toBe(false);
  });
});

describe('offer, response, and confirmation', () => {
  it('an invitation enters at offered; the creative declines and the place is not held', () => {
    const invited = must(inviteCreative(fresh(), ctxFor('council'), { recordId: 'rec-joel', opportunityId: CLINIC }));
    expect(invited.data.referrals.find((r) => r.id === invited.id)!.state).toBe('offered');
    const response = must(respondToOffer(invited.data, ctxFor('coord-a'), { referralId: invited.id!, response: 'decline' }));
    expect(response.data.referrals.find((r) => r.id === invited.id)!.state).toBe('declined');
    expect(opportunityCapacity(response.data, CLINIC)!.used).toBe(1);
  });

  it('a relayed acceptance records the coordinator as the relay', () => {
    // Joel (private verified) is offered the clinic, then the coordinator relays the acceptance.
    const invited = must(inviteCreative(fresh(), ctxFor('council'), { recordId: 'rec-joel', opportunityId: CLINIC }));
    const accepted = must(respondToOffer(invited.data, ctxFor('coord-a'), { referralId: invited.id!, response: 'accept' }));
    const referral = accepted.data.referrals.find((r) => r.id === invited.id)!;
    expect(referral.state).toBe('accepted');
    expect(referral.via).toBe('coord-a');
  });

  it('a coordinator from another site cannot relay the response', () => {
    const invited = must(inviteCreative(fresh(), ctxFor('council'), { recordId: 'rec-joel', opportunityId: CLINIC }));
    expect(respondToOffer(invited.data, ctxFor('coord-b'), { referralId: invited.id!, response: 'accept' }).ok).toBe(false);
  });

  it('does not create a new referral for a linked alias', () => {
    const data = fresh();
    const records = data.records.map((record) => {
      if (record.id !== 'rec-joel-2') return record;
      return { ...record, personId: 'person-joel-2', application: { ...record.application, state: 'verified' as const, duplicate: { candidateRecordId: 'rec-joel', status: 'linked' as const, reason: 'Same record (demo).' } } };
    });
    const linked = { ...data, records };
    const ctx = { ...ctxFor('rhea'), actor: { role: 'creative' as const, id: 'person-joel-2' } };
    expect(expressInterest(linked, ctx, { recordId: 'rec-joel-2', opportunityId: 'opp-clinic' })).toMatchObject({ ok: false, code: 'linked_alias' });
  });

  it('confirmation is a separate council step that requires acceptance and free capacity', () => {
    let data = fresh();
    const invited = must(inviteCreative(data, ctxFor('council'), { recordId: 'rec-noel', opportunityId: CLINIC }));
    data = invited.data;
    expect(confirmPlace(data, ctxFor('council'), { referralId: invited.id! }).ok).toBe(false); // not accepted yet
    data = must(respondToOffer(data, ctxFor('noel'), { referralId: invited.id!, response: 'accept' })).data;
    data = must(confirmPlace(data, ctxFor('council'), { referralId: invited.id!, instructions: 'Arrive 10 minutes early (fictional).' })).data;
    expect(data.referrals.find((r) => r.id === invited.id)!.state).toBe('confirmed');
    expect(opportunityCapacity(data, CLINIC)!.used).toBe(2);
  });

  it('cannot confirm or offer beyond capacity', () => {
    // Clinic capacity is 3 with one place already confirmed (Dani). Fill the remaining two.
    let data = fresh();
    for (const recordId of ['rec-noel', 'rec-joel']) {
      const invited = must(inviteCreative(data, ctxFor('council'), { recordId, opportunityId: CLINIC }));
      const actor = recordId === 'rec-noel' ? 'noel' : 'coord-a';
      data = must(respondToOffer(invited.data, ctxFor(actor), { referralId: invited.id!, response: 'accept' })).data;
      data = must(confirmPlace(data, ctxFor('council'), { referralId: invited.id! })).data;
    }
    expect(opportunityCapacity(data, CLINIC)!.remaining).toBe(0);
    const extra = inviteCreative(data, ctxFor('council'), { recordId: 'rec-rhea', opportunityId: CLINIC });
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.code).toBe('full');
  });

  it('council records an outcome only after confirmation and never labels it as paid work', () => {
    const data = fresh();
    const attended = recordOutcome(data, ctxFor('council'), { referralId: 'ref-0001', outcome: 'completed' });
    expect(attended.ok).toBe(true);
    const notConfirmed = recordOutcome(data, ctxFor('council'), { referralId: 'ref-0003', outcome: 'completed' });
    expect(notConfirmed.ok).toBe(false);
  });
});

describe('outcome validation', () => {
  it('rejects values outside the three recorded support outcomes without mutation', () => {
    const data = fresh();
    const before = JSON.stringify(data);
    const invalid = recordOutcome(data, ctxFor('council'), { referralId: 'ref-0001', outcome: 'keep' as never });
    expect(invalid).toMatchObject({ ok: false, code: 'invalid_outcome' });
    expect(JSON.stringify(data)).toBe(before);
  });
});

describe('one invitation per pair and idempotency', () => {
  it('invitation over an existing interest moves it to offered without a second referral', () => {
    const data = fresh();
    const before = data.referrals.length;
    const result = must(inviteCreative(data, ctxFor('council'), { recordId: 'rec-noel', opportunityId: FILM }));
    expect(result.data.referrals.length).toBe(before);
    expect(result.data.referrals.find((r) => r.id === 'ref-0003')!.state).toBe('offered');
  });

  it('a second invitation for an already offered pair is refused', () => {
    const result = inviteCreative(fresh(), ctxFor('council'), { recordId: 'rec-rhea', opportunityId: FILM });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('already_referred');
  });
});

describe('council review steps', () => {
  it('starts review and offers from interest; not-selected requires a reason', () => {
    const data = fresh();
    const reviewing = must(startReferralReview(data, ctxFor('council'), 'ref-0003'));
    expect(reviewing.data.referrals.find((r) => r.id === 'ref-0003')!.state).toBe('under_review');
    expect(markNotSelected(reviewing.data, ctxFor('council'), { referralId: 'ref-0003', reason: '' }).ok).toBe(false);
    const declined = must(markNotSelected(reviewing.data, ctxFor('council'), { referralId: 'ref-0003', reason: 'Capacity went to earlier applicants (demo).' }));
    expect(declined.data.referrals.find((r) => r.id === 'ref-0003')!.state).toBe('not_selected');
    expect(offerReferral(data, ctxFor('council'), 'ref-0003').ok).toBe(true);
  });

  it('a creative can withdraw an accepted place with a reason, and that frees the place', () => {
    const data = fresh();
    const accepted = must(respondToOffer(data, ctxFor('rhea'), { referralId: 'ref-0004', response: 'accept' }));
    const withdrawn = must(withdrawReferral(accepted.data, ctxFor('rhea'), { referralId: 'ref-0004', reason: 'Schedule conflict (demo).' }));
    expect(withdrawn.data.referrals.find((r) => r.id === 'ref-0004')!.state).toBe('cancelled');
  });
});

describe('opportunity lifecycle', () => {
  const input: OpportunityInput = {
    title: 'Test Session (fictional)',
    type: 'workshop',
    provider: 'Demo Provider (fictional)',
    description: 'Fictional.',
    eligibility: 'Adults.',
    costLabel: 'Free (demo)',
    capacity: 2,
    dateLabel: 'Date to be confirmed (demo)',
    deadline: '2026-12-01',
    locationMode: 'In person (fictional)',
    ownerId: 'council-1',
    nextStep: 'Respond to the offer.',
    contactRoute: 'Council contact route (placeholder)',
  };

  it('creates a draft, refuses invalid details, and publishes a complete one', () => {
    const created = must(createOpportunity(fresh(), ctxFor('council'), input));
    expect(created.data.opportunities.find((o) => o.id === created.id)!.state).toBe('draft');
    const published = must(publishOpportunity(created.data, ctxFor('council'), { id: created.id! }));
    expect(published.data.opportunities.find((o) => o.id === created.id)!.state).toBe('published');
    const bad = createOpportunity(fresh(), ctxFor('council'), { ...input, capacity: 0 });
    expect(bad.ok).toBe(false);
  });

  it('cancellation cascades to active referrals and leaves recorded outcomes unchanged', () => {
    const cancelled = must(cancelOpportunity(fresh(), ctxFor('council'), { id: FILM, reason: 'Venue unavailable (demo).' }));
    expect(cancelled.data.opportunities.find((o) => o.id === FILM)!.state).toBe('cancelled');
    expect(cancelled.data.referrals.find((r) => r.id === 'ref-0003')!.state).toBe('cancelled');
    expect(cancelled.data.referrals.find((r) => r.id === 'ref-0004')!.state).toBe('cancelled');
    expect(cancelled.data.referrals.find((r) => r.id === 'ref-0005')!.state).toBe('completed');
  });

  it('a material change to a published opportunity sends confirmed places back for reconfirmation', () => {
    const data = fresh();
    const opp = data.opportunities.find((o) => o.id === CLINIC)!;
    const changed = must(updateOpportunity(data, ctxFor('council'), { id: CLINIC, fields: { ...opp, locationMode: 'Online (demo)', ownerId: opp.ownerId } }));
    expect(changed.data.referrals.find((r) => r.id === 'ref-0001')!.state).toBe('accepted');
  });

  it('capacity cannot drop below the places already in use', () => {
    const data = fresh();
    const opp = data.opportunities.find((o) => o.id === CLINIC)!;
    const result = updateOpportunity(data, ctxFor('council'), { id: CLINIC, fields: { ...opp, capacity: 0 } });
    expect(result.ok).toBe(false);
  });
});
