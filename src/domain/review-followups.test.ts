import { describe, expect, it } from 'vitest';
import { approveApplication, editProfile, requestChanges, resolveUpdate, startReview, submitIntake, enqueueSubmission } from './application';
import { recordInstructions, markNotSelected, respondToOffer, withdrawReferral } from './referral';
import { closeOpportunity } from './opportunity';
import { saveDraft } from './drafts';
import { syncQueue } from './queue';
import { listingStatus } from './visibility';
import { openCase, resolveCase } from './cases';
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

  it('non-public edits preserve an outstanding public-content change reason', () => {
    let data: DomainData = fresh();
    const noel = data.records.find((r) => r.id === 'rec-noel')!;
    data = step(editProfile(data, ctxFor('noel'), { recordId: noel.id, fields: { ...noel.intake, practice: 'Animation' } })).data;
    data = step(resolveUpdate(data, ctxFor('council'), { recordId: noel.id, decision: 'request_changes', reason: 'Choose a different public sample.' })).data;
    const requested = data.records.find((r) => r.id === noel.id)!;
    data = step(editProfile(data, ctxFor('noel'), { recordId: noel.id, fields: { ...requested.intake, interests: ['Mentoring'] } })).data;
    expect(data.records.find((r) => r.id === noel.id)!.application.updateReason).toBe('Choose a different public sample.');
    expect(data.records.find((r) => r.id === noel.id)!.application.updatePending).toBe(true);
  });
});

describe('withdrawal requests', () => {
  it('unlists immediately, records the request, and keeps the opted-out state after council disposition', () => {
    const requested = step(openCase(fresh(), ctxFor('noel'), { kind: 'withdrawal', recordId: 'rec-noel', reason: 'Please remove my public listing.' }));
    expect(requested.data.records.find((r) => r.id === 'rec-noel')!.optedIn).toBe(false);
    expect(listingStatus(requested.data.records.find((r) => r.id === 'rec-noel')!)).toBe('not_listed');
    expect(requested.data.audit.some((event) => event.entityId === 'rec-noel' && event.action === 'withdrawal_requested')).toBe(true);
    const resolved = step(resolveCase(requested.data, ctxFor('council'), { caseId: requested.id!, resolution: 'Withdrawal noted; no information was deleted.' }));
    expect(resolved.data.records.find((r) => r.id === 'rec-noel')!.optedIn).toBe(false);
    expect(listingStatus(resolved.data.records.find((r) => r.id === 'rec-noel')!)).toBe('not_listed');
  });

  it('lets an assigned coordinator open a withdrawal only online with explicit agreement', () => {
    const data = fresh();
    expect(openCase(data, ctxFor('coord-a'), { kind: 'withdrawal', recordId: 'rec-rhea', reason: 'The person asked to withdraw (fictional).', personAgreed: false })).toMatchObject({ ok: false, code: 'consent_required' });
    expect(openCase(data, ctxFor('coord-a', { online: false }), { kind: 'withdrawal', recordId: 'rec-rhea', reason: 'The person asked to withdraw (fictional).', personAgreed: true })).toMatchObject({ ok: false, code: 'offline' });
    expect(openCase(data, ctxFor('coord-b'), { kind: 'withdrawal', recordId: 'rec-rhea', reason: 'The person asked to withdraw (fictional).', personAgreed: true })).toMatchObject({ ok: false, code: 'forbidden' });
    const opened = step(openCase(data, ctxFor('coord-a'), { kind: 'withdrawal', recordId: 'rec-rhea', reason: 'The person asked to withdraw (fictional).', personAgreed: true }));
    expect(opened.data.records.find((item) => item.id === 'rec-rhea')?.optedIn).toBe(false);
    expect(opened.data.audit.at(-1)).toMatchObject({ actor: { role: 'coordinator', id: 'coord-a' }, via: 'coord-a' });
    const resolved = step(resolveCase(opened.data, ctxFor('council'), { caseId: opened.id!, resolution: 'Withdrawal request recorded; no information was deleted.' }));
    expect(resolved.data.cases.find((item) => item.id === opened.id)?.resolution).toBe('Withdrawal request recorded; no information was deleted.');
  });

  it('lets an assigned coordinator submit a correction request only with the person’s online agreement', () => {
    const data = fresh();
    const snapshot = JSON.stringify(data);
    const result = openCase(data, ctxFor('coord-a'), { kind: 'profile_correction', recordId: 'rec-rhea', reason: 'The person asked to correct their profile details.', personAgreed: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.cases.find((item) => item.id === result.id)).toMatchObject({ kind: 'profile_correction', openedBy: 'coord-a', state: 'open' });
    expect(JSON.stringify(data)).toBe(snapshot);
  });

  it('lets an assigned coordinator relay an outcome-correction request only online with explicit agreement and the owned referral', () => {
    const data = fresh();
    const input = { kind: 'outcome_correction' as const, recordId: 'rec-rhea', referralId: 'ref-0007', reason: 'The person says the attendance outcome is incorrect.', personAgreed: true };
    expect(openCase(data, ctxFor('coord-a'), { ...input, personAgreed: false })).toMatchObject({ ok: false, code: 'consent_required' });
    expect(openCase(data, ctxFor('coord-a', { online: false }), input)).toMatchObject({ ok: false, code: 'offline' });
    expect(openCase(data, ctxFor('coord-b'), input)).toMatchObject({ ok: false, code: 'forbidden' });
    expect(openCase(data, ctxFor('coord-a'), { ...input, recordId: 'rec-joel' })).toMatchObject({ ok: false, code: 'not_found' });
    const opened = step(openCase(data, ctxFor('coord-a'), input));
    expect(opened.data.cases.find((item) => item.id === opened.id)).toMatchObject({ kind: 'outcome_correction', recordId: 'rec-rhea', referralId: 'ref-0007', openedBy: 'coord-a', state: 'open' });
    expect(opened.data.audit.at(-1)).toMatchObject({ actor: { role: 'coordinator', id: 'coord-a' }, via: 'coord-a' });
  });

  it('does not resolve an outcome-correction case with an invalid outcome value', () => {
    const opened = step(openCase(fresh(), ctxFor('rhea'), { kind: 'outcome_correction', recordId: 'rec-rhea', referralId: 'ref-0007', reason: 'Please check the recorded outcome.' }));
    const before = JSON.stringify(opened.data);
    const invalid = resolveCase(opened.data, ctxFor('council'), { caseId: opened.id!, resolution: 'Checked the fictional register.', newOutcome: 'keep' as never });
    expect(invalid).toMatchObject({ ok: false, code: 'invalid_outcome' });
    expect(JSON.stringify(opened.data)).toBe(before);
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
