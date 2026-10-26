import { describe, expect, it } from 'vitest';
import { can } from './policy';
import { approveApplication, declineApplication, enqueueSubmission } from './application';
import { syncQueue } from './queue';
import { saveDraft } from './drafts';
import { ctxFor, fresh } from '../test/helpers';

describe('permission boundaries', () => {
  it('guests can only view public information', () => {
    const guest = ctxFor('guest').actor;
    expect(can(guest, 'view_public')).toBe(true);
    expect(can(guest, 'submit_intake', { personId: 'person-jun' })).toBe(false);
    expect(can(guest, 'council_decide')).toBe(false);
  });

  it('a creative can act only on their own record', () => {
    const rhea = ctxFor('rhea').actor;
    expect(can(rhea, 'edit_own_record', { personId: 'person-rhea' })).toBe(true);
    expect(can(rhea, 'edit_own_record', { personId: 'person-noel' })).toBe(false);
  });

  it('a coordinator never approves, declines, or grants roles, and only acts within the assigned site', () => {
    const coordA = ctxFor('coord-a').actor;
    expect(can(coordA, 'council_decide')).toBe(false);
    expect(can(coordA, 'assist_record', { siteId: 'site-a' })).toBe(true);
    expect(can(coordA, 'assist_record', { siteId: 'site-b' })).toBe(false);
  });

  it('a coordinator cannot approve or decline in practice', () => {
    const data = fresh();
    expect(approveApplication(data, ctxFor('coord-a'), { recordId: 'rec-gwen', approvePublicContent: false }).ok).toBe(false);
    expect(declineApplication(data, ctxFor('coord-a'), { recordId: 'rec-gwen', reason: 'Trying.' }).ok).toBe(false);
  });

  it('a coordinator from site B cannot queue or send a site A draft', () => {
    const data = fresh();
    expect(enqueueSubmission(data, ctxFor('coord-b', { online: false }), { draftId: 'draft-mika', optedIn: false }).ok).toBe(false);
  });

  it('a coordinator cannot sync items queued by another coordinator', () => {
    // Queue a waiting Site A item, then try to send it as the Site B coordinator.
    const base = fresh();
    const mika = base.drafts.find((d) => d.id === 'draft-mika')!;
    const drafted = saveDraft(base, ctxFor('coord-a'), { draftId: 'draft-mika', recordId: null, source: mika.source, fields: { ...mika.fields, acknowledged: true } });
    if (!drafted.ok) throw new Error(drafted.message);
    const queued = enqueueSubmission(drafted.data, ctxFor('coord-a', { online: false }), { draftId: 'draft-mika', optedIn: false });
    if (!queued.ok) throw new Error(queued.message);
    const result = syncQueue(queued.data, ctxFor('coord-b'));
    if (!result.ok) throw new Error(result.message);
    expect(result.data.queue.find((q) => q.id === queued.id)!.status).toBe('waiting');
    expect(result.data.records.length).toBe(base.records.length);
  });

  it('council staff can make council decisions but a creative cannot', () => {
    const council = ctxFor('council').actor;
    const creative = ctxFor('rhea').actor;
    expect(can(council, 'council_decide')).toBe(true);
    expect(can(creative, 'council_decide')).toBe(false);
  });
});
