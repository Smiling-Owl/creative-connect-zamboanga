import { can } from './policy';
import { cloneData, fail, findRecord, log, nextId } from './core';
import type { Ctx, DomainData, Result } from './types';

// Simulated account links. No credentials are processed. A claim links a person to the record
// that already exists; it never creates a second record for the same person.

/** Coordinator invites an assisted person to claim their existing record. Requires a connection. */
export function inviteAccount(data: DomainData, ctx: Ctx, input: { recordId: string }): Result {
  if (!ctx.settings.online) return fail('offline', 'Invitations need a connection. Try again when connected.');
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (!can(ctx.actor, 'invite_account', { siteId: record.siteId })) {
    return fail('forbidden', 'Only the coordinator for this record’s site can send an invitation.');
  }
  if (record.application.duplicate?.status === 'linked') return fail('linked_alias', 'Linked records keep their history but cannot receive new invitations.');
  if (record.personId) return fail('already_linked', 'This record already has a personal account.');
  if (record.inviteCode) return { ok: true, data, id: record.id };

  const next = cloneData(data);
  const target = findRecord(next, input.recordId)!;
  const code = nextId(next, 'INV');
  target.inviteCode = code;
  target.accountState = 'invited';
  log(next, ctx, { entityType: 'record', entityId: target.id, action: 'account_invited', from: 'none', to: 'invited', viaId: ctx.actor.id });
  return { ok: true, data: next, id: target.id };
}

/** A creative claims the existing record named by an invitation code. Never creates a duplicate record. */
export function claimRecord(data: DomainData, ctx: Ctx, input: { code: string }): Result {
  if (ctx.actor.role !== 'creative') return fail('forbidden', 'Only a creative can claim a record.');
  if (!can(ctx.actor, 'claim_record', { personId: ctx.actor.id })) return fail('forbidden', 'This claim is not available.');
  const code = input.code.trim().toUpperCase();
  const record = data.records.find((r) => r.inviteCode !== null && r.inviteCode.toUpperCase() === code);
  if (!record) return fail('invalid_code', 'That invitation code is not valid. Check it with your coordinator, or ask for a new one.');
  if (record.personId) return fail('already_claimed', 'This record is already linked to an account. Use access recovery if that is not you.');
  if (data.records.some((r) => r.personId === ctx.actor.id)) {
    return fail('already_has_record', 'Your account already has a record. Ask the council to review and link any duplicate records.');
  }

  const next = cloneData(data);
  const target = findRecord(next, record.id)!;
  target.personId = ctx.actor.id;
  target.accountState = 'active';
  target.inviteCode = null;
  log(next, ctx, { entityType: 'record', entityId: target.id, action: 'account_claimed', from: 'invited', to: 'active' });
  return { ok: true, data: next, id: target.id };
}
