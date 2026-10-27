import { describe, expect, it } from 'vitest';
import { claimRecord, inviteAccount } from './account';
import { ctxFor, fresh } from '../test/helpers';
import type { DomainData } from './types';

function step<T extends { ok: boolean }>(result: T): T & { ok: true } {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as T & { ok: true };
}

describe('account invitation and claim', () => {
  it('a coordinator invites an assisted person; the claim links the same record and creates no new one', () => {
    let data: DomainData = fresh();
    const before = data.records.length;
    data = step(inviteAccount(data, ctxFor('coord-b'), { recordId: 'rec-dani' })).data;
    const code = data.records.find((r) => r.id === 'rec-dani')!.inviteCode!;
    expect(code).toMatch(/^INV-/);
    const claimed = step(claimRecord(data, { ...ctxFor('jun'), actor: { role: 'creative', id: 'person-dani' } }, { code }));
    expect(claimed.id).toBe('rec-dani');
    expect(claimed.data.records.length).toBe(before);
    const dani = claimed.data.records.find((r) => r.id === 'rec-dani')!;
    expect(dani.personId).toBe('person-dani');
    expect(dani.accountState).toBe('active');
    expect(dani.inviteCode).toBeNull();
  });

  it('inviting twice returns the same code', () => {
    const first = step(inviteAccount(fresh(), ctxFor('coord-b'), { recordId: 'rec-dani' }));
    const second = step(inviteAccount(first.data, ctxFor('coord-b'), { recordId: 'rec-dani' }));
    expect(second.data.records.find((r) => r.id === 'rec-dani')!.inviteCode).toBe(
      first.data.records.find((r) => r.id === 'rec-dani')!.inviteCode,
    );
  });

  it('a coordinator from another site cannot invite', () => {
    expect(inviteAccount(fresh(), ctxFor('coord-a'), { recordId: 'rec-dani' }).ok).toBe(false);
  });

  it('invitations need a connection', () => {
    expect(inviteAccount(fresh(), ctxFor('coord-b', { online: false }), { recordId: 'rec-dani' }).ok).toBe(false);
  });

  it('does not send a new invitation for a linked alias', () => {
    const data = fresh();
    const records = data.records.map((record) => {
      if (record.id !== 'rec-joel-2') return record;
      return { ...record, application: { ...record.application, duplicate: { candidateRecordId: 'rec-joel', status: 'linked' as const, reason: 'Same record (demo).' } } };
    });
    const linked = { ...data, records };
    expect(inviteAccount(linked, ctxFor('coord-a'), { recordId: 'rec-joel-2' })).toMatchObject({ ok: false, code: 'linked_alias' });
  });

  it('a wrong code is refused with a specific message', () => {
    const result = claimRecord(fresh(), ctxFor('jun'), { code: 'INV-9999' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('invalid_code');
  });

  it('a person who already has a record cannot claim a second one', () => {
    const data: DomainData = step(inviteAccount(fresh(), ctxFor('coord-a'), { recordId: 'rec-vina' })).data;
    const code = data.records.find((r) => r.id === 'rec-vina')!.inviteCode!;
    const result = claimRecord(data, ctxFor('rhea'), { code });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('already_has_record');
  });
});
