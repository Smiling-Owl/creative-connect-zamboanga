import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { OpportunityDetail } from '../public/PublicViews';
import { Button, ConfirmDialog, Notice, StatusBadge } from '../../components/ui';
import { cancelOpportunity, closeOpportunity, createOpportunity, publishOpportunity, updateOpportunity, validateOpportunity, type OpportunityInput } from '../../domain/opportunity';
import { confirmPlace, inviteCreative, markNotSelected, offerReferral, OUTCOME_STATES, recordInstructions, recordOutcome, startReferralReview } from '../../domain/referral';
import { resolveCase } from '../../domain/cases';
import { opportunityCapacity, opportunityReferralCounts, opportunityReferralRoster, verifiedReferralCandidates } from '../../domain/selectors';
import { isListed } from '../../domain/visibility';
import { OPPORTUNITY_LABEL, REFERRAL_LABEL } from '../../labels';
import type { Ctx, DomainData, Opportunity, OutcomeState, ReferralState, Result } from '../../domain/types';
import { demoTime, useDemo } from '../../state/store';

type ViewId = 'M03' | 'M04' | 'M05';

export function CouncilOpportunityView({ id }: { id: ViewId }) {
  const { opportunityId = '' } = useParams();
  const { actor } = useDemo();
  if (id === 'M03') return <OpportunityManagement />;
  if (id === 'M04') return <OpportunityEditor key={`${actor.id}:${opportunityId}`} opportunityId={opportunityId} />;
  return <ReferralTracker key={`${actor.id}:${opportunityId}`} opportunityId={opportunityId} />;
}

function OpportunityManagement() {
  const { state } = useDemo();
  const groups = (['draft', 'published', 'closed', 'cancelled'] as const).map((status) => ({
    status,
    entries: state.data.opportunities.filter((item) => item.state === status),
  }));
  return <div className="public-stack">
    <section className="public-card"><p>Manage fictional opportunities and record each referral step. This screen does not contact providers or send messages.</p><Link className="btn btn-primary" to="/council/opportunities/new/edit">New opportunity</Link></section>
    {groups.map(({ status, entries }) => <section className="public-card" key={status}><h2>{OPPORTUNITY_LABEL[status].label} · {entries.length}</h2>{entries.length ? <ul className="record-list">{entries.map((item) => {
      const capacity = opportunityCapacity(state.data, item.id)!;
      const counts = opportunityReferralCounts(state.data, item.id);
      return <li key={item.id}><Link to={`/council/opportunities/${item.id}/edit`}><strong>{item.title}</strong></Link><p>{item.type} · {item.provider} · {capacity.used} of {capacity.capacity} places in use</p><p>{(Object.entries(counts) as [ReferralState, number][]).filter(([, count]) => count).map(([stateKey, count]) => `${REFERRAL_LABEL[stateKey].label}: ${count}`).join(' · ') || 'No referrals'}</p><div className="action-row"><Link to={`/council/opportunities/${item.id}/edit`}>Edit and preview</Link><Link to={`/council/referrals/${item.id}`}>Open referral roster</Link></div></li>;
    })}</ul> : <p>No opportunities in this group.</p>}</section>)}
  </div>;
}

const EMPTY_FIELDS = (ownerId: string): OpportunityInput => ({
  title: '', type: 'workshop', provider: '', description: '', eligibility: '', costLabel: '', capacity: 1,
  dateLabel: '', deadline: '', locationMode: '', ownerId, nextStep: '', contactRoute: 'Council contact route (placeholder — not yet approved).',
});

function toInput(opportunity: Opportunity): OpportunityInput {
  return {
    title: opportunity.title,
    type: opportunity.type,
    provider: opportunity.provider,
    description: opportunity.description,
    eligibility: opportunity.eligibility,
    costLabel: opportunity.costLabel,
    capacity: opportunity.capacity,
    dateLabel: opportunity.dateLabel,
    deadline: opportunity.deadline,
    locationMode: opportunity.locationMode,
    ownerId: opportunity.ownerId,
    nextStep: opportunity.nextStep,
    contactRoute: opportunity.contactRoute,
  };
}

function OpportunityEditor({ opportunityId }: { opportunityId: string }) {
  const { state, actor, run } = useDemo();
  const navigate = useNavigate();
  const opportunity = state.data.opportunities.find((item) => item.id === opportunityId);
  const isNew = opportunityId === 'new';
  const [fields, setFields] = useState<OpportunityInput>(() => opportunity ? toInput(opportunity) : EMPTY_FIELDS('Council team (fictional)'));
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [confirmMaterial, setConfirmMaterial] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [dialog, setDialog] = useState<'close' | 'cancel' | 'cancel-confirm' | null>(null);
  const isReadOnly = !!opportunity && (opportunity.state === 'closed' || opportunity.state === 'cancelled');
  const cap = opportunity ? opportunityCapacity(state.data, opportunity.id) : null;
  const confirmed = opportunity ? state.data.referrals.filter((item) => item.opportunityId === opportunity.id && item.state === 'confirmed') : [];
  const accepted = opportunity ? state.data.referrals.filter((item) => item.opportunityId === opportunity.id && item.state === 'accepted') : [];
  const active = opportunity ? state.data.referrals.filter((item) => item.opportunityId === opportunity.id && ['interest', 'under_review', 'offered', 'accepted', 'confirmed'].includes(item.state)) : [];
  const affectedNames = confirmed.map((item) => state.data.records.find((record) => record.id === item.recordId)?.intake.displayName ?? 'Creative');
  const acceptedNames = accepted.map((item) => state.data.records.find((record) => record.id === item.recordId)?.intake.displayName ?? 'Creative');
  if (!isNew && !opportunity) return <section className="public-card"><h2>Opportunity not found</h2><Link to="/council/opportunities">Return to opportunity management</Link></section>;
  const setField = <K extends keyof OpportunityInput>(key: K, value: OpportunityInput[K]) => {
    setFields((current) => ({ ...current, [key]: value }));
    setError(''); setFieldErrors([]); setConfirmMaterial(false);
  };
  const focusInvalid = (message: string) => {
    const match = message.match(/Add a title|Name the provider|Describe what participants|Describe the cost|responsible council owner|Capacity must|calendar deadline|date or schedule|location or delivery mode|who is eligible|next step|council contact route/i)?.[0] ?? '';
    const target = /title/i.test(match) ? 'opp-title' : /provider/i.test(match) ? 'opp-provider' : /participants/i.test(match) ? 'opp-description' : /cost/i.test(match) ? 'opp-cost' : /owner/i.test(match) ? 'opp-owner' : /capacity/i.test(match) ? 'opp-capacity' : /deadline/i.test(match) ? 'opp-deadline' : /date/i.test(match) ? 'opp-date' : /location/i.test(match) ? 'opp-location' : /eligible/i.test(match) ? 'opp-eligibility' : /next step/i.test(match) ? 'opp-next-step' : 'opp-contact';
    setError(message); setFieldErrors([target]); document.getElementById(target)?.focus();
  };
  const validate = () => { const problem = validateOpportunity(fields); if (problem) { focusInvalid(problem); return false; } return true; };
  const save = (acceptMaterialChange = false) => {
    if (!validate()) return;
    const materialsChanged = !!opportunity && opportunity.state === 'published' && ['dateLabel', 'locationMode', 'costLabel'].some((key) => opportunity[key as keyof Opportunity] !== fields[key as keyof OpportunityInput]);
    if (materialsChanged && confirmed.length && !acceptMaterialChange) { setConfirmMaterial(true); return; }
    const result = run((data, ctx) => opportunity ? updateOpportunity(data, ctx, { id: opportunity.id, fields }) : createOpportunity(data, ctx, fields));
    setFeedback(result.ok ? 'Opportunity details saved.' : result.message);
    if (result.ok) {
      setError(''); setFieldErrors([]); setConfirmMaterial(false);
      if (!opportunity && result.id) navigate(`/council/opportunities/${result.id}/edit`, { replace: true });
    } else {
      setError(result.message);
      if (result.code === 'capacity_below_used') { setFieldErrors(['opp-capacity']); document.getElementById('opp-capacity')?.focus(); }
    }
  };
  const publish = () => {
    if (!opportunity) { setFeedback('Save this opportunity before publishing it.'); return; }
    if (JSON.stringify(fields) !== JSON.stringify(toInput(opportunity))) { setFeedback('Save the current opportunity details before publishing.'); return; }
    const result = run((data, ctx) => publishOpportunity(data, ctx, { id: opportunity.id }));
    setFeedback(result.ok ? 'Opportunity published.' : result.message);
  };
  const close = () => {
    if (!opportunity) return;
    const result = run((data, ctx) => closeOpportunity(data, ctx, { id: opportunity.id }));
    setFeedback(result.ok ? 'Opportunity closed. Accepted creatives remain accepted and cannot be confirmed after closing.' : result.message); setDialog(null);
  };
  const cancel = () => {
    if (!opportunity) return;
    const result = run((data, ctx) => cancelOpportunity(data, ctx, { id: opportunity.id, reason: cancelReason }));
    setFeedback(result.ok ? 'Opportunity cancelled. Active referrals were cancelled; recorded outcomes remain unchanged.' : result.message);
    if (result.ok) setCancelReason(''); setDialog(null);
  };
  const input = (key: keyof OpportunityInput, label: string, id: string, kind: 'text' | 'textarea' | 'number' | 'date' = 'text') => <label className="field-inline" key={key}>{label}{kind === 'textarea' ? <textarea id={id} value={String(fields[key])} aria-invalid={fieldErrors.includes(id) || undefined} aria-describedby={fieldErrors.includes(id) ? `${id}-error` : undefined} onChange={(event) => setField(key, event.target.value as OpportunityInput[typeof key])} /> : <input id={id} type={kind} min={kind === 'number' ? 1 : undefined} value={String(fields[key])} aria-invalid={fieldErrors.includes(id) || undefined} aria-describedby={fieldErrors.includes(id) ? `${id}-error` : undefined} onChange={(event) => setField(key, (kind === 'number' ? Number(event.target.value) : event.target.value) as OpportunityInput[typeof key])} />}{fieldErrors.includes(id) && error ? <span id={`${id}-error`} className="field-hint">{error}</span> : null}</label>;
  const previewOpportunity = opportunity ? { ...opportunity, ...fields } : { ...EMPTY_FIELDS(actor.id), ...fields, id: 'preview', state: 'draft' as const, cancelReason: null };
  return <div className="public-stack">
    <p><Link to="/council/opportunities">← Opportunity management</Link></p>
    <section className="public-card"><h2>{isNew ? 'New opportunity' : opportunity?.title}</h2>{isReadOnly ? <Notice tone="warning">This opportunity is {opportunity?.state} and read-only. Its details remain visible to people with a referral.</Notice> : null}
      {!isReadOnly ? <form onSubmit={(event) => { event.preventDefault(); save(); }} noValidate>
        {error ? <p role="alert" className="notice notice-warning">{error}</p> : null}
        {input('title', 'Title', 'opp-title')}
        <label className="field-inline">Type<select value={fields.type} onChange={(event) => setField('type', event.target.value as OpportunityInput['type'])}><option value="workshop">Workshop</option><option value="clinic">Clinic</option><option value="support">Support</option><option value="other">Other, including descriptive grant or contract information</option></select></label>
        {input('provider', 'Fictional provider', 'opp-provider')}{input('description', 'Description', 'opp-description', 'textarea')}{input('eligibility', 'Eligibility', 'opp-eligibility', 'textarea')}{input('costLabel', 'Cost or fee information', 'opp-cost')}{input('capacity', 'Capacity', 'opp-capacity', 'number')}{input('dateLabel', 'Date or schedule', 'opp-date')}{input('deadline', 'Deadline', 'opp-deadline', 'date')}{input('locationMode', 'Location or delivery mode', 'opp-location')}{input('ownerId', 'Responsible council owner', 'opp-owner')}{input('nextStep', 'Next step and confirmation process', 'opp-next-step', 'textarea')}{input('contactRoute', 'Council contact route', 'opp-contact', 'textarea')}
        <div className="action-row"><Button type="submit">Save draft details</Button>{opportunity?.state === 'draft' ? <Button onClick={publish}>Publish opportunity</Button> : null}</div>
      </form> : null}
      {opportunity?.state === 'published' ? <><div className="action-row"><Button variant="secondary" onClick={() => setDialog('close')}>Close opportunity</Button><Button variant="danger" onClick={() => setDialog('cancel')}>Cancel opportunity</Button></div>{active.length ? <p>{active.length} active referrals are affected by cancellation.</p> : null}{accepted.length ? <Notice tone="warning">These creatives accepted but do not yet have confirmed places: {acceptedNames.join(', ')}. Closing leaves their referrals accepted and blocks confirmation. Review them before closing; cancel this opportunity if it must end immediately.</Notice> : null}</> : null}
    </section>
    {confirmMaterial ? <Notice tone="warning" title="Confirmed places need review again"><p>Changing the date, location or cost returns confirmed places to accepted. The listed creatives must be confirmed again:</p><ul>{affectedNames.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}</ul><Button onClick={() => save(true)}>Review and save material changes</Button><Button variant="secondary" onClick={() => setConfirmMaterial(false)}>Keep editing</Button></Notice> : null}
    {feedback ? <p role="status" aria-live="polite">{feedback}</p> : null}
    {isNew || (opportunity && cap) ? <section className="public-card"><h2>Public preview</h2><p>Preview uses the same opportunity details shown on the public page. This draft is not public until published.</p><StatusBadge label={OPPORTUNITY_LABEL[opportunity?.state ?? 'draft'].label} tone={OPPORTUNITY_LABEL[opportunity?.state ?? 'draft'].tone} /><OpportunityDetail opportunity={previewOpportunity} remaining={Math.max(0, fields.capacity - (cap?.used ?? 0))} at={demoTime(state.clock)} draftPreview={previewOpportunity.state === 'draft'} /></section> : null}
    <ConfirmDialog open={dialog === 'close'} title="Close this opportunity?" message={`${accepted.length} accepted creatives will remain without a confirmed place: ${acceptedNames.join(', ') || 'none'}. Confirmation is blocked after closing.`} confirmLabel="Close opportunity" onCancel={() => setDialog(null)} onConfirm={close} />
    <ConfirmDialog open={dialog === 'cancel-confirm'} title="Confirm opportunity cancellation" message={`Reason: ${cancelReason.trim()}. Active referrals affected (${active.length}): ${active.map((item) => state.data.records.find((record) => record.id === item.recordId)?.intake.displayName ?? 'Creative').join(', ') || 'none'}. Recorded outcomes remain unchanged.`} confirmLabel="Confirm cancellation" onCancel={() => setDialog('cancel')} onConfirm={cancel} />
    {dialog === 'cancel' ? <section className="public-card"><h2>Cancel opportunity</h2><p>Cancellation changes active referrals to cancelled and keeps completed, did-not-attend, and awaiting-follow-up outcomes unchanged.</p><p>Active referrals affected: {active.length}</p><ul>{active.map((item) => <li key={item.id}>{state.data.records.find((record) => record.id === item.recordId)?.intake.displayName ?? 'Creative'} · {REFERRAL_LABEL[item.state].label}</li>)}</ul><label className="field-inline">Reason for cancellation<textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} required /></label><div className="action-row"><Button variant="danger" disabled={!cancelReason.trim()} onClick={() => setDialog('cancel-confirm')}>Review cancellation</Button><Button variant="secondary" onClick={() => setDialog(null)}>Keep opportunity</Button></div></section> : null}
  </div>;
}

const REFERRAL_STATES: ReferralState[] = ['interest', 'under_review', 'offered', 'not_selected', 'accepted', 'declined', 'confirmed', 'completed', 'did_not_attend', 'awaiting_follow_up', 'cancelled'];

function ReferralTracker({ opportunityId }: { opportunityId: string }) {
  const { state, run } = useDemo();
  const opportunity = state.data.opportunities.find((item) => item.id === opportunityId);
  const [skill, setSkill] = useState('');
  const [interest, setInterest] = useState('');
  const [area, setArea] = useState('');
  const [domain, setDomain] = useState('');
  const [forms, setForms] = useState<Record<string, { reason: string; instructions: string; outcome: OutcomeState | '' }>>({});
  const [caseForms, setCaseForms] = useState<Record<string, { resolution: string; outcome: OutcomeState | 'keep' | '' }>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState('');
  if (!opportunity) return <section className="public-card"><h2>Select an opportunity</h2><ul className="record-list">{state.data.opportunities.map((item) => <li key={item.id}><Link to={`/council/referrals/${item.id}`}>{item.title}</Link> · {OPPORTUNITY_LABEL[item.state].label}</li>)}</ul></section>;
  const cap = opportunityCapacity(state.data, opportunity.id)!;
  const roster = opportunityReferralRoster(state.data, opportunity.id);
  const candidates = verifiedReferralCandidates(state.data, opportunity.id).filter(({ record }) => (!skill || record.intake.skills.some((item) => item.toLowerCase().includes(skill.toLowerCase()))) && (!interest || record.intake.interests.some((item) => item.toLowerCase().includes(interest.toLowerCase()))) && (!area || record.intake.area === area) && (!domain || record.intake.domain === domain));
  const formFor = (id: string) => forms[id] ?? { reason: '', instructions: '', outcome: '' as const };
  const updateForm = (id: string, patch: Partial<ReturnType<typeof formFor>>) => { setForms((current) => ({ ...current, [id]: { ...formFor(id), ...patch } })); setActionErrors((current) => ({ ...current, [id]: '' })); };
  const caseFormFor = (id: string) => caseForms[id] ?? { resolution: '', outcome: '' as const };
  const updateCaseForm = (id: string, patch: Partial<ReturnType<typeof caseFormFor>>) => setCaseForms((current) => ({ ...current, [id]: { ...caseFormFor(id), ...patch } }));
  const perform = (fn: Parameters<typeof run>[0], success: string) => { const result = run(fn); setFeedback(result.ok ? success : result.message); };
  const act = (referralId: string, action: 'review' | 'offer' | 'confirm' | 'instructions' | 'outcome' | 'not-selected') => {
    const form = formFor(referralId);
    if (action === 'not-selected' && !form.reason.trim()) {
      setActionErrors((current) => ({ ...current, [referralId]: 'Add a reason for not selecting this creative.' }));
      document.getElementById(`not-selected-${referralId}`)?.focus();
      return;
    }
    if (action === 'instructions' && !form.instructions.trim()) {
      setActionErrors((current) => ({ ...current, [referralId]: 'Add practical instructions before saving.' }));
      document.getElementById(`instructions-${referralId}`)?.focus();
      return;
    }
    if (action === 'outcome' && !OUTCOME_STATES.includes(form.outcome as OutcomeState)) {
      setActionErrors((current) => ({ ...current, [referralId]: 'Choose one of the listed support outcomes.' }));
      return;
    }
    const actions: Record<typeof action, (data: DomainData, ctx: Ctx) => Result> = {
      review: (data, ctx) => startReferralReview(data, ctx, referralId),
      offer: (data, ctx) => offerReferral(data, ctx, referralId),
      confirm: (data, ctx) => confirmPlace(data, ctx, { referralId, instructions: form.instructions }),
      instructions: (data, ctx) => recordInstructions(data, ctx, { referralId, instructions: form.instructions }),
      outcome: (data, ctx) => recordOutcome(data, ctx, { referralId, outcome: form.outcome as OutcomeState }),
      'not-selected': (data, ctx) => markNotSelected(data, ctx, { referralId, reason: form.reason }),
    };
    const result = run(actions[action]);
    setFeedback(result.ok ? ({ review: 'Review started.', offer: 'Offer recorded.', confirm: 'Place confirmed.', instructions: 'Practical instructions saved.', outcome: 'Outcome recorded.', 'not-selected': 'Decision recorded.' }[action]) : result.message);
  };
  const auditFor = (referralId: string) => state.data.audit.filter((event) => event.entityId === referralId).slice().reverse();
  const cases = state.data.cases.filter((item) => item.state === 'open' && item.kind === 'outcome_correction' && state.data.referrals.some((referral) => referral.id === item.referralId && referral.opportunityId === opportunity.id));
  return <div className="public-stack">
    <p><Link to="/council/referrals">← All referral opportunities</Link></p>
    <section className="public-card"><h2>{opportunity.title}</h2><StatusBadge label={OPPORTUNITY_LABEL[opportunity.state].label} tone={OPPORTUNITY_LABEL[opportunity.state].tone} /><p>{cap.used} of {cap.capacity} places allocated or still in use. This includes confirmed, completed, did-not-attend, and awaiting-follow-up referrals. {cap.remaining} remaining.</p><OpportunityDetail opportunity={opportunity} remaining={cap.remaining} at={demoTime(state.clock)} /></section>
    <section className="public-card"><h2>Find verified creatives</h2><p>Manual filters only. Private verified records are included. This list does not score or rank people.</p><div className="filter-grid"><label className="field-inline">Skill<input value={skill} onChange={(event) => setSkill(event.target.value)} /></label><label className="field-inline">Support interest<input value={interest} onChange={(event) => setInterest(event.target.value)} /></label><label className="field-inline">General location<select value={area} onChange={(event) => setArea(event.target.value)}><option value="">All locations</option>{[...new Set(state.data.records.map((item) => item.intake.area))].filter(Boolean).sort().map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-inline">Creative domain<input value={domain} onChange={(event) => setDomain(event.target.value)} /></label></div>{candidates.length ? <ul className="record-list">{candidates.map(({ record, referral }) => <li key={record.id}><strong>{record.intake.displayName}</strong> · {record.intake.domain} · {record.intake.area}<p>{record.intake.skills.join(', ')} · Interests: {record.intake.interests.join(', ') || 'not provided'}</p><p>{isListed(record) ? 'Listed publicly' : 'Not listed publicly'} · {record.application.reference}</p>{referral ? <><p>Existing referral: {REFERRAL_LABEL[referral.state].label} · {referral.origin === 'interest' ? 'Creative interest' : 'Council invitation'}</p>{['interest', 'under_review'].includes(referral.state) ? <Button disabled={opportunity.state !== 'published'} onClick={() => perform((data, ctx) => inviteCreative(data, ctx, { recordId: record.id, opportunityId: opportunity.id }), 'Council invitation recorded for the existing referral.')}>Invite after interest</Button> : null}</> : <Button disabled={opportunity.state !== 'published'} onClick={() => perform((data, ctx) => inviteCreative(data, ctx, { recordId: record.id, opportunityId: opportunity.id }), 'Invitation recorded.')}>Invite creative</Button>}</li>)}</ul> : <p>No verified records match these filters.</p>}</section>
    {REFERRAL_STATES.map((status) => roster[status].length ? <section className="public-card" key={status}><h2>{REFERRAL_LABEL[status].label} · {roster[status].length}</h2>{roster[status].map((referral) => {
      const record = state.data.records.find((item) => item.id === referral.recordId);
      const form = formFor(referral.id);
      const caseFor = cases.find((item) => item.referralId === referral.id);
      const caseForm = caseFor ? caseFormFor(caseFor.id) : { resolution: '', outcome: '' as const };
      const outcomeState = ['completed', 'did_not_attend', 'awaiting_follow_up'].includes(referral.state);
      const openCaseNow = !!caseFor;
      return <article className="readback-group" key={referral.id}><h3>{record?.intake.displayName ?? 'Creative record'} · {referral.origin === 'interest' ? 'Interest' : 'Council invitation'}</h3><p>{record?.application.reference} · {record && isListed(record) ? 'Listed publicly' : 'Private record; not listed publicly'}</p><p>{REFERRAL_LABEL[referral.state].label}</p>{referral.reason ? <p>Reason: {referral.reason}</p> : null}
        {status === 'interest' ? <div className="action-row"><Button onClick={() => act(referral.id, 'review')}>Start review</Button><Button variant="secondary" onClick={() => act(referral.id, 'offer')}>Offer place</Button><label className="field-inline">Reason for not selecting<textarea id={`not-selected-${referral.id}`} value={form.reason} onChange={(event) => updateForm(referral.id, { reason: event.target.value })} aria-describedby={actionErrors[referral.id] ? `not-selected-error-${referral.id}` : undefined} /></label>{actionErrors[referral.id] ? <p id={`not-selected-error-${referral.id}`} role="alert">{actionErrors[referral.id]}</p> : null}<Button variant="secondary" onClick={() => act(referral.id, 'not-selected')}>Not selected</Button></div> : null}
        {status === 'under_review' ? <div className="action-row"><Button onClick={() => act(referral.id, 'offer')}>Offer place</Button><label className="field-inline">Reason for not selecting<textarea id={`not-selected-${referral.id}`} value={form.reason} onChange={(event) => updateForm(referral.id, { reason: event.target.value })} aria-describedby={actionErrors[referral.id] ? `not-selected-error-${referral.id}` : undefined} /></label>{actionErrors[referral.id] ? <p id={`not-selected-error-${referral.id}`} role="alert">{actionErrors[referral.id]}</p> : null}<Button variant="secondary" onClick={() => act(referral.id, 'not-selected')}>Not selected</Button></div> : null}
        {status === 'offered' ? <p>Waiting for the creative to respond. This offer does not hold a place.</p> : null}
        {status === 'accepted' ? <><label className="field-inline">Practical instructions for confirmation<textarea value={form.instructions} onChange={(event) => updateForm(referral.id, { instructions: event.target.value })} /></label><Button disabled={cap.remaining <= 0 || opportunity.state !== 'published'} onClick={() => act(referral.id, 'confirm')}>Confirm place</Button>{opportunity.state !== 'published' ? <p>Confirmation is blocked because this opportunity is {opportunity.state}. The accepted referral remains recorded.</p> : cap.remaining <= 0 ? <p>All places are in use. Confirmation is blocked until a place is available.</p> : null}</> : null}
        {status === 'confirmed' ? <><p>Instructions: {referral.instructions || 'No instructions recorded yet.'}</p><label className="field-inline">Practical instructions<textarea id={`instructions-${referral.id}`} value={form.instructions} onChange={(event) => updateForm(referral.id, { instructions: event.target.value })} aria-describedby={actionErrors[referral.id] ? `instructions-error-${referral.id}` : undefined} /></label>{actionErrors[referral.id] ? <p id={`instructions-error-${referral.id}`} role="alert">{actionErrors[referral.id]}</p> : null}<Button variant="secondary" onClick={() => act(referral.id, 'instructions')}>Save instructions</Button><label className="field-inline">Record outcome<select value={form.outcome} onChange={(event) => updateForm(referral.id, { outcome: event.target.value as OutcomeState })}><option value="">Choose an outcome</option><option value="completed">Attended / completed</option><option value="did_not_attend">Did not attend</option><option value="awaiting_follow_up">Awaiting follow-up</option></select></label><Button disabled={!form.outcome || !OUTCOME_STATES.includes(form.outcome as OutcomeState)} onClick={() => act(referral.id, 'outcome')}>Record outcome</Button></> : null}
        {status === 'awaiting_follow_up' ? <><p>Outcome: awaiting follow-up. This is a support record, not paid work or income.</p><label className="field-inline">Record follow-up outcome<select value={form.outcome} onChange={(event) => updateForm(referral.id, { outcome: event.target.value as OutcomeState })}><option value="">Choose an outcome</option><option value="completed">Attended / completed</option><option value="did_not_attend">Did not attend</option><option value="awaiting_follow_up">Keep awaiting follow-up</option></select></label><Button disabled={!form.outcome || !OUTCOME_STATES.includes(form.outcome as OutcomeState)} onClick={() => act(referral.id, 'outcome')}>Record outcome</Button></> : null}
        {outcomeState ? <p>This record tracks support received. It does not mean paid work or income.</p> : null}
        {openCaseNow ? <CaseResolution key={caseFor!.id} item={caseFor!} form={caseForm} updateForm={(patch) => updateCaseForm(caseFor!.id, patch)} /> : null}
        <details><summary>Referral history</summary>{auditFor(referral.id).length ? <ol className="timeline-list">{auditFor(referral.id).map((event) => <li key={event.id}><strong>{event.action.replaceAll('_', ' ')}</strong><time>{event.at.slice(0, 10)}</time>{event.reason ? <p>{event.reason}</p> : null}<p>{event.actor.role} · {event.actor.id}{event.via ? ` · relayed by ${event.via}` : ''}</p></li>)}</ol> : <p>No recorded actions.</p>}</details>
      </article>;
    })}</section> : null)}
    {feedback ? <p role="status" aria-live="polite">{feedback}</p> : null}
  </div>;
}

function CaseResolution({ item, form, updateForm }: { item: { id: string; reason: string }; form: { resolution: string; outcome: OutcomeState | 'keep' | '' }; updateForm: (patch: Partial<{ resolution: string; outcome: OutcomeState | 'keep' | '' }>) => void }) {
  const { run } = useDemo();
  const [message, setMessage] = useState('');
  return <section className="notice notice-warning"><h3>Outcome correction request</h3><p>Request: {item.reason}</p><label className="field-inline">Council decision<select value={form.outcome} onChange={(event) => updateForm({ outcome: event.target.value as OutcomeState | 'keep' | '' })}><option value="">Choose explicitly</option><option value="completed">Correct to attended / completed</option><option value="did_not_attend">Correct to did not attend</option><option value="awaiting_follow_up">Correct to awaiting follow-up</option><option value="keep">Keep the recorded outcome</option></select></label><label className="field-inline">Reason for decision<textarea value={form.resolution} onChange={(event) => updateForm({ resolution: event.target.value })} /></label><Button disabled={!form.outcome || !form.resolution.trim()} onClick={() => { const result = run((data, ctx) => resolveCase(data, ctx, { caseId: item.id, resolution: form.resolution, ...(form.outcome && form.outcome !== 'keep' ? { newOutcome: form.outcome } : {}) })); setMessage(result.ok ? 'Outcome request resolved.' : result.message); }}>Resolve outcome request</Button>{message ? <p role="status">{message}</p> : null}</section>;
}
