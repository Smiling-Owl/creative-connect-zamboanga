import { describe, expect, it } from 'vitest';
import { approveApplication, editProfile, requestChanges, resolveUpdate, startReview, submitIntake, enqueueSubmission } from './application';
import { recordInstructions, markNotSelected, respondToOffer, withdrawReferral } from './referral';
import { closeOpportunity } from './opportunity';
import { saveDraft } from './drafts';
import { syncQueue } from './queue';
import { listingStatus } from './visibility';
import { ctxFor, fresh } from '../test/helpers';
import type { DomainData, IntakeFields } from './types';

function step<T extends { ok: boolean }>(result: T): T & { ok: true } {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as T & { ok: true };
}

describe('public-field edits on a verified profile go to council review', () => {
  it('changing the display name sets an update pending and hides the listing until approved', () => {
    let data: DomainData = fresh();
    const noel = data.records.find((r) => r.id === 'rec-noel')!;
    data = step(editProfile(data, ctxFor('noel'), { recordId: 'rec-noel', fields: { ...noel.intake, displayName: 'Noel P. (demo)' } })).data;
    const record = data.records.find((r) => r.id === 'rec-noel')!;
    expect(record.application.updatePending).toBe(true);
    expect(listingStatus(record)).toBe('pending_review');
    data = step(resolveUpdate(data, ctxFor('council'), { recordId: 'rec-noel', decision: 'approve' })).data;
    expect(listingStatus(data.records.find((r) => r.id === 'rec-noel')!)).toBe('listed');
  });

  it('a change to a non-public field does not set an update', () => {
    const data = fresh();
    const noel = data.records.find((r) => r.id === 'rec-noel')!;
    const changed = step(editProfile(data, ctxFor('noel'), { recordId: 'rec-noel', fields: { ...noel.intake, interests: ['Mentoring'] } })).data;
    expect(changed.records.find((r) => r.id === 'rec-noel')!.application.updatePending).toBe(false);
  });

  it('a creative edit answers an earlier request for changes to the update', () => {
    let data: DomainData = fresh();
    const noel = data.records.find((r) => r.id === 'rec-noel')!;
    data = step(editProfile(data, ctxFor('noel'), { recordId: 'rec-noel', fields: { ...noel.intake, skills: ['Editing', 'Grading'] } })).data;
    data = step(resolveUpdate(data, ctxFor('council'), { recordId: 'rec-noel', decision: 'request_changes', reason: 'Describe the grading work.' })).data;
    expect(data.records.find((r) => r.id === 'rec-noel')!.application.updateReason).not.toBeNull();
    const again = data.records.find((r) => r.id === 'rec-noel')!;
    data = step(editProfile(data, ctxFor('noel'), { recordId: 'rec-noel', fields: { ...again.intake, skills: ['Editing', 'Grading', 'Colour'] } })).data;
    expect(data.records.find((r) => r.id === 'rec-noel')!.application.updateReason).toBeNull();
  });
});

describe('follow-up arrangements', () => {
  it('a creative cannot change a coordinator-mediated arrangement that was set for them', () => {
    let data: DomainData = fresh();
    data = { ...data, records: data.records.map((r) => (r.id === 'rec-dani' ? { ...r, personId: 'person-dani' } : r)) };
    const dani = data.records.find((r) => r.id === 'rec-dani')!;
    const attempt = step(editProfile(data, { ...ctxFor('noel'), actor: { role: 'creative', id: 'person-dani' } }, {
      recordId: 'rec-dani',
      fields: { ...dani.intake, followUp: { kind: 'own_channel', channelLabel: 'Demo contact: Dani (fictional)' } },
    }));
    expect(attempt.data.records.find((r) => r.id === 'rec-dani')!.intake.followUp).toEqual({ kind: 'coordinator_mediated', coordinatorId: 'coord-b' });
  });

  it('a creative cannot choose coordinator-mediated follow-up for a record that has none', () => {
    const data = fresh();
    const noel = data.records.find((r) => r.id === 'rec-noel')!;
    const result = editProfile(data, ctxFor('noel'), {
      recordId: 'rec-noel',
      fields: { ...noel.intake, followUp: { kind: 'coordinator_mediated', coordinatorId: 'coord-a' } },
    });
    expect(result.ok).toBe(false);
  });
});

describe('the baseline alternate story', () => {
  it('Jun’s baseline draft is not flagged as a duplicate of Rhea, and can be verified', () => {
    const data = fresh();
    const draft = data.drafts.find((d) => d.id === 'draft-jun')!;
    const ready = step(
      saveDraft(data, ctxFor('jun'), {
        draftId: 'draft-jun',
        recordId: null,
        source: draft.source,
        fields: {
          ...draft.fields,
          acknowledged: true,
          evidence: [{ id: 'ev-jun-1', kind: 'sample', text: 'Sample set: two short films (fictional)', publicApproved: false }],
        },
      }),
    );
    const sent = step(submitIntake(ready.data, ctxFor('jun'), { draftId: 'draft-jun', optedIn: false }));
    const record = sent.data.records.find((r) => r.id === sent.id)!;
    expect(record.application.duplicate).toBeNull();
    const reviewing = step(startReview(sent.data, ctxFor('council'), sent.id!));
    expect(approveApplication(reviewing.data, ctxFor('council'), { recordId: sent.id!, approvePublicContent: true }).ok).toBe(true);
  });
});

describe('referral details and closed opportunities', () => {
  it('an interest on a closed opportunity can still be marked not selected, so no referral is stranded', () => {
    const closed = step(closeOpportunity(fresh(), ctxFor('council'), { id: 'opp-film' })).data;
    const result = markNotSelected(closed, ctxFor('council'), { referralId: 'ref-0003', reason: 'Closed before a decision (demo).' });
    expect(result.ok).toBe(true);
  });

  it('a relayed response records the relaying coordinator in the audit log', () => {
    // Rhea's offer on the film workshop is open. A coordinator relays her decline, then a later withdrawal.
    const relayed = step(respondToOffer(fresh(), ctxFor('coord-a'), { referralId: 'ref-0004', response: 'decline', reason: 'Schedule conflict (demo).' }));
    expect(relayed.data.audit.some((e) => e.entityId === 'ref-0004' && e.via === 'coord-a')).toBe(true);
    const withdrawn = step(withdrawReferral(step(respondToOffer(fresh(), ctxFor('rhea'), { referralId: 'ref-0004', response: 'accept' })).data, ctxFor('coord-a'), { referralId: 'ref-0004', reason: 'Relayed withdrawal (demo).' }));
    expect(withdrawn.data.audit.some((e) => e.entityId === 'ref-0004' && e.via === 'coord-a' && e.action === 'state_changed')).toBe(true);
  });

  it('council records practical instructions on a confirmed place without changing its state', () => {
    const data = fresh();
    const result = step(recordInstructions(data, ctxFor('council'), { referralId: 'ref-0001', instructions: 'Bring two printed samples (fictional).' }));
    const referral = result.data.referrals.find((r) => r.id === 'ref-0001')!;
    expect(referral.state).toBe('confirmed');
    expect(referral.instructions).toMatch(/printed samples/);
    expect(recordInstructions(data, ctxFor('council'), { referralId: 'ref-0001', instructions: '   ' }).ok).toBe(false);
  });
});

describe('queue failure reporting', () => {
  it('a sync with nothing pending reports no failure; a simulated failure names the item', () => {
    const base = fresh();
    expect(step(syncQueue(base, ctxFor('coord-a', { failNextSend: true }))).failedItemId).toBeUndefined();

    const mikaFields: IntakeFields = { ...base.drafts.find((d) => d.id === 'draft-mika')!.fields, acknowledged: true };
    const drafted = step(saveDraft(base, ctxFor('coord-a'), { draftId: 'draft-mika', recordId: null, source: base.drafts.find((d) => d.id === 'draft-mika')!.source, fields: mikaFields }));
    const queued = step(enqueueSubmission(drafted.data, ctxFor('coord-a', { online: false }), { draftId: 'draft-mika', optedIn: false }));
    const failed = step(syncQueue(queued.data, ctxFor('coord-a', { failNextSend: true }), { itemId: queued.id }));
    expect(failed.failedItemId).toBe(queued.id);
  });
});

describe('requests for changes need a reviewed record', () => {
  it('requesting changes on an unreviewed record is refused', () => {
    expect(requestChanges(fresh(), ctxFor('council'), { recordId: 'rec-ines', reason: 'Please add a sample.' }).ok).toBe(false);
  });

  it('a received record can be reviewed and then returned for changes with the reason kept', () => {
    let data: DomainData = step(startReview(fresh(), ctxFor('council'), 'rec-ines')).data;
    data = step(requestChanges(data, ctxFor('council'), { recordId: 'rec-ines', reason: 'Add one work sample.' })).data;
    expect(data.records.find((r) => r.id === 'rec-ines')!.application.state).toBe('changes_requested');
  });
});
