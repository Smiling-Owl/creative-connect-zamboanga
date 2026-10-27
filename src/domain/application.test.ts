import { describe, expect, it } from 'vitest';
import { approveApplication, declineApplication, editProfile, enqueueSubmission, intakeValidationErrors, requestChanges, resolveDuplicate, startReview, submitIntake, validateIntake } from './application';
import { saveDraft } from './drafts';
import { resolveConflict, syncQueue } from './queue';
import { ctxFor, fresh } from '../test/helpers';
import type { IntakeFields, IntakeSource } from './types';

const SOURCE_A: IntakeSource = { mode: 'assisted', siteId: 'site-a', coordinatorId: 'coord-a', capturedOn: '2026-10-26' };

function completeFields(overrides: Partial<IntakeFields> = {}): IntakeFields & { domain: string } {
  return {
    name: 'Test Person (fictional)',
    displayName: 'Test Person (demo)',
    domain: 'Design',
    practice: 'Illustration',
    skills: ['Picture-book pages'],
    area: 'Area 2 (broad, fictional)',
    interests: [],
    followUp: { kind: 'own_channel', channelLabel: 'Demo messaging contact (fictional)' },
    evidence: [{ id: 'ev-test', kind: 'sample', text: 'Sample set (fictional)', publicApproved: false }],
    acknowledged: true,
    ...overrides,
  };
}

describe('validateIntake', () => {
  it('accepts a complete intake without a portfolio link or business permit', () => {
    expect(validateIntake(completeFields())).toBeNull();
  });

  it('requires at least one evidence item but accepts a description instead of a link', () => {
    expect(validateIntake(completeFields({ evidence: [] }))).toMatch(/at least one piece of work evidence/);
    expect(
      validateIntake(
        completeFields({ evidence: [{ id: 'e', kind: 'assisted_description', text: 'Described in person (fictional)', publicApproved: false }] }),
      ),
    ).toBeNull();
  });

  it('requires the information-use acknowledgment', () => {
    expect(validateIntake(completeFields({ acknowledged: false }))).toMatch(/information-use notice/);
  });

  it('rejects blank skills, blank evidence, and an empty own-channel label', () => {
    expect(validateIntake(completeFields({ skills: ['   '] }))).not.toBeNull();
    expect(validateIntake(completeFields({ evidence: [{ id: 'blank', kind: 'sample', text: '   ', publicApproved: false }] }))).not.toBeNull();
    expect(validateIntake(completeFields({ followUp: { kind: 'own_channel', channelLabel: '  ' } }))).not.toBeNull();
  });

  it('requires one of the nine taxonomy domains and a nonblank free-text practice', () => {
    expect(intakeValidationErrors(completeFields({ domain: '' })).map((error) => error.field)).toContain('domain');
    expect(intakeValidationErrors(completeFields({ domain: 'Design-adjacent' })).map((error) => error.field)).toContain('domain');
    expect(intakeValidationErrors(completeFields({ practice: '  ' })).map((error) => error.field)).toContain('practice');
    expect(validateIntake(completeFields({ domain: 'Performing Arts', practice: 'Experimental shadow-puppet music theatre (fictional)' }))).toBeNull();
  });
});

describe('drafts', () => {
  it('flags a new self-service submission that reuses an assisted record contact for council review', () => {
    const start = fresh();
    const fields = completeFields({
      displayName: 'New creative (demo)',
      area: 'Area 3 (broad, fictional)',
      followUp: { kind: 'own_channel', channelLabel: 'rhea@example.invalid' },
    });
    const saved = saveDraft(start, ctxFor('jun'), { draftId: 'draft-jun', recordId: null, source: SOURCE_A, fields });
    if (!saved.ok) throw new Error(saved.message);
    const submitted = submitIntake(saved.data, ctxFor('jun'), { draftId: saved.id!, optedIn: false });
    if (!submitted.ok) throw new Error(submitted.message);
    const record = submitted.data.records.find((item) => item.id === submitted.id)!;
    expect(record.application.duplicate).toEqual({ candidateRecordId: 'rec-rhea', status: 'open', reason: null });
  });

  it('saves and updates the same draft without creating another', () => {
    const start = fresh();
    const first = saveDraft(start, ctxFor('jun'), { draftId: null, recordId: null, source: { mode: 'self_service', siteId: null, coordinatorId: null, capturedOn: '2026-10-26' }, fields: completeFields() });
    if (!first.ok) throw new Error(first.message);
    const count = first.data.drafts.length;
    const second = saveDraft(first.data, ctxFor('jun'), { draftId: first.id!, recordId: null, source: { mode: 'self_service', siteId: null, coordinatorId: null, capturedOn: '2026-10-26' }, fields: completeFields({ skills: ['Ink'] }) });
    if (!second.ok) throw new Error(second.message);
    expect(second.data.drafts.length).toBe(count);
    expect(second.data.drafts.find((d) => d.id === first.id)!.fields.skills).toEqual(['Ink']);
  });

  it('does not let another person change a draft', () => {
    const result = saveDraft(fresh(), ctxFor('noel'), { draftId: 'draft-jun', recordId: null, source: { mode: 'self_service', siteId: null, coordinatorId: null, capturedOn: '2026-10-26' }, fields: completeFields() });
    expect(result.ok).toBe(false);
  });
});

describe('submission and receipt', () => {
  it('applies the public-listing choice on correction resubmission', () => {
    const start = fresh();
    const current = start.records.find((record) => record.id === 'rec-gwen')!;
    const fields = completeFields({ ...current.intake, evidence: [{ id: 'gwen-correction', kind: 'sample', text: 'Updated sample description (fictional)', publicApproved: false }], displayName: current.intake.displayName, followUp: current.intake.followUp });
    const saved = saveDraft(start, ctxFor('coord-a'), { draftId: null, recordId: current.id, source: SOURCE_A, fields });
    if (!saved.ok) throw new Error(saved.message);
    const submitted = submitIntake(saved.data, ctxFor('coord-a'), { draftId: saved.id!, optedIn: true });
    if (!submitted.ok) throw new Error(submitted.message);
    expect(submitted.data.records.find((record) => record.id === current.id)?.optedIn).toBe(true);
  });

  it('online submission creates one record and one application on receipt, and removes the draft', () => {
    const start = fresh();
    const before = start.records.length;
    const result = submitIntake(start, ctxFor('jun'), { draftId: 'draft-jun', optedIn: false });
    expect(result.ok).toBe(false); // Jun's draft is incomplete (no acknowledgment, no evidence)

    const complete = saveDraft(start, ctxFor('jun'), { draftId: 'draft-jun', recordId: null, source: start.drafts.find((d) => d.id === 'draft-jun')!.source, fields: completeFields({ displayName: 'Jun (demo)', practice: 'Film / video', area: 'Area 3 (broad, fictional)' }) });
    if (!complete.ok) throw new Error(complete.message);
    const sent = submitIntake(complete.data, ctxFor('jun'), { draftId: 'draft-jun', optedIn: false });
    if (!sent.ok) throw new Error(sent.message);
    expect(sent.data.records.length).toBe(before + 1);
    const created = sent.data.records.find((r) => r.id === sent.id)!;
    expect(created.application.state).toBe('received');
    expect(created.personId).toBe('person-jun');
    expect(sent.data.drafts.find((d) => d.id === 'draft-jun')).toBeUndefined();
  });

  it('repeat submission of the same draft creates nothing new', () => {
    const start = fresh();
    const complete = saveDraft(start, ctxFor('coord-a'), { draftId: 'draft-mika', recordId: null, source: SOURCE_A, fields: completeFields({ displayName: 'Mika (demo)', practice: 'Illustration', area: 'Area 2 (broad, fictional)' }) });
    if (!complete.ok) throw new Error(complete.message);
    const first = submitIntake(complete.data, ctxFor('coord-a'), { draftId: 'draft-mika', optedIn: false });
    if (!first.ok) throw new Error(first.message);
    const second = submitIntake(first.data, ctxFor('coord-a'), { draftId: 'draft-mika', optedIn: false });
    expect(second.ok).toBe(false);
    expect(first.data.records.length).toBe(start.records.length + 1);
  });

  it('a queued submission never appears as a record or application until delivered', () => {
    const start = fresh();
    const complete = saveDraft(start, ctxFor('coord-a'), { draftId: 'draft-mika', recordId: null, source: SOURCE_A, fields: completeFields({ displayName: 'Mika (demo)', practice: 'Illustration', area: 'Area 2 (broad, fictional)' }) });
    if (!complete.ok) throw new Error(complete.message);
    const queued = enqueueSubmission(complete.data, ctxFor('coord-a', { online: false }), { draftId: 'draft-mika', optedIn: false });
    if (!queued.ok) throw new Error(queued.message);
    expect(queued.data.records.length).toBe(start.records.length);
    expect(queued.data.queue.length).toBe(start.queue.length + 1);
    const item = queued.data.queue.find((q) => q.id === queued.id)!;
    expect(item.status).toBe('waiting');
    expect(item.deviceRef).toMatch(/^DEV-A-\d{3}$/);
  });

  it('applies the public-listing choice when a queued correction is delivered', () => {
    const data = fresh();
    const current = data.records.find((record) => record.id === 'rec-gwen')!;
    const fields = completeFields({ ...current.intake, evidence: [{ id: 'gwen-queued', kind: 'sample', text: 'Updated sample description (fictional)', publicApproved: false }], followUp: current.intake.followUp });
    const saved = saveDraft(data, ctxFor('coord-a'), { draftId: null, recordId: current.id, source: SOURCE_A, fields });
    if (!saved.ok) throw new Error(saved.message);
    const queued = enqueueSubmission(saved.data, ctxFor('coord-a', { online: false }), { draftId: saved.id!, optedIn: true });
    if (!queued.ok) throw new Error(queued.message);
    const delivered = syncQueue(queued.data, ctxFor('coord-a'), { itemId: queued.id });
    if (!delivered.ok) throw new Error(delivered.message);
    expect(delivered.data.records.find((record) => record.id === current.id)?.optedIn).toBe(true);
  });

  it('refuses to queue when connected, and refuses offline sync', () => {
    const start = fresh();
    const connected = enqueueSubmission(start, ctxFor('coord-a', { online: true }), { draftId: 'draft-mika', optedIn: false });
    expect(connected.ok).toBe(false);
    const offline = syncQueue(start, ctxFor('coord-a', { online: false }));
    expect(offline.ok).toBe(false);
  });

  it('a failed send keeps the item queued and does not create a record; retry delivers exactly once', () => {
    let data = fresh();
    const complete = saveDraft(data, ctxFor('coord-a'), { draftId: 'draft-mika', recordId: null, source: SOURCE_A, fields: completeFields({ displayName: 'Mika (demo)', practice: 'Illustration', area: 'Area 2 (broad, fictional)' }) });
    if (!complete.ok) throw new Error(complete.message);
    data = complete.data;
    const queued = enqueueSubmission(data, ctxFor('coord-a', { online: false }), { draftId: 'draft-mika', optedIn: false });
    if (!queued.ok) throw new Error(queued.message);
    data = queued.data;
    const recordsBefore = data.records.length;

    // Target this item so the simulated failure lands on it, not on another queued item.
    const failed = syncQueue(data, ctxFor('coord-a', { failNextSend: true }), { itemId: queued.id });
    if (!failed.ok) throw new Error(failed.message);
    expect(failed.data.records.length).toBe(recordsBefore);
    expect(failed.data.queue.find((q) => q.id === queued.id)!.status).toBe('failed');

    const retried = syncQueue(failed.data, ctxFor('coord-a'), { itemId: queued.id });
    if (!retried.ok) throw new Error(retried.message);
    expect(retried.data.records.length).toBe(recordsBefore + 1);
    expect(retried.data.queue.find((q) => q.id === queued.id)!.status).toBe('delivered');

    const again = syncQueue(retried.data, ctxFor('coord-a'));
    if (!again.ok) throw new Error(again.message);
    expect(again.data.records.length).toBe(recordsBefore + 1);
  });

  it('a conflicting correction stays out of the record until resubmitted; resubmitting updates the same record', () => {
    const data = fresh();
    expect(data.queue.find((q) => q.id === 'queue-gwen')!.status).toBe('conflict');
    expect(data.records.find((r) => r.id === 'rec-gwen')!.application.version).toBe(2);

    const resolved = resolveConflict(data, ctxFor('coord-a'), { itemId: 'queue-gwen', action: 'resubmit' });
    if (!resolved.ok) throw new Error(resolved.message);
    const delivered = syncQueue(resolved.data, ctxFor('coord-a'));
    if (!delivered.ok) throw new Error(delivered.message);
    expect(delivered.data.queue.find((q) => q.id === 'queue-gwen')!.status).toBe('delivered');
    const gwen = delivered.data.records.find((r) => r.id === 'rec-gwen')!;
    expect(gwen.application.version).toBe(3);
    expect(gwen.application.state).toBe('received');
    expect(delivered.data.records.length).toBe(data.records.length);
  });
});

describe('council review', () => {
  it('no review action before receipt: queued drafts are not records', () => {
    const start = fresh();
    expect(start.records.find((r) => r.intake.displayName === 'Mika (demo)')).toBeUndefined();
  });

  it('blocks verification while a possible duplicate is open, then allows it after a reasoned resolution', () => {
    let data = fresh();
    expect(approveApplication(data, ctxFor('council'), { recordId: 'rec-joel-2', approvePublicContent: false }).ok).toBe(false);
    const resolved = resolveDuplicate(data, ctxFor('council'), { recordId: 'rec-joel-2', decision: 'not_duplicate', reason: 'Different practice and skills after checking with the applicant (demo).' });
    if (!resolved.ok) throw new Error(resolved.message);
    data = resolved.data;
    const approved = approveApplication(data, ctxFor('council'), { recordId: 'rec-joel-2', approvePublicContent: false });
    expect(approved.ok).toBe(true);
  });

  it('requires a reason to request changes or decline', () => {
    const data = fresh();
    const noReason = requestChanges(data, ctxFor('council'), { recordId: 'rec-joel-2', reason: '   ' });
    expect(noReason.ok).toBe(false);
    const noDecline = declineApplication(data, ctxFor('council'), { recordId: 'rec-joel-2', reason: '' });
    expect(noDecline.ok).toBe(false);
  });

  it('a received record moves through review and changes are requested with the reason kept', () => {
    let data = fresh();
    const seeded = saveDraft(data, ctxFor('coord-a'), { draftId: 'draft-mika', recordId: null, source: SOURCE_A, fields: completeFields({ displayName: 'Mika (demo)', practice: 'Illustration', area: 'Area 2 (broad, fictional)' }) });
    if (!seeded.ok) throw new Error(seeded.message);
    const sent = submitIntake(seeded.data, ctxFor('coord-a'), { draftId: 'draft-mika', optedIn: false });
    if (!sent.ok) throw new Error(sent.message);
    data = sent.data;
    const reviewing = startReview(data, ctxFor('council'), sent.id!);
    if (!reviewing.ok) throw new Error(reviewing.message);
    const requested = requestChanges(reviewing.data, ctxFor('council'), { recordId: sent.id!, reason: 'Please describe one more work sample.' });
    if (!requested.ok) throw new Error(requested.message);
    const record = requested.data.records.find((r) => r.id === sent.id)!;
    expect(record.application.state).toBe('changes_requested');
    expect(record.application.reason).toBe('Please describe one more work sample.');
  });

  it('declined records keep their decision reason', () => {
    const data = fresh();
    expect(data.records.find((r) => r.id === 'rec-lorenz')!.application.reason).toMatch(/demo assumption/);
  });
});

describe('profile maintenance', () => {
  it('a substantive change to a verified profile sets update pending and keeps verification', () => {
    const data = fresh();
    const current = data.records.find((r) => r.id === 'rec-noel')!;
    const result = editProfile(data, ctxFor('noel'), { recordId: 'rec-noel', fields: { ...current.intake, skills: ['Editing', 'Motion graphics'] } });
    if (!result.ok) throw new Error(result.message);
    const record = result.data.records.find((r) => r.id === 'rec-noel')!;
    expect(record.application.state).toBe('verified');
    expect(record.application.updatePending).toBe(true);
  });

  it('a creative cannot edit another person’s profile', () => {
    const data = fresh();
    const current = data.records.find((r) => r.id === 'rec-noel')!;
    expect(editProfile(data, ctxFor('rhea'), { recordId: 'rec-noel', fields: current.intake }).ok).toBe(false);
  });
});
