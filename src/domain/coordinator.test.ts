import { describe, expect, it } from 'vitest';
import { recordFollowupNote } from './coordinator';
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
