import { describe, expect, it } from 'vitest';
import { saveDraft } from './drafts';
import { ctxFor, fresh } from '../test/helpers';
import type { IntakeFields } from './types';

function fieldsFor(displayName: string, followUp: IntakeFields['followUp']): IntakeFields {
  return {
    name: displayName,
    displayName,
    practice: 'Illustration',
    skills: ['Ink'],
    area: 'Area 2 (broad, fictional)',
    interests: [],
    followUp,
    evidence: [],
    acknowledged: false,
  };
}

describe('draft source is derived from the acting user', () => {
  it('a creative cannot claim assisted intake or name a site', () => {
    const result = saveDraft(fresh(), ctxFor('jun'), {
      draftId: null,
      recordId: null,
      source: { mode: 'assisted', siteId: 'site-a', coordinatorId: 'coord-a', capturedOn: '2026-10-26' },
      fields: fieldsFor('Jun (demo)', { kind: 'own_channel', channelLabel: 'Demo contact: Jun (fictional)' }),
    });
    if (!result.ok) throw new Error(result.message);
    const draft = result.data.drafts.find((d) => d.id === result.id)!;
    expect(draft.source).toMatchObject({ mode: 'self_service', siteId: null, coordinatorId: null });
  });

  it('a coordinator cannot name another coordinator as the assistant', () => {
    const result = saveDraft(fresh(), ctxFor('coord-a'), {
      draftId: null,
      recordId: null,
      source: { mode: 'assisted', siteId: 'site-b', coordinatorId: 'coord-b', capturedOn: '2026-10-26' },
      fields: fieldsFor('Pat (demo)', { kind: 'coordinator_mediated', coordinatorId: 'coord-b' }),
    });
    if (!result.ok) throw new Error(result.message);
    const draft = result.data.drafts.find((d) => d.id === result.id)!;
    expect(draft.source).toMatchObject({ mode: 'assisted', siteId: 'site-a', coordinatorId: 'coord-a' });
    expect(draft.fields.followUp).toEqual({ kind: 'coordinator_mediated', coordinatorId: 'coord-a' });
  });

  it('a creative cannot set coordinator-mediated follow-up on their own', () => {
    const result = saveDraft(fresh(), ctxFor('jun'), {
      draftId: null,
      recordId: null,
      source: { mode: 'self_service', siteId: null, coordinatorId: null, capturedOn: '2026-10-26' },
      fields: fieldsFor('Jun (demo)', { kind: 'coordinator_mediated', coordinatorId: 'coord-a' }),
    });
    expect(result.ok).toBe(false);
  });
});
