import { describe, expect, it } from 'vitest';
import { approvePublicContent, listingStatus, publicFingerprint, setListing } from './visibility';
import { approveApplication, editProfile, startReview } from './application';
import { publicDirectory } from './publicProfile';
import { openCase } from './cases';
import { ctxFor, fresh } from '../test/helpers';
import type { CreativeRecord, DomainData } from './types';

function step<T extends { ok: boolean }>(result: T): T & { ok: true } {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as T & { ok: true };
}

function rec(data: DomainData, id: string): CreativeRecord {
  const found = data.records.find((r) => r.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
}

describe('public listing rules', () => {
  it('verification alone never publishes: an unlisted verified record stays off the directory', () => {
    const data = fresh();
    expect(listingStatus(rec(data, 'rec-joel'))).toBe('not_listed');
  });

  it('opted in but unverified waits for verification', () => {
    // Ines is received but not yet verified. Give her an account for this scenario.
    const data: DomainData = fresh();
    const owned: DomainData = { ...data, records: data.records.map((r) => (r.id === 'rec-ines' ? { ...r, personId: 'person-ines' } : r)) };
    const ctx = { ...ctxFor('noel'), actor: { role: 'creative' as const, id: 'person-ines' } };
    const optedIn = setListing(owned, ctx, { recordId: 'rec-ines', optedIn: true });
    if (!optedIn.ok) throw new Error(optedIn.message);
    expect(listingStatus(rec(optedIn.data, 'rec-ines'))).toBe('waiting_verification');
  });

  it('content approved while opted out lists immediately when the creative opts in later', () => {
    let data: DomainData = fresh();
    data = { ...data, records: data.records.map((r) => (r.id === 'rec-ines' ? { ...r, personId: 'person-ines' } : r)) };
    data = step(startReview(data, ctxFor('council'), 'rec-ines')).data;
    data = step(approveApplication(data, ctxFor('council'), { recordId: 'rec-ines', approvePublicContent: true })).data;
    expect(listingStatus(rec(data, 'rec-ines'))).toBe('not_listed');
    const optedIn = setListing(data, { ...ctxFor('noel'), actor: { role: 'creative', id: 'person-ines' } }, { recordId: 'rec-ines', optedIn: true });
    expect(listingStatus(rec(step(optedIn).data, 'rec-ines'))).toBe('listed');
  });

  it('opt-in after verification waits for council approval of the public content, then lists', () => {
    // Joel is verified and opted out. Give him an account for this scenario and clear his approval.
    const data: DomainData = fresh();
    const joelOwned: DomainData = {
      ...data,
      records: data.records.map((r) => (r.id === 'rec-joel' ? { ...r, personId: 'person-joel', publicApprovedFingerprint: null } : r)),
    };
    expect(setListing(joelOwned, ctxFor('noel'), { recordId: 'rec-joel', optedIn: true }).ok).toBe(false);
    const optedIn = setListing(joelOwned, { ...ctxFor('noel'), actor: { role: 'creative', id: 'person-joel' } }, { recordId: 'rec-joel', optedIn: true });
    if (!optedIn.ok) throw new Error(optedIn.message);
    expect(listingStatus(rec(optedIn.data, 'rec-joel'))).toBe('pending_review');

    const approved = approvePublicContent(optedIn.data, ctxFor('council'), 'rec-joel');
    if (!approved.ok) throw new Error(approved.message);
    expect(listingStatus(rec(approved.data, 'rec-joel'))).toBe('listed');
  });

  it('changing a public field hides the listing until the council approves the new content', () => {
    const data = fresh();
    const current = rec(data, 'rec-noel');
    const changed = editProfile(data, ctxFor('noel'), { recordId: 'rec-noel', fields: { ...current.intake, practice: 'Animation' } });
    if (!changed.ok) throw new Error(changed.message);
    expect(listingStatus(rec(changed.data, 'rec-noel'))).toBe('pending_review');
  });

  it('changing the creative domain waits for public-content approval', () => {
    const data = fresh();
    const current = rec(data, 'rec-noel');
    const fields = { ...current.intake, domain: 'Performing Arts' } as typeof current.intake;
    const changed = editProfile(data, ctxFor('noel'), { recordId: 'rec-noel', fields });
    if (!changed.ok) throw new Error(changed.message);
    const record = rec(changed.data, 'rec-noel');
    expect(publicFingerprint(record.intake)).not.toBe(publicFingerprint(current.intake));
    expect(record.application.updatePending).toBe(true);
    expect(listingStatus(record)).toBe('pending_review');
    expect(publicDirectory(changed.data).some((profile) => profile.id === record.id)).toBe(false);
  });

  it('changing a non-public field keeps the listing visible', () => {
    const data = fresh();
    const current = rec(data, 'rec-noel');
    const changed = editProfile(data, ctxFor('noel'), { recordId: 'rec-noel', fields: { ...current.intake, interests: ['Mentoring'] } });
    if (!changed.ok) throw new Error(changed.message);
    expect(listingStatus(rec(changed.data, 'rec-noel'))).toBe('listed');
  });

  it('turning visibility off removes the listing without touching the verified state', () => {
    const data = fresh();
    const off = setListing(data, ctxFor('noel'), { recordId: 'rec-noel', optedIn: false });
    if (!off.ok) throw new Error(off.message);
    const record = rec(off.data, 'rec-noel');
    expect(listingStatus(record)).toBe('not_listed');
    expect(record.application.state).toBe('verified');
  });

  it('prevents turning listing back on while a withdrawal request is still open', () => {
    const opened = step(openCase(fresh(), ctxFor('noel'), { kind: 'withdrawal', recordId: 'rec-noel', reason: 'Please remove the public listing.' }));
    const optBackIn = setListing(opened.data, ctxFor('noel'), { recordId: 'rec-noel', optedIn: true });
    expect(optBackIn).toMatchObject({ ok: false, code: 'withdrawal_pending' });
    expect(rec(opened.data, 'rec-noel').optedIn).toBe(false);
  });

  it('only the creator can change the listing choice', () => {
    expect(setListing(fresh(), ctxFor('council'), { recordId: 'rec-noel', optedIn: false }).ok).toBe(false);
    expect(setListing(fresh(), ctxFor('rhea'), { recordId: 'rec-noel', optedIn: false }).ok).toBe(false);
  });

  it('never projects a linked alias into the public directory, even if historical fields say it was approved', () => {
    const data = fresh();
    const alias = data.records.find((record) => record.id === 'rec-joel-2')!;
    const linked = { ...data, records: data.records.map((record) => record.id === alias.id ? {
      ...record, personId: 'person-joel-2', optedIn: true,
      application: { ...record.application, state: 'verified' as const, duplicate: { candidateRecordId: 'rec-joel', status: 'linked' as const, reason: 'Same record (demo).' } },
      publicApprovedFingerprint: publicFingerprint(record.intake),
    } : record) };
    expect(publicDirectory(linked).some((profile) => profile.id === alias.id)).toBe(false);
  });
});
