import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { PublicProfileCard } from '../../components/PublicProfileCard';
import { Button, Notice, StatusBadge } from '../../components/ui';
import { enqueueSubmission, intakeValidationErrors, submitIntake } from '../../domain/application';
import { openCase } from '../../domain/cases';
import { saveDraft } from '../../domain/drafts';
import { creativeNextAction, creativeView, noticesFor } from '../../domain/selectors';
import { projectPublicIntake } from '../../domain/publicProfile';
import { APPLICATION_LABEL, LISTING_LABEL, UPDATE_PENDING_LABEL } from '../../labels';
import type { IntakeFields, IntakeSource } from '../../domain/types';
import { demoTime, useDemo } from '../../state/store';

const PRACTICES = ['Graphic design', 'Visual arts', 'Digital content', 'Film / video production', 'Crafts', 'Illustration', 'Other'];
const AREAS = ['Area 1 (broad, fictional)', 'Area 2 (broad, fictional)', 'Area 3 (broad, fictional)'];
const INTERESTS = ['Portfolio feedback', 'Business guidance', 'Intellectual property information', 'Training and workshops', 'Referral opportunities'];
const ERROR_TARGETS: Record<string, string> = {
  name: 'intake-name',
  displayName: 'intake-display',
  practice: 'intake-practice',
  area: 'intake-area',
  skills: 'intake-skills',
  evidence: 'intake-evidence',
  followUp: 'intake-followUp',
  acknowledged: 'intake-acknowledged',
};

function stepForField(field: string): 1 | 2 | 3 {
  if (['name', 'displayName', 'followUp'].includes(field)) return 1;
  if (['practice', 'area', 'skills'].includes(field)) return 2;
  return 3;
}

function intakeKey(ownerId: string, localId: string | null): string {
  return `${ownerId}|${localId ?? 'new'}`;
}

function blankFields(): IntakeFields {
  return {
    name: '',
    displayName: '',
    practice: '',
    skills: [],
    area: '',
    interests: [],
    followUp: { kind: 'own_channel', channelLabel: '' },
    evidence: [],
    acknowledged: false,
  };
}

function sourceForToday(at: string): IntakeSource {
  return { mode: 'self_service', siteId: null, coordinatorId: null, capturedOn: at.slice(0, 10) };
}

export function IntakeView({ id }: { id: 'R01' | 'R02' | 'C01' }) {
  const { actor } = useDemo();
  if (id === 'C01') return <CreativeHome />;
  if (id === 'R02') return <IntakeReview />;
  return <IntakeForm key={actor.id} />;
}

function IntakeForm() {
  const { state, actor, run, setIntakeUi } = useDemo();
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const requestedRecordId = params.get('recordId');
  const requestedDraftId = params.get('draftId');
  const requestedFocus = params.get('focus');
  const stepParam = Number(params.get('step'));
  const correctionRecord = requestedRecordId ? state.data.records.find((record) =>
    record.id === requestedRecordId && record.application.state === 'changes_requested' && (actor.role === 'creative'
      ? record.personId === actor.id
      : actor.role === 'coordinator' && record.siteId === actor.siteId && record.application.state === 'changes_requested'),
  ) : null;
  const hasRecord = state.data.records.some((record) => record.personId === actor.id);
  const draft = state.data.drafts.find((item) => item.ownerId === actor.id && item.recordId === (requestedRecordId ?? null) && (!requestedDraftId || item.id === requestedDraftId));
  const key = intakeKey(actor.id, draft?.id ?? requestedDraftId ?? requestedRecordId);
  const returnOpportunityId = state.access.returnOpportunityOwnerId === actor.id ? state.access.returnOpportunityId : null;
  const meta = state.intakeUi[key] ?? { step: 1 as const, optedIn: correctionRecord?.optedIn ?? false, submission: null, returnOpportunityId: requestedRecordId ? null : returnOpportunityId };
  const fields = draft?.fields ?? correctionRecord?.intake ?? blankFields();
  const [error, setError] = useState('');
  const [skillsText, setSkillsText] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (draft || (requestedDraftId && !draft) || started.current || (actor.role === 'creative' && hasRecord && !correctionRecord) || (requestedRecordId && !correctionRecord)) return;
    started.current = true;
    const initial = correctionRecord
      ? { ...correctionRecord.intake, skills: [...correctionRecord.intake.skills], interests: [...correctionRecord.intake.interests], evidence: correctionRecord.intake.evidence.map((item) => ({ ...item })) }
      : blankFields();
    if (actor.role === 'coordinator' && !correctionRecord) initial.followUp = { kind: 'coordinator_mediated', coordinatorId: actor.id };
    run((data, ctx) => saveDraft(data, ctx, {
      draftId: null,
      recordId: requestedRecordId,
      source: sourceForToday(ctx.at),
      fields: initial,
    }));
  }, [actor, correctionRecord, draft, hasRecord, requestedDraftId, requestedRecordId, run]);

  useEffect(() => {
    if (draft && !state.intakeUi[key]) {
      setIntakeUi(key, {
        step: stepParam >= 1 && stepParam <= 3 ? stepParam as 1 | 2 | 3 : 1,
        optedIn: correctionRecord?.optedIn ?? false,
        submission: null,
        returnOpportunityId: requestedRecordId ? null : returnOpportunityId,
      });
    }
  }, [correctionRecord, draft, key, requestedRecordId, returnOpportunityId, setIntakeUi, state.intakeUi, stepParam]);

  useEffect(() => {
    if (!requestedFocus) return;
    const target = document.getElementById(ERROR_TARGETS[requestedFocus] ?? '');
    target?.focus();
    target?.scrollIntoView({ block: 'nearest' });
  }, [draft?.id, requestedFocus, stepParam]);

  const setStep = (step: 1 | 2 | 3) => {
    setIntakeUi(key, { step });
    setError('');
    if (draft) navigate(`/apply?draftId=${encodeURIComponent(draft.id)}${requestedRecordId ? `&recordId=${encodeURIComponent(requestedRecordId)}` : ''}`);
  };

  const changeFields = (next: IntakeFields) => {
    if (!draft) return;
    const result = run((data, ctx) => saveDraft(data, ctx, {
      draftId: draft.id,
      recordId: requestedRecordId,
      source: draft.source,
      fields: next,
    }));
    if (!result.ok) setError(result.message);
  };

  const focusOrEditField = (field: string) => {
    const target = document.getElementById(ERROR_TARGETS[field] ?? '');
    if (target) {
      target.focus();
      target.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (draft) navigate(`/apply?step=${stepForField(field)}&focus=${encodeURIComponent(field)}&draftId=${encodeURIComponent(draft.id)}${requestedRecordId ? `&recordId=${encodeURIComponent(requestedRecordId)}` : ''}`);
  };

  if (actor.role === 'creative' && hasRecord && !correctionRecord) {
    return <section className="public-stack"><Notice tone="info">Your record is already with the council. Use its status page to continue.</Notice><Link to="/me">Open your application status</Link></section>;
  }
  if (requestedRecordId && !correctionRecord) {
    return <section className="public-stack"><Notice tone="warning">That correction draft is not available in this account.</Notice><Link to="/me">Return to your application status</Link></section>;
  }
  if (requestedDraftId && !draft) {
    return <section className="public-stack"><Notice tone="warning">This draft is not available in this account.</Notice><Link to={actor.role === 'creative' ? '/me' : '/apply'}>{actor.role === 'creative' ? 'Open your application status' : 'Return to intake'}</Link></section>;
  }
  if (!draft) return <p role="status">Preparing your saved draft…</p>;

  const step = stepParam >= 1 && stepParam <= 3 ? stepParam as 1 | 2 | 3 : meta.step;
  const mode = actor.role === 'coordinator' ? 'assisted' : 'self-service';
  const sourceSite = draft.source.siteId ? state.data.sites.find((site) => site.id === draft.source.siteId)?.name : null;
  const preflightErrors = intakeValidationErrors(fields).filter((item) => item.field !== 'acknowledged');
  const submitReady = preflightErrors.length === 0;
  const followUpOptions = <fieldset className="intake-fieldset" id="intake-followUp" tabIndex={-1}><legend>How can the council follow up?</legend>
    <label className="choice-row"><input type="radio" name="follow-up" checked={fields.followUp.kind === 'own_channel'} onChange={() => changeFields({ ...fields, followUp: { kind: 'own_channel', channelLabel: fields.followUp.kind === 'own_channel' ? fields.followUp.channelLabel : '' } })} /> Use my own contact route</label>
    {fields.followUp.kind === 'own_channel' ? <label className="field-inline">Fictional contact label<input value={fields.followUp.channelLabel} onChange={(e) => changeFields({ ...fields, followUp: { kind: 'own_channel', channelLabel: e.target.value } })} autoComplete="off" /></label> : null}
    {actor.role === 'coordinator' ? <><label className="choice-row"><input type="radio" name="follow-up" checked={fields.followUp.kind === 'coordinator_mediated'} onChange={() => changeFields({ ...fields, followUp: { kind: 'coordinator_mediated', coordinatorId: actor.id } })} /> Coordinator-mediated follow-up</label><p className="field-hint">No personal contact channel is needed when the coordinator will follow up.</p></> : <p className="field-hint">If you need a coordinator to help with follow-up, <Link to="/access?mode=help">ask for registration help</Link>.</p>}
  </fieldset>;

  const navigateToReview = () => {
    setIntakeUi(key, { step: 3 });
    navigate(`/apply/review?draftId=${encodeURIComponent(draft.id)}${requestedRecordId ? `&recordId=${encodeURIComponent(requestedRecordId)}` : ''}`);
  };

  return <div className="intake-layout">
    <div className="intake-status-row"><StatusBadge label={mode === 'assisted' ? 'Assisted intake' : 'Self-service intake'} tone="neutral" /><span>Draft saved as you go</span></div>
    {returnOpportunityId && !requestedRecordId ? <Notice tone="info">You started from {state.data.opportunities.find((opportunity) => opportunity.id === returnOpportunityId)?.title ?? 'an opportunity'}. You can return after submission.</Notice> : null}
    {mode === 'assisted' ? <Notice tone="info"><strong>The creative makes their own choices.</strong><dl className="compact-readback"><dt>Source</dt><dd>Coordinator-assisted intake</dd><dt>Site</dt><dd>{sourceSite ?? 'Assigned demo site'}</dd><dt>Coordinator</dt><dd>{actor.id}</dd><dt>Date captured</dt><dd>{draft.source.capturedOn}</dd></dl></Notice> : null}
    <nav aria-label="Intake steps" className="intake-stepper"><ol>{(['About you', 'Creative practice', 'Work evidence'] as const).map((label, index) => { const n = (index + 1) as 1 | 2 | 3; return <li key={label}><button type="button" className={step === n ? 'step-button is-current' : 'step-button'} aria-current={step === n ? 'step' : undefined} onClick={() => setStep(n)}>{n}. {label}</button></li>; })}</ol></nav>
    {error ? <Notice tone="danger">{error}</Notice> : null}
    {step === 1 ? <section className="public-card"><h2>About you</h2><p>Use a name that the council can recognize. Your display name can be a first name or nickname.</p>
      <label className="field-inline" htmlFor="intake-name">Name for the council record<input id="intake-name" value={fields.name} onChange={(e) => { const name = e.target.value; changeFields({ ...fields, name, displayName: !fields.displayName || fields.displayName === fields.name ? name : fields.displayName }); }} autoComplete="off" /></label>
      <label className="field-inline" htmlFor="intake-display">Display name<input id="intake-display" value={fields.displayName} onChange={(e) => changeFields({ ...fields, displayName: e.target.value })} autoComplete="off" /></label>
      {followUpOptions}
      <p><Button onClick={() => setStep(2)}>Continue to creative practice</Button></p>
    </section> : null}
    {step === 2 ? <section className="public-card"><h2>Creative practice</h2>
      <label className="field-inline" htmlFor="intake-practice">Creative practice<select id="intake-practice" value={fields.practice} onChange={(e) => changeFields({ ...fields, practice: e.target.value })}><option value="">Choose a practice</option>{fields.practice && !PRACTICES.includes(fields.practice) ? <option>{fields.practice}</option> : null}{PRACTICES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field-inline" htmlFor="intake-skills">Skills <span className="field-hint">Separate skills with commas.</span><input id="intake-skills" value={skillsText ?? fields.skills.join(', ')} onChange={(e) => { const raw = e.target.value; setSkillsText(raw); changeFields({ ...fields, skills: raw.split(',').map((item) => item.trim()).filter(Boolean) }); }} onBlur={() => { changeFields({ ...fields, skills: (skillsText ?? fields.skills.join(', ')).split(',').map((item) => item.trim()).filter(Boolean) }); setSkillsText(null); }} autoComplete="off" /></label>
      <label className="field-inline" htmlFor="intake-area">Broad area<select id="intake-area" value={fields.area} onChange={(e) => changeFields({ ...fields, area: e.target.value })}><option value="">Choose a broad area</option>{fields.area && !AREAS.includes(fields.area) ? <option>{fields.area}</option> : null}{AREAS.map((item) => <option key={item}>{item}</option>)}</select></label>
      <fieldset className="intake-fieldset"><legend>What support interests you?</legend>{INTERESTS.map((interest) => <label className="choice-row" key={interest}><input type="checkbox" checked={fields.interests.includes(interest)} onChange={(e) => changeFields({ ...fields, interests: e.target.checked ? [...fields.interests, interest] : fields.interests.filter((item) => item !== interest) })} />{interest}</label>)}</fieldset>
      <div className="action-row"><Button variant="secondary" onClick={() => setStep(1)}>Back</Button><Button onClick={() => setStep(3)}>Continue to work evidence</Button></div>
    </section> : null}
    {step === 3 ? <section className="public-card"><h2>Work evidence</h2><p>A polished portfolio or business permit is not required. A short description is enough.</p>
      <div id="intake-evidence" tabIndex={-1}>{fields.evidence.map((item, index) => <fieldset className="evidence-item" key={item.id}><legend>Work example {index + 1}</legend><label className="field-inline">Evidence type<select value={item.kind} onChange={(e) => changeFields({ ...fields, evidence: fields.evidence.map((entry) => entry.id === item.id ? { ...entry, kind: e.target.value as typeof item.kind } : entry) })}><option value="sample">Sample description</option><option value="link">Link text</option><option value="assisted_description">Description given in person</option></select></label><label className="field-inline">Description or link text<textarea rows={3} value={item.text} onChange={(e) => changeFields({ ...fields, evidence: fields.evidence.map((entry) => entry.id === item.id ? { ...entry, text: e.target.value } : entry) })} /></label><label className="choice-row"><input type="checkbox" checked={item.publicApproved} onChange={(e) => changeFields({ ...fields, evidence: fields.evidence.map((entry) => entry.id === item.id ? { ...entry, publicApproved: e.target.checked } : entry) })} /> OK to show publicly if I choose a public listing</label><Button variant="quiet" onClick={() => changeFields({ ...fields, evidence: fields.evidence.filter((entry) => entry.id !== item.id) })}>Remove this work example</Button></fieldset>)}</div>
      <Button variant="secondary" onClick={() => { const max = fields.evidence.reduce((current, item) => Math.max(current, Number(item.id.match(/(\d+)$/)?.[1] ?? 0)), 0); changeFields({ ...fields, evidence: [...fields.evidence, { id: `evidence-${max + 1}`, kind: 'sample', text: '', publicApproved: false }] }); }}>Add a work example</Button>
      {preflightErrors.length ? <div className="field-hint"><p>Complete these required items before moving to review:</p><ul>{preflightErrors.map((item) => <li key={item.field}><button type="button" className="text-button" onClick={() => focusOrEditField(item.field)}>{item.message}</button></li>)}</ul></div> : null}
      <div className="action-row"><Button variant="secondary" onClick={() => setStep(2)}>Back</Button><Button disabled={!submitReady} onClick={navigateToReview}>Review and privacy choices</Button></div>
    </section> : null}
    {returnOpportunityId && !requestedRecordId ? <p><Link to={`/opportunities/${returnOpportunityId}`}>Return to the opportunity you started from</Link></p> : null}
  </div>;
}

function IntakeReview() {
  const { state, actor, run, setAccess, setIntakeUi } = useDemo();
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const recordId = params.get('recordId');
  const requestedDraftId = params.get('draftId');
  const draft = state.data.drafts.find((item) => item.ownerId === actor.id && item.recordId === recordId && (!requestedDraftId || item.id === requestedDraftId));
  const key = intakeKey(actor.id, draft?.id ?? requestedDraftId ?? recordId);
  const meta = state.intakeUi[key];
  const receipt = meta?.submission?.kind === 'received' ? state.data.records.find((item) => item.id === meta.submission?.id) : null;
  const queued = meta?.submission?.kind === 'queued' ? state.data.queue.find((item) => item.id === meta.submission?.id) : null;
  const errors = draft ? intakeValidationErrors(draft.fields) : [];
  const errorRef = useRef<HTMLElement | null>(null);
  const submitting = useRef(false);
  const [feedback, setFeedback] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const accessOpportunityId = state.access.returnOpportunityOwnerId === actor.id ? state.access.returnOpportunityId : null;
  const opportunityId = meta?.returnOpportunityId ?? (!recordId ? accessOpportunityId : null);
  const opportunity = opportunityId ? state.data.opportunities.find((item) => item.id === opportunityId) : null;

  useEffect(() => {
    if (showErrors && errors.length) errorRef.current?.focus();
  }, [errors.length, showErrors]);

  const editLink = (step: 1 | 2 | 3) => `/apply?step=${step}${draft ? `&draftId=${encodeURIComponent(draft.id)}` : ''}${recordId ? `&recordId=${encodeURIComponent(recordId)}` : ''}`;
  const focusOrEditField = (field: string) => {
    const target = document.getElementById(ERROR_TARGETS[field] ?? '');
    if (target) {
      target.focus();
      target.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (draft) navigate(`/apply?step=${stepForField(field)}&focus=${encodeURIComponent(field)}&draftId=${encodeURIComponent(draft.id)}${recordId ? `&recordId=${encodeURIComponent(recordId)}` : ''}`);
  };
  const changeFields = (next: IntakeFields) => {
    if (!draft) return;
    const result = run((data, ctx) => saveDraft(data, ctx, { draftId: draft.id, recordId, source: draft.source, fields: next }));
    if (!result.ok) setFeedback(result.message);
  };

  const submit = () => {
    if (!draft) return;
    setShowErrors(true);
    if (errors.length) {
      return;
    }
    if (submitting.current) return;
    submitting.current = true;
    const onDevice = actor.role === 'coordinator' && !state.settings.online;
    const result = onDevice
      ? run((data, ctx) => enqueueSubmission(data, ctx, { draftId: draft.id, optedIn: meta?.optedIn ?? false }))
      : run((data, ctx) => submitIntake(data, ctx, { draftId: draft.id, optedIn: meta?.optedIn ?? false }));
    submitting.current = false;
    if (!result.ok) {
      setFeedback(result.message);
      errorRef.current?.focus();
      return;
    }
    setIntakeUi(key, { submission: { kind: onDevice ? 'queued' : 'received', id: result.id! }, returnOpportunityId: opportunityId ?? null });
    if (opportunityId && state.access.returnOpportunityOwnerId === actor.id) setAccess({ returnOpportunityId: null, returnOpportunityOwnerId: null });
  };

  const saveAndExit = () => {
    if (actor.role === 'creative') navigate('/me');
    else setFeedback('Your assisted draft is saved on this device.');
  };

  if (receipt) return <section className="public-stack"><Notice tone="success"><strong>Received by the council</strong><p>Reference {receipt.application.reference}. The council will review the information and contact you through your chosen follow-up route if needed.</p></Notice>{meta?.optedIn ? <p><StatusBadge label={LISTING_LABEL.pending_review.label} tone={LISTING_LABEL.pending_review.tone} /></p> : <p>Your listing is private. This choice does not affect support.</p>}{opportunity ? <p><Link to={`/opportunities/${opportunity.id}`}>Return to {opportunity.title}</Link></p> : null}<Link to="/me">Open your application status</Link></section>;
  if (queued) return <section className="public-stack"><Notice tone="warning"><strong>Queued on this device — the council has not received it</strong><p>Device reference {queued.deviceRef}. The coordinator can send it when connected.</p></Notice><Link to="/coordinator">Return to the coordinator workspace</Link></section>;
  if (!draft) return <section className="public-stack"><Notice tone="warning">This draft is not available in this account. It may already have been submitted or belongs to another person.</Notice><Link to={actor.role === 'creative' ? '/me' : '/apply'}>{actor.role === 'creative' ? 'Open your application status' : 'Return to intake'}</Link></section>;

  const preview = projectPublicIntake('draft-preview', draft.fields, demoTime(state.clock));
  const assisted = draft.source.mode === 'assisted';
  const site = draft.source.siteId ? state.data.sites.find((item) => item.id === draft.source.siteId) : null;
  return <div className="intake-layout">
    {showErrors && errors.length ? <section className="notice notice-danger intake-error-summary" aria-labelledby="error-summary-title" ref={errorRef} tabIndex={-1}><h2 id="error-summary-title">Check the information before submitting</h2><ul>{errors.map((error) => <li key={error.field}><button type="button" className="text-button" onClick={() => focusOrEditField(error.field)}>{error.message}</button></li>)}</ul></section> : null}
    {feedback ? <Notice tone="warning">{feedback}</Notice> : null}
    <section className="public-card"><h2>Check your information</h2><div className="readback-group"><h3>About you <Link to={editLink(1)}>Edit</Link></h3><dl className="compact-readback"><dt>Name for the council record</dt><dd>{draft.fields.name || 'Not added yet'}</dd><dt>Display name</dt><dd>{draft.fields.displayName || 'Not added yet'}</dd><dt>Follow-up</dt><dd>{draft.fields.followUp.kind === 'coordinator_mediated' ? 'Coordinator-mediated follow-up' : draft.fields.followUp.channelLabel || 'Not added yet'}</dd></dl></div><div className="readback-group"><h3>Creative practice <Link to={editLink(2)}>Edit</Link></h3><dl className="compact-readback"><dt>Practice</dt><dd>{draft.fields.practice || 'Not added yet'}</dd><dt>Skills</dt><dd>{draft.fields.skills.join(', ') || 'Not added yet'}</dd><dt>Broad area</dt><dd>{draft.fields.area || 'Not added yet'}</dd><dt>Support interests</dt><dd>{draft.fields.interests.join(', ') || 'None selected'}</dd></dl></div><div className="readback-group"><h3>Work evidence <Link to={editLink(3)}>Edit</Link></h3>{draft.fields.evidence.length ? <ul>{draft.fields.evidence.map((item) => <li key={item.id}>{item.kind.replace('_', ' ')}: {item.text || 'Description not added yet'} · {item.publicApproved ? 'May be shown if you choose public listing' : 'Kept private'}</li>)}</ul> : <p>No work examples added yet.</p>}</div>
      <p><strong>Intake source:</strong> {assisted ? 'Coordinator-assisted' : 'Self-service'}{assisted && site ? ` · ${site.name}` : ''}{assisted ? ` · ${draft.source.coordinatorId} · ${draft.source.capturedOn}` : ''}</p>
    </section>
    <Notice tone="info" title="Information use — demo wording, pending council approval"><p>The council collects the details above to review membership and consider you for support. Authorized council staff can see your application. You can correct or ask to withdraw information through the council; a coordinator can help you reach them.</p></Notice>
    <section className="public-card"><h2>Public directory choice</h2><p>This choice is separate from your application. Saying no to a public listing does not affect support.</p><label className="choice-row"><input type="checkbox" checked={meta?.optedIn ?? false} onChange={(e) => setIntakeUi(key, { optedIn: e.target.checked })} /> I want to be considered for the public directory</label><h3>Public profile preview</h3><p>Only the display name, practice, skills, broad area, and work examples you marked OK to show can appear here. This draft is not public.</p><PublicProfileCard profile={preview} eyebrow="Draft preview · not publicly listed" draftPreview /></section>
    <section className="public-card"><label className="choice-row"><input id="intake-acknowledged" type="checkbox" checked={draft.fields.acknowledged} onChange={(e) => changeFields({ ...draft.fields, acknowledged: e.target.checked })} /> I understand what information is collected and how it is used.</label><p>Required to submit. This acknowledges the notice; it does not opt you into the public directory.</p></section>
    <div className="action-row"><Link className="btn btn-secondary" to={editLink(3)}>Edit intake</Link><Button variant="secondary" onClick={saveAndExit}>Save draft</Button><Button onClick={submit}>Submit application</Button></div>
  </div>;
}

function CreativeHome() {
  const { state, actor, run } = useDemo();
  const view = creativeView(state.data, actor.id);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  const record = view.record;
  const noticeList = noticesFor(state.data, actor);
  const next = creativeNextAction(view);
  const correction = record?.application.state === 'changes_requested';
  const openHumanReview = record ? state.data.cases.find((item) => item.recordId === record.id && item.kind === 'human_review' && item.state === 'open') : null;

  if (!record) return <div className="public-stack"><section className="public-card"><h2>Your application</h2><p>No application has been received by the council.</p>{view.drafts.length ? <p>Your draft is saved on this device.</p> : null}<Link className="btn btn-primary" to="/apply">Continue registration</Link></section></div>;
  const label = APPLICATION_LABEL[record.application.state];
  const timeline = state.data.audit.filter((event) => event.entityId === record.id).slice(-8).reverse();
  const events: Record<string, string> = { received: 'Application received by the council', review_started: 'Council review started', changes_requested: 'The council requested changes', declined: 'The council recorded a decision', verified: 'Membership checks completed', resubmitted: 'Corrected information received', listing_choice_changed: 'Public directory choice updated' };
  const submitReviewRequest = () => {
    const result = run((data, ctx) => openCase(data, ctx, { kind: 'human_review', recordId: record.id, reason }));
    setMessage(result.ok ? 'Your request is waiting for the council.' : result.message);
    if (result.ok) { setReason(''); setRequesting(false); }
  };
  return <div className="public-stack"><section className="public-card"><p><StatusBadge label={label.label} tone={label.tone} /></p><h2>{next.title}</h2><p>{next.detail}</p>{correction ? <p><strong>Reason from the council:</strong> {record.application.reason}</p> : null}<p>Reference <strong>{record.application.reference}</strong></p>{correction ? <Link className="btn btn-primary" to={`/apply?recordId=${encodeURIComponent(record.id)}`}>Correct and resubmit</Link> : next.to !== '/me' ? <Link className="btn btn-primary" to={next.to}>Open next step</Link> : null}{record.application.state === 'verified' && view.listing ? <p><StatusBadge label={LISTING_LABEL[view.listing].label} tone={LISTING_LABEL[view.listing].tone} /></p> : null}{record.application.updatePending ? <p><StatusBadge label={UPDATE_PENDING_LABEL.label} tone={UPDATE_PENDING_LABEL.tone} /></p> : null}</section>
    {record.application.state === 'declined' ? <section className="public-card"><h2>Request a human review</h2>{openHumanReview ? <Notice tone="info">Your request is waiting for the council: {openHumanReview.reason}</Notice> : requesting ? <><label className="field-inline">Why should a person review this decision?<textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label><div className="action-row"><Button variant="secondary" onClick={() => setRequesting(false)}>Cancel</Button><Button disabled={!reason.trim()} onClick={submitReviewRequest}>Send human-review request</Button></div></> : <><p>You can ask for a person to review the decision. Add a short reason.</p><Button variant="secondary" onClick={() => setRequesting(true)}>Request a human review</Button></>}</section> : null}
    <section className="public-card"><h2>Application timeline</h2>{timeline.length ? <ol className="timeline-list">{timeline.map((event) => <li key={event.id}><strong>{events[event.action] ?? 'Application updated'}</strong><span>{event.at.slice(0, 10)}</span>{event.reason ? <p>{event.reason}</p> : null}</li>)}</ol> : <p>No timeline events are available.</p>}</section>
    <section className="public-card"><h2>Need help?</h2><p>In-app examples are for this demo only. No text or email is sent.</p><Link to="/access?mode=help">Get assistance with registration</Link></section>
    <section className="public-card"><h2>In-app notification examples</h2><p>These are examples in this browser demo. No SMS or email is sent.</p>{noticeList.length ? <ul>{noticeList.map((notice) => <li key={notice.id}>{notice.at.slice(0, 10)} — {notice.text}</li>)}</ul> : <p>No notification examples yet.</p>}</section>{message ? <p role="status">{message}</p> : null}</div>;
}
