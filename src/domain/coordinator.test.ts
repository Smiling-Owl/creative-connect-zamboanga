import { describe, expect, it } from 'vitest';
import { assistProfileUpdate, recordFollowupNote } from './coordinator';
import { listingStatus } from './visibility';
import { ctxFor, fresh } from '../test/helpers';

describe('recordFollowupNote', () => {
  it('requires a note and appends it to the assigned record audit trail', () => {
    const data = fresh();
    const blank = recordFollowupNote(data, ctxFor('coord-a'), { recordId: 'rec-rhea', note: '  ' });
    expect(blank).toMatchObject({ ok: false, code: 'reason_required' });
    const result = recordFollowupNote(data, ctxFor('coord-a'), { recordId: 'rec-rhea', note: 'Person asked for a call next week (fictional).' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.audit.at(-1)).toMatchObject({
      entityType: 'record', entityId: 'rec-rhea', action: 'followup_note_recorded',
      actor: { role: 'coordinator', id: 'coord-a' }, via: 'coord-a',
      reason: 'Person asked for a call next week (fictional).',
    });
    expect(data.audit).toHaveLength(0);
  });

  it('denies a coordinator assigned to another site', () => {
    expect(recordFollowupNote(fresh(), ctxFor('coord-b'), { recordId: 'rec-rhea', note: 'Follow up (fictional).' }))
      .toMatchObject({ ok: false, code: 'forbidden' });
  });
});

describe('consented assisted profile maintenance', () => {
  it('updates an assigned verified record with consent while keeping the same owner, source, reference, and referrals', () => {
    const data = fresh();
    const before = data.records.find((item) => item.id === 'rec-rhea')!;
    const result = assistProfileUpdate(data, ctxFor('coord-a'), { recordId: before.id, fields: { ...before.intake, practice: 'Poster and identity design' }, personAgreed: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const updated = result.data.records.find((item) => item.id === before.id)!;
    expect(updated).toMatchObject({ personId: before.personId, source: before.source, siteId: before.siteId, coordinatorId: before.coordinatorId, optedIn: before.optedIn });
    expect(updated.application).toMatchObject({ reference: before.application.reference, state: 'verified', updatePending: true });
    expect(listingStatus(updated)).toBe('pending_review');
    expect(result.data.referrals).toEqual(data.referrals);
    expect(result.data.audit.at(-1)).toMatchObject({ entityType: 'record', entityId: before.id, action: 'profile_changed', via: 'coord-a' });
  });

  it('normalizes a new coordinator-mediated follow-up to the acting coordinator', () => {
    const data = fresh();
    const before = data.records.find((item) => item.id === 'rec-rhea')!;
    const result = assistProfileUpdate(data, ctxFor('coord-a'), { recordId: before.id, personAgreed: true, fields: { ...before.intake, followUp: { kind: 'coordinator_mediated', coordinatorId: 'invented-coordinator' } } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.records.find((item) => item.id === before.id)?.intake.followUp).toEqual({ kind: 'coordinator_mediated', coordinatorId: 'coord-a' });
  });

  it('preserves an update reason for contact-only edits and rejects missing consent, offline, wrong-site, nonverified, and linked records unchanged', () => {
    const data = fresh();
    const rec = data.records.find((item) => item.id === 'rec-rhea')!;
    const pending = { ...data, records: data.records.map((item) => item.id === rec.id ? { ...item, application: { ...item.application, updatePending: true, updateReason: 'Please choose a different public sample.' } } : item) };
    const contactOnly = assistProfileUpdate(pending, ctxFor('coord-a'), { recordId: rec.id, personAgreed: true, fields: { ...rec.intake, followUp: { kind: 'own_channel', channelLabel: 'Ask me in person (fictional)' } } });
    expect(contactOnly.ok && contactOnly.data.records.find((item) => item.id === rec.id)?.application.updateReason).toBe('Please choose a different public sample.');
    const snapshot = JSON.stringify(data);
    expect(assistProfileUpdate(data, ctxFor('coord-a'), { recordId: rec.id, personAgreed: false, fields: rec.intake })).toMatchObject({ ok: false, code: 'consent_required' });
    expect(assistProfileUpdate(data, ctxFor('coord-a', { online: false }), { recordId: rec.id, personAgreed: true, fields: rec.intake })).toMatchObject({ ok: false, code: 'offline' });
    expect(assistProfileUpdate(data, ctxFor('coord-b'), { recordId: rec.id, personAgreed: true, fields: rec.intake })).toMatchObject({ ok: false, code: 'forbidden' });
    expect(assistProfileUpdate(data, ctxFor('noel'), { recordId: rec.id, personAgreed: true, fields: rec.intake })).toMatchObject({ ok: false, code: 'forbidden' });
    expect(assistProfileUpdate(data, ctxFor('coord-b'), { recordId: 'rec-ines', personAgreed: true, fields: data.records.find((item) => item.id === 'rec-ines')!.intake })).toMatchObject({ ok: false, code: 'invalid_state' });
    const linked = { ...data, records: data.records.map((item) => item.id === rec.id ? { ...item, application: { ...item.application, duplicate: { candidateRecordId: 'rec-noel', status: 'linked' as const, reason: 'Linked in test.' } } } : item) };
    expect(assistProfileUpdate(linked, ctxFor('coord-a'), { recordId: rec.id, personAgreed: true, fields: rec.intake })).toMatchObject({ ok: false, code: 'linked_alias' });
    expect(JSON.stringify(data)).toBe(snapshot);
  });
});
