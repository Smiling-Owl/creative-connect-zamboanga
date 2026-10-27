import { can } from './policy';
import { cloneData, fail, findRecord, log, nextId, nextReference, nextDeviceRef, normalize, reasonMissing, requireReason } from './core';
import { publicFingerprint } from './visibility';
import { isCreativeDomain } from './taxonomy';
import { creativeFollowUp } from './drafts';
import type {
  Application,
  CreativeRecord,
  Ctx,
  DomainData,
  IntakeFields,
  IntakeSource,
  Result,
} from './types';

// Intake, receipt, council review, and profile maintenance for creative records.
// A record exists only after the council receives it. Queued items are not records.
// Review runs in order: received → under_review → verified (or changes requested / declined).

export interface IntakeValidationError {
  field: string;
  message: string;
}

export function intakeValidationErrors(fields: IntakeFields): IntakeValidationError[] {
  const errors: IntakeValidationError[] = [];
  if (fields.displayName.trim() === '') errors.push({ field: 'displayName', message: 'Add a display name. It can be a first name or a nickname.' });
  if (fields.name.trim() === '') errors.push({ field: 'name', message: 'Add a name for the council record.' });
  if (!isCreativeDomain(fields.domain)) errors.push({ field: 'domain', message: 'Choose one of the nine creative domains.' });
  if (fields.practice.trim() === '') errors.push({ field: 'practice', message: 'Add your specific creative practice in your own words.' });
  if (fields.area.trim() === '') errors.push({ field: 'area', message: 'Choose a general location.' });
  if (!fields.skills.some((skill) => skill.trim() !== '')) errors.push({ field: 'skills', message: 'Add at least one non-empty skill.' });
  if (!fields.evidence.some((item) => item.text.trim() !== '')) {
    errors.push({ field: 'evidence', message: 'Describe at least one piece of work evidence. A polished portfolio is not required.' });
  }
  if (fields.followUp.kind === 'coordinator_mediated' && fields.followUp.coordinatorId.trim() === '') {
    errors.push({ field: 'followUp', message: 'Name the coordinator who will follow up.' });
  }
  if (fields.followUp.kind === 'own_channel' && fields.followUp.channelLabel.trim() === '') {
    errors.push({ field: 'followUp', message: 'Choose a follow-up route or ask for coordinator help.' });
  }
  if (!fields.acknowledged) errors.push({ field: 'acknowledged', message: 'Confirm the information-use notice before sending.' });
  return errors;
}

export function validateIntake(fields: IntakeFields): string | null {
  return intakeValidationErrors(fields)[0]?.message ?? null;
}

/**
 * Changes that need council review on a verified record: practice, skills, evidence, and anything that changes
 * the public content (display name, area, public evidence). Verification is kept; the change waits for review.
 * Interests and the name for the council record do not change what is public or what is verified.
 */
export function isSubstantiveChange(before: IntakeFields, after: IntakeFields): boolean {
  return (
    normalize(before.practice) !== normalize(after.practice) ||
    JSON.stringify([...before.skills].sort()) !== JSON.stringify([...after.skills].sort()) ||
    JSON.stringify(before.evidence) !== JSON.stringify(after.evidence) ||
    publicFingerprint(before) !== publicFingerprint(after)
  );
}

/**
 * Flags a possible duplicate for council review: same display name and area, or the same own-channel contact label.
 * This is a demo heuristic. It never merges records and never changes a verification decision.
 */
export function findPossibleDuplicate(data: DomainData, fields: IntakeFields): string | null {
  const name = normalize(fields.displayName);
  const area = normalize(fields.area);
  const contact = fields.followUp.kind === 'own_channel' ? normalize(fields.followUp.channelLabel) : '';
  const match = data.records.find((r) => {
    const sameName = normalize(r.intake.displayName) === name && normalize(r.intake.area) === area;
    const sameContact =
      contact !== '' && r.intake.followUp.kind === 'own_channel' && normalize(r.intake.followUp.channelLabel) === contact;
    return sameName || sameContact;
  });
  return match?.id ?? null;
}

function siteCodeFor(data: DomainData, siteId: string | null): string {
  return data.sites.find((s) => s.id === siteId)?.code ?? 'X';
}

/** Creates the record and its received application. Mutates the cloned data. */
export function receiveNewApplication(
  d: DomainData,
  ctx: Ctx,
  input: { fields: IntakeFields; source: IntakeSource; optedIn: boolean; personId: string | null; viaId: string | null },
): string {
  const recordId = nextId(d, 'rec');
  const reference = nextReference(d);
  const candidate = findPossibleDuplicate(d, input.fields);
  const application: Application = {
    reference,
    state: 'received',
    version: 1,
    receivedAt: ctx.at,
    reason: null,
    duplicate: candidate ? { candidateRecordId: candidate, status: 'open', reason: null } : null,
    updatePending: false,
    updateReason: null,
  };
  const created: CreativeRecord = {
    id: recordId,
    personId: input.personId,
    accountState: input.personId ? 'active' : 'none',
    inviteCode: null,
    intake: input.fields,
    source: input.source,
    siteId: input.source.siteId,
    coordinatorId: input.source.coordinatorId,
    optedIn: input.optedIn,
    publicApprovedFingerprint: null,
    application,
    lastConfirmed: ctx.at,
    internalNotes: [],
  };
  d.records.push(created);
  log(d, ctx, { entityType: 'record', entityId: recordId, action: 'received', to: 'received', viaId: input.viaId });
  if (candidate) {
    log(d, ctx, { entityType: 'record', entityId: recordId, action: 'duplicate_flagged', to: candidate, viaId: input.viaId });
    log(d, ctx, { entityType: 'record', entityId: candidate, action: 'possible_duplicate_of', to: recordId, viaId: input.viaId });
  }
  return recordId;
}

/** Applies a received correction or resubmission to an existing record. Mutates the cloned data. */
export function applyReceivedFields(
  d: DomainData,
  ctx: Ctx,
  recordId: string,
  fields: IntakeFields,
  viaId: string | null,
  optedIn?: boolean,
): void {
  const target = findRecord(d, recordId)!;
  const before = target.intake;
  const wasVerified = target.application.state === 'verified';
  target.intake = fields;
  target.lastConfirmed = ctx.at;
  if (optedIn !== undefined && target.optedIn !== optedIn) {
    const from = target.optedIn ? 'on' : 'off';
    target.optedIn = optedIn;
    log(d, ctx, { entityType: 'record', entityId: recordId, action: 'listing_choice_changed', from, to: optedIn ? 'on' : 'off', viaId });
  }
  if (wasVerified) {
    if (isSubstantiveChange(before, fields)) target.application.updatePending = true;
    // A new creative edit answers any earlier request for changes to the update.
    target.application.updateReason = null;
    log(d, ctx, { entityType: 'record', entityId: recordId, action: 'profile_changed', from: 'verified', to: 'verified', viaId });
    return;
  }
  const from = target.application.state;
  target.application.version += 1;
  target.application.state = 'received';
  target.application.reason = null;
  log(d, ctx, { entityType: 'record', entityId: recordId, action: 'resubmitted', from, to: 'received', viaId });
}

/** One record per creative. A second record for the same person would split their referrals and status. */
function hasRecordFor(data: DomainData, personId: string): boolean {
  return data.records.some((r) => r.personId === personId);
}

/** Online submission by a creative (self-service) or coordinator (assisted). Removes the draft. */
export function submitIntake(data: DomainData, ctx: Ctx, input: { draftId: string; optedIn: boolean }): Result {
  if (!ctx.settings.online) {
    return fail('offline', 'You are offline, so this cannot be sent yet. Your draft is saved on this device.');
  }
  const draft = data.drafts.find((d) => d.id === input.draftId);
  if (!draft) return fail('not_found', 'This draft is no longer waiting to be sent. Check the status list before sending again.');
  if (draft.ownerId !== ctx.actor.id) return fail('forbidden', 'Only the person who started this draft can send it.');
  if (!can(ctx.actor, 'submit_intake', { siteId: draft.source.siteId, personId: draft.ownerId })) {
    return fail('forbidden', 'This draft is outside your permissions.');
  }
  const problem = validateIntake(draft.fields);
  if (problem) return fail('invalid', problem);

  const next = cloneData(data);
  next.drafts = next.drafts.filter((d) => d.id !== draft.id);

  if (draft.recordId) {
    const record = findRecord(next, draft.recordId);
    if (!record) return fail('not_found', 'The record for this correction could not be found.');
    if (record.application.state !== 'changes_requested') {
      return fail('not_correctable', 'This record is not waiting for changes, so there is nothing to resubmit.');
    }
    applyReceivedFields(next, ctx, record.id, draft.fields, ctx.actor.role === 'coordinator' ? ctx.actor.id : null, input.optedIn);
    return { ok: true, data: next, id: record.id };
  }

  if (ctx.actor.role === 'creative' && hasRecordFor(next, ctx.actor.id)) {
    return fail('already_has_record', 'You already have a record with the council. Edit your profile or respond to the requested changes instead.');
  }

  const recordId = receiveNewApplication(next, ctx, {
    fields: draft.fields,
    source: draft.source,
    optedIn: input.optedIn,
    personId: ctx.actor.role === 'creative' ? ctx.actor.id : null,
    viaId: ctx.actor.role === 'coordinator' ? ctx.actor.id : null,
  });
  return { ok: true, data: next, id: recordId };
}

/** Coordinator device queues a completed intake while offline. The council has not received it yet. */
export function enqueueSubmission(data: DomainData, ctx: Ctx, input: { draftId: string; optedIn: boolean }): Result {
  if (ctx.actor.role !== 'coordinator') return fail('forbidden', 'Only a coordinator device queues assisted intake.');
  if (ctx.settings.online) return fail('connected', 'You are connected, so send it now instead of queueing it.');
  const draft = data.drafts.find((d) => d.id === input.draftId);
  if (!draft) return fail('not_found', 'This draft is no longer waiting. Check the queue before adding it again.');
  if (draft.ownerId !== ctx.actor.id || !can(ctx.actor, 'submit_intake', { siteId: draft.source.siteId })) {
    return fail('forbidden', 'This draft is outside your site.');
  }
  const problem = validateIntake(draft.fields);
  if (problem) return fail('invalid', problem);

  const next = cloneData(data);
  next.drafts = next.drafts.filter((d) => d.id !== draft.id);
  let baseVersion = 0;
  if (draft.recordId) {
    const record = findRecord(next, draft.recordId);
    if (!record) return fail('not_found', 'The record for this correction could not be found.');
    if (record.application.state !== 'changes_requested') {
      return fail('not_correctable', 'This record is not waiting for changes, so there is nothing to queue.');
    }
    baseVersion = record.application.version;
  }
  const id = nextId(next, 'queue');
  const deviceRef = nextDeviceRef(next, siteCodeFor(next, draft.source.siteId));
  next.queue.push({
    id,
    deviceRef,
    coordinatorId: ctx.actor.id,
    siteId: draft.source.siteId ?? '',
    recordId: draft.recordId,
    kind: draft.recordId ? 'correction' : 'new_application',
    baseVersion,
    fields: draft.fields,
    source: draft.source,
    optedIn: input.optedIn,
    status: 'waiting',
    attempts: 0,
    lastError: null,
    deliveredRecordId: null,
    queuedAt: ctx.at,
  });
  log(next, ctx, { entityType: 'queue', entityId: id, action: 'queued', to: 'waiting', viaId: ctx.actor.id });
  return { ok: true, data: next, id };
}

/** Council starts reviewing a received record. This is the only route into review. */
export function startReview(data: DomainData, ctx: Ctx, recordId: string): Result {
  if (!can(ctx.actor, 'council_review')) return fail('forbidden', 'Only council staff can start a review.');
  const record = findRecord(data, recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (record.application.state !== 'received') return fail('invalid_state', 'Only newly received records can start review.');
  const next = cloneData(data);
  const target = findRecord(next, recordId)!;
  target.application.state = 'under_review';
  log(next, ctx, { entityType: 'record', entityId: recordId, action: 'review_started', from: 'received', to: 'under_review' });
  return { ok: true, data: next, id: recordId };
}

/**
 * Council verifies a record that is under review. Blocked while a possible duplicate is open or linked.
 * Public content is approved here when requested, whether or not the creative has opted in yet,
 * so a later opt-in lists immediately.
 */
export function approveApplication(
  data: DomainData,
  ctx: Ctx,
  input: { recordId: string; approvePublicContent: boolean },
): Result {
  if (!can(ctx.actor, 'council_decide')) return fail('forbidden', 'Only council staff can verify a record.');
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (record.application.state !== 'under_review') {
    return fail('invalid_state', 'Start review before verifying this record.');
  }
  const duplicate = record.application.duplicate;
  if (duplicate?.status === 'open') {
    return fail('duplicate_open', 'Resolve the possible duplicate before verifying. Confirm whether this is the same person.');
  }
  if (duplicate?.status === 'linked') {
    return fail('duplicate_linked', 'This record is linked to an existing record. Its history stays with that record, so it cannot be verified separately.');
  }
  const next = cloneData(data);
  const target = findRecord(next, input.recordId)!;
  target.application.state = 'verified';
  target.application.reason = null;
  target.lastConfirmed = ctx.at;
  log(next, ctx, { entityType: 'record', entityId: target.id, action: 'verified', from: 'under_review', to: 'verified' });
  if (input.approvePublicContent) {
    target.publicApprovedFingerprint = publicFingerprint(target.intake);
    target.application.updatePending = false;
    target.application.updateReason = null;
    log(next, ctx, { entityType: 'record', entityId: target.id, action: 'public_content_approved', to: 'public_content_approved' });
  }
  return { ok: true, data: next, id: target.id };
}

export function requestChanges(data: DomainData, ctx: Ctx, input: { recordId: string; reason: string }): Result {
  if (!can(ctx.actor, 'council_decide')) return fail('forbidden', 'Only council staff can request changes.');
  const reason = requireReason(input.reason);
  if (!reason) return reasonMissing('request changes');
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (record.application.state !== 'under_review') {
    return fail('invalid_state', 'Start review before requesting changes.');
  }
  const next = cloneData(data);
  const target = findRecord(next, input.recordId)!;
  target.application.state = 'changes_requested';
  target.application.reason = reason;
  log(next, ctx, { entityType: 'record', entityId: target.id, action: 'changes_requested', from: 'under_review', to: 'changes_requested', reason });
  return { ok: true, data: next, id: target.id };
}

export function declineApplication(data: DomainData, ctx: Ctx, input: { recordId: string; reason: string }): Result {
  if (!can(ctx.actor, 'council_decide')) return fail('forbidden', 'Only council staff can decline a record.');
  const reason = requireReason(input.reason);
  if (!reason) return reasonMissing('decline');
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (record.application.state !== 'under_review') {
    return fail('invalid_state', 'Start review before declining this record.');
  }
  const next = cloneData(data);
  const target = findRecord(next, input.recordId)!;
  target.application.state = 'declined';
  target.application.reason = reason;
  log(next, ctx, { entityType: 'record', entityId: target.id, action: 'declined', from: 'under_review', to: 'declined', reason });
  return { ok: true, data: next, id: target.id };
}

/**
 * Council decides whether a flagged possible duplicate is the same person.
 * "Linked" keeps both histories and blocks separate verification of this record; it does not merge them.
 */
export function resolveDuplicate(
  data: DomainData,
  ctx: Ctx,
  input: { recordId: string; decision: 'not_duplicate' | 'linked'; reason: string },
): Result {
  if (!can(ctx.actor, 'council_decide')) return fail('forbidden', 'Only council staff can resolve a duplicate.');
  const reason = requireReason(input.reason);
  if (!reason) return reasonMissing('resolve this duplicate');
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (!record.application.duplicate || record.application.duplicate.status !== 'open') {
    return fail('no_open_duplicate', 'There is no open duplicate to resolve for this record.');
  }
  const next = cloneData(data);
  const target = findRecord(next, input.recordId)!;
  const flag = target.application.duplicate!;
  flag.status = input.decision;
  flag.reason = reason;
  log(next, ctx, { entityType: 'record', entityId: target.id, action: 'duplicate_resolved', to: input.decision, reason });
  const candidate = findRecord(next, flag.candidateRecordId);
  if (candidate && input.decision === 'linked') {
    log(next, ctx, { entityType: 'record', entityId: candidate.id, action: 'duplicate_linked_from', to: target.id, reason });
  }
  return { ok: true, data: next, id: target.id };
}

/** Council decides on a pending update to a verified profile. Approval refreshes the approved public content. */
export function resolveUpdate(
  data: DomainData,
  ctx: Ctx,
  input: { recordId: string; decision: 'approve' | 'request_changes'; reason?: string },
): Result {
  if (!can(ctx.actor, 'council_decide')) return fail('forbidden', 'Only council staff can review a profile update.');
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (record.application.state !== 'verified' || !record.application.updatePending) {
    return fail('no_pending_update', 'This record has no profile update waiting for review.');
  }
  const next = cloneData(data);
  const target = findRecord(next, input.recordId)!;
  if (input.decision === 'approve') {
    target.application.updatePending = false;
    target.application.updateReason = null;
    target.publicApprovedFingerprint = publicFingerprint(target.intake);
    log(next, ctx, { entityType: 'record', entityId: target.id, action: 'update_approved', from: 'update_pending', to: 'verified' });
    return { ok: true, data: next, id: target.id };
  }
  const reason = requireReason(input.reason);
  if (!reason) return reasonMissing('ask for changes');
  target.application.updateReason = reason;
  log(next, ctx, { entityType: 'record', entityId: target.id, action: 'update_changes_requested', from: 'update_pending', to: 'update_pending', reason });
  return { ok: true, data: next, id: target.id };
}

/** Creator edits a verified profile. Substantive edits set updatePending; verification is kept. */
export function editProfile(data: DomainData, ctx: Ctx, input: { recordId: string; fields: IntakeFields }): Result {
  const record = findRecord(data, input.recordId);
  if (!record) return fail('not_found', 'That record could not be found.');
  if (!can(ctx.actor, 'edit_own_record', { personId: record.personId })) {
    return fail('forbidden', 'Only the creator can edit this profile.');
  }
  if (record.application.state !== 'verified') {
    return fail('locked_for_review', 'This application is being reviewed. You can add information when the council asks for changes.');
  }
  const problem = validateIntake(input.fields);
  if (problem) return fail('invalid', problem);
  const followUp = creativeFollowUp(record.intake.followUp, input.fields.followUp);
  if (!followUp) return fail('invalid', 'Ask a coordinator to set up coordinator-mediated follow-up. You can choose your own channel here.');
  const next = cloneData(data);
  applyReceivedFields(next, ctx, input.recordId, { ...input.fields, followUp }, null);
  return { ok: true, data: next, id: input.recordId };
}
