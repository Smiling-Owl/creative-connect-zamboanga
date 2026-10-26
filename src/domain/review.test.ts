import { describe, expect, it } from 'vitest';
import { approveApplication, declineApplication, editProfile, requestChanges, resolveDuplicate, resolveUpdate, startReview } from './application';
import { saveDraft } from './drafts';
import { ctxFor, fresh } from '../test/helpers';
import type { DomainData, IntakeFields } from './types';

function step<T extends { ok: boolean }>(result: T): T & { ok: true } {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as T & { ok: true };
}

describe('review order', () => {
  it('a received record cannot be verified, changed, or declined without starting review first', () => {
    const data: DomainData = fresh();
    expect(approveApplication(data, ctxFor('council'), { recordId: 'rec-ines', approvePublicContent: false }).ok).toBe(false);
    expect(requestChanges(data, ctxFor('council'), { recordId: 'rec-ines', reason: 'Please add a sample.' }).ok).toBe(false);
    expect(declineApplication(data, ctxFor('council'), { recordId: 'rec-ines', reason: 'Outside the pilot.' }).ok).toBe(false);
    const reviewing = step(startReview(data, ctxFor('council'), 'rec-ines'));
    expect(step(approveApplication(reviewing.data, ctxFor('council'), { recordId: 'rec-ines', approvePublicContent: false })).data).toBeDefined();
  });
});

describe('duplicates', () => {
  it('a duplicate resolved as linked cannot be verified separately', () => {
    let data: DomainData = fresh();
    data = step(resolveDuplicate(data, ctxFor('council'), { recordId: 'rec-joel-2', decision: 'linked', reason: 'Same person after checking contact (demo).' })).data;
    const result = approveApplication(data, ctxFor('council'), { recordId: 'rec-joel-2', approvePublicContent: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('duplicate_linked');
  });

  it('linking writes a history entry on the candidate record as well', () => {
    const data = step(resolveDuplicate(fresh(), ctxFor('council'), { recordId: 'rec-joel-2', decision: 'linked', reason: 'Same person (demo).' })).data;
    expect(data.audit.some((e) => e.entityId === 'rec-joel' && e.action === 'duplicate_linked_from')).toBe(true);
  });
});

describe('profile updates after verification', () => {
  it('council can ask for changes to a pending update, and the record stays verified', () => {
    let data: DomainData = fresh();
    const current = data.records.find((r) => r.id === 'rec-noel')!;
    data = step(editProfile(data, ctxFor('noel'), { recordId: 'rec-noel', fields: { ...current.intake, skills: ['Editing', 'Grading'] } })).data;
    data = step(resolveUpdate(data, ctxFor('council'), { recordId: 'rec-noel', decision: 'request_changes', reason: 'Please describe the grading work.' })).data;
    const record = data.records.find((r) => r.id === 'rec-noel')!;
    expect(record.application.state).toBe('verified');
    expect(record.application.updatePending).toBe(true);
    expect(record.application.updateReason).toMatch(/grading/);
  });

  it('approving an update clears the pending flag and refreshes the approved public content', () => {
    let data: DomainData = fresh();
    const current = data.records.find((r) => r.id === 'rec-noel')!;
    data = step(editProfile(data, ctxFor('noel'), { recordId: 'rec-noel', fields: { ...current.intake, practice: 'Animation' } })).data;
    data = step(resolveUpdate(data, ctxFor('council'), { recordId: 'rec-noel', decision: 'approve' })).data;
    const record = data.records.find((r) => r.id === 'rec-noel')!;
    expect(record.application.updatePending).toBe(false);
    expect(record.publicApprovedFingerprint).toContain('Animation');
  });

  it('an update decision needs a pending update', () => {
    expect(resolveUpdate(fresh(), ctxFor('council'), { recordId: 'rec-noel', decision: 'approve' }).ok).toBe(false);
  });
});

describe('one record per creative', () => {
  it('an existing record blocks a second new draft from the same creative', () => {
    const data = fresh();
    const current = data.records.find((r) => r.id === 'rec-rhea')!;
    const fields: IntakeFields = { ...current.intake, acknowledged: true };
    const attempt = saveDraft(data, ctxFor('rhea'), {
      draftId: null,
      recordId: null,
      source: { mode: 'self_service', siteId: null, coordinatorId: null, capturedOn: '2026-10-26' },
      fields,
    });
    expect(attempt.ok).toBe(false);
    if (!attempt.ok) expect(attempt.code).toBe('already_has_record');
  });
});
