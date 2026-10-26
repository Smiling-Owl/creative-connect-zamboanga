import { describe, expect, it } from 'vitest';
import { approveApplication, enqueueSubmission, requestChanges, startReview, submitIntake, validateIntake } from './application';
import { saveDraft } from './drafts';
import { syncQueue } from './queue';
import { confirmPlace, inviteCreative, recordOutcome, respondToOffer } from './referral';
import { openCase, resolveCase } from './cases';
import { councilCounts, opportunityCapacity } from './selectors';
import { publicDirectory } from './publicProfile';
import { ctxFor, fresh } from '../test/helpers';
import type { DomainData, IntakeFields, IntakeSource } from './types';

// Pure-domain walk through the main demo story. The browser journey test repeats this through the UI.

const SOURCE_A: IntakeSource = { mode: 'assisted', siteId: 'site-a', coordinatorId: 'coord-a', capturedOn: '2026-10-26' };
const CLINIC = 'opp-clinic';

function step<T extends { ok: boolean }>(result: T): T & { ok: true } {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as T & { ok: true };
}

describe('main story: Mika, from offline intake to a recorded outcome', () => {
  it('runs end to end and keeps Mika out of the public directory', () => {
    const at = (minutes: number) => new Date(Date.parse('2026-10-26T09:00:00.000Z') + minutes * 60_000).toISOString();
    let data: DomainData = fresh();

    // 1. Coordinator completes the intake for Mika, who has no device contact route for follow-up.
    const mikaDraft = data.drafts.find((d) => d.id === 'draft-mika')!;
    const fields: IntakeFields = { ...mikaDraft.fields, acknowledged: true };
    expect(validateIntake(fields)).toBeNull();
    data = step(saveDraft(data, ctxFor('coord-a', {}, at(1)), { draftId: 'draft-mika', recordId: null, source: SOURCE_A, fields })).data;

    // 2. Offline: queued on the device. The council has not received it.
    const receivedBefore = councilCounts(data).received;
    const queued = step(enqueueSubmission(data, ctxFor('coord-a', { online: false }, at(2)), { draftId: 'draft-mika', optedIn: false }));
    data = queued.data;
    expect(councilCounts(data).received).toBe(receivedBefore);

    // 3. Reconnection with one simulated failure, then a retry. Exactly one record results.
    const failed = step(syncQueue(data, ctxFor('coord-a', { failNextSend: true }, at(3)), { itemId: queued.id }));
    data = failed.data;
    expect(data.queue.find((q) => q.id === queued.id)!.status).toBe('failed');
    data = step(syncQueue(data, ctxFor('coord-a', {}, at(4)), { itemId: queued.id! })).data;
    const mika = data.records.find((r) => r.intake.displayName === 'Mika (demo)')!;
    expect(mika.application.state).toBe('received');
    expect(councilCounts(data).received).toBe(receivedBefore + 1);

    // 4. Council starts review and requests clarification with a reason.
    data = step(startReview(data, ctxFor('council', {}, at(5)), mika.id)).data;
    data = step(requestChanges(data, ctxFor('council', {}, at(6)), { recordId: mika.id, reason: 'Please add the sample description for pages 9 to 12.' })).data;

    // 5. Coordinator helps Mika correct it through the same record, then resubmits.
    const correction = step(
      saveDraft(data, ctxFor('coord-a', {}, at(7)), {
        draftId: null,
        recordId: mika.id,
        source: SOURCE_A,
        fields: {
          ...mika.intake,
          evidence: [
            ...mika.intake.evidence,
            { id: 'ev-mika-2', kind: 'assisted_description', text: 'Pages 9 to 12 described in person (fictional)', publicApproved: false },
          ],
        },
      }),
    );
    data = correction.data;
    data = step(submitIntake(data, ctxFor('coord-a', {}, at(8)), { draftId: correction.id!, optedIn: false })).data;
    expect(data.records.find((r) => r.id === mika.id)!.application.version).toBe(2);

    // 6. Council reviews again, then verifies. The public listing stays off because Mika did not opt in.
    data = step(startReview(data, ctxFor('council', {}, at(9)), mika.id)).data;
    data = step(approveApplication(data, ctxFor('council', {}, at(9)), { recordId: mika.id, approvePublicContent: false })).data;

    // 7. Council offers the clinic. Mika has no account, so the coordinator relays her acceptance.
    const offered = step(inviteCreative(data, ctxFor('council', {}, at(10)), { recordId: mika.id, opportunityId: CLINIC }));
    data = offered.data;
    data = step(respondToOffer(data, ctxFor('coord-a', {}, at(11)), { referralId: offered.id!, response: 'accept' })).data;
    expect(data.referrals.find((r) => r.id === offered.id)!.via).toBe('coord-a');

    // 8. Council confirms capacity and records attendance, separate from acceptance.
    data = step(confirmPlace(data, ctxFor('council', {}, at(12)), { referralId: offered.id!, instructions: 'Arrive 15 minutes early (fictional).' })).data;
    data = step(recordOutcome(data, ctxFor('council', {}, at(13)), { referralId: offered.id!, outcome: 'completed' })).data;
    expect(data.referrals.find((r) => r.id === offered.id)!.state).toBe('completed');
    expect(opportunityCapacity(data, CLINIC)!.used).toBe(2); // Dani and Mika

    // 9. Private verified support: Mika is referred and attended, but never appears in the directory.
    expect(publicDirectory(data).map((p) => p.displayName)).not.toContain('Mika (demo)');
    expect(councilCounts(data).verifiedNotListed).toBe(2);
  });
});

describe('a declined creative asks for a human review', () => {
  it('the baseline case is already open, so a second request is refused; the council can reopen review', () => {
    let data = fresh();
    const again = openCase(data, ctxFor('coord-b'), { kind: 'human_review', recordId: 'rec-lorenz', reason: 'Again.' });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe('already_open');

    data = step(resolveCase(data, ctxFor('council'), { caseId: 'case-0001', resolution: 'Reopened for review after checking the description.', reopen: true })).data;
    expect(data.records.find((r) => r.id === 'rec-lorenz')!.application.state).toBe('under_review');
    expect(councilCounts(data).openCases).toBe(0);
  });

  it('upholding the decline keeps the record declined and records the reason', () => {
    let data = fresh();
    data = step(resolveCase(data, ctxFor('council'), { caseId: 'case-0001', resolution: 'Practice remains outside the pilot areas (demo).' })).data;
    const lorenz = data.records.find((r) => r.id === 'rec-lorenz')!;
    expect(lorenz.application.state).toBe('declined');
    expect(data.cases.find((c) => c.id === 'case-0001')!.resolution).toMatch(/demo/);
  });
});
