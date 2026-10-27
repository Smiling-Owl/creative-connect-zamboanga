import { useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { PublicProfileCard } from '../../components/PublicProfileCard';
import { focusProfileField, ProfileFieldsEditor } from '../../components/ProfileFieldsEditor';
import { Button, Notice, StatusBadge } from '../../components/ui';
import { APPLICATION_LABEL, LISTING_LABEL, UPDATE_PENDING_LABEL } from '../../labels';
import { approveApplication, declineApplication, editProfile, intakeValidationErrors, requestChanges, requestPublicContentChanges, resolveDuplicate, resolveUpdate, startReview } from '../../domain/application';
import { openCase, resolveCase } from '../../domain/cases';
import { councilCases, councilQueue, creativeView } from '../../domain/selectors';
import { projectPublicIntake } from '../../domain/publicProfile';
import { approvePublicContent, listingStatus, setListing } from '../../domain/visibility';
import type { CaseKind, IntakeFields } from '../../domain/types';
import { demoTime, useDemo } from '../../state/store';

type QueueTab = 'new' | 'resubmitted' | 'under_review' | 'cases' | 'records';
const TABS: { id: QueueTab; label: string }[] = [
  { id: 'new', label: 'New' }, { id: 'resubmitted', label: 'Resubmitted' },
  { id: 'under_review', label: 'Under review' }, { id: 'cases', label: 'Cases' }, { id: 'records', label: 'Record search' },
];

export function CouncilView({ id }: { id: 'M01' | 'M02' }) {
  const { recordId = '' } = useParams();
  return id === 'M01' ? <CouncilQueue /> : <CouncilRecord key={recordId} />;
}

function CouncilQueue() {
  const { state } = useDemo();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') ?? 'new';
  const tab: QueueTab = TABS.some((item) => item.id === raw) ? raw as QueueTab : 'new';
  const [query, setQuery] = useState('');
  const records = councilQueue(state.data, tab);
  const cases = councilCases(state.data).filter((item) => item.state === 'open');
  const filtered = useMemo(() => records.filter((record) => {
    const haystack = [record.application.reference, record.intake.displayName, record.intake.name, record.source.mode, record.siteId ?? ''].join(' ').toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [records, query]);
  return <div className="public-stack">
    <section className="public-card">
      <p>Only records received by the council appear here. Local drafts and coordinator queues are not council submissions.</p>
      <nav aria-label="Council record queues" className="action-row">
        {TABS.map((item) => <Button key={item.id} variant={tab === item.id ? 'primary' : 'secondary'} aria-pressed={tab === item.id} onClick={() => setParams(item.id === 'new' ? {} : { tab: item.id })}>{item.label}</Button>)}
      </nav>
      <label className="field-inline">Search reference, display name, or intake source<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </section>
    {tab === 'cases' ? <section className="public-card"><h2>Open cases</h2>{cases.length ? <ul className="record-list">{cases.map((item) => {
      const record = state.data.records.find((entry) => entry.id === item.recordId);
      const referral = item.referralId ? state.data.referrals.find((entry) => entry.id === item.referralId) : null;
      return <li key={item.id}><strong>{caseLabel(item.kind)}</strong> · {record?.intake.displayName} · {record?.application.reference}<p>{item.reason}</p>{item.kind === 'outcome_correction' && referral ? <Link to={`/council/referrals/${referral.opportunityId}`}>Review outcome request</Link> : <Link to={`/council/applications/${item.recordId}`}>Open record and case</Link>}</li>;
    })}</ul> : <p>No open cases.</p>}</section> : <section className="public-card"><h2>{TABS.find((item) => item.id === tab)?.label} · {filtered.length}</h2>{filtered.length ? <ul className="record-list">{filtered.map((record) => { const age = Math.max(0, Math.floor((Date.parse(demoTime(state.clock)) - Date.parse(record.application.receivedAt)) / 86_400_000)); return <li key={record.id}><Link to={`/council/applications/${record.id}`}><strong>{record.application.reference}</strong> · {record.intake.displayName}</Link><p>{APPLICATION_LABEL[record.application.state].label} · {age} demo days · {record.source.mode === 'assisted' ? 'Coordinator-assisted' : 'Self-service'}{record.source.siteId ? ` · ${state.data.sites.find((site) => site.id === record.source.siteId)?.name ?? record.source.siteId}` : ''}{record.application.version > 1 ? ` · Version ${record.application.version}` : ''}{age > 5 ? ' · Overdue review (5-day demo assumption)' : ''}</p>{record.application.duplicate?.status === 'open' ? <StatusBadge label="Possible duplicate" tone="warning" /> : null}{record.application.updatePending ? <StatusBadge label={UPDATE_PENDING_LABEL.label} tone="warning" /> : null}</li>; })}</ul> : <p>No received records match this queue.</p>}</section>}
  </div>;
}

function CouncilRecord() {
  const { recordId = '' } = useParams();
  const { state, run } = useDemo();
  const record = state.data.records.find((item) => item.id === recordId);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const reasonInput = useRef<HTMLTextAreaElement | null>(null);
  const [publicDecision, setPublicDecision] = useState<'approve' | 'changes' | 'not_reviewed'>('approve');
  const [duplicateReason, setDuplicateReason] = useState('');
  const [caseResolutions, setCaseResolutions] = useState<Record<string, string>>({});
  const [reopenCases, setReopenCases] = useState<Record<string, boolean>>({});
  const linked = record?.application.duplicate?.status === 'linked';
  if (!record) return <section className="public-card"><h2>Record not found</h2><Link to="/council">Return to council queue</Link></section>;
  const perform = (fn: Parameters<typeof run>[0]) => {
    const result = run(fn);
    setMessage(result.ok ? 'Decision saved in the demo record.' : result.message);
    if (result.ok) setReason('');
  };
  const candidate = record.application.duplicate ? state.data.records.find((item) => item.id === record.application.duplicate?.candidateRecordId) : null;
  const timeline = state.data.audit.filter((event) => event.entityId === record.id).slice().reverse();
  const openCases = state.data.cases.filter((item) => item.recordId === record.id && item.state === 'open');
  const listedPreview = projectPublicIntake(record.id, record.intake, record.lastConfirmed);
  return <div className="public-stack">
    <section className="public-card"><Link to="/council">← Council queue</Link><p><StatusBadge label={APPLICATION_LABEL[record.application.state].label} tone={APPLICATION_LABEL[record.application.state].tone} /></p><h2>{record.intake.displayName} · {record.application.reference}</h2><p>Record version {record.application.version} · {record.source.mode === 'assisted' ? 'Coordinator-assisted' : 'Self-service'} · received {record.application.receivedAt.slice(0, 10)}</p>{record.application.reason ? <Notice tone="warning" title="Current council reason"><p>{record.application.reason}</p></Notice> : null}{linked ? <Notice tone="warning" title="Linked record"><p>This alias retains its account, referrals, and history separately. It cannot be newly verified or listed.</p></Notice> : null}</section>
    <section className="public-card"><h2>Application details · council only</h2><dl className="compact-readback"><dt>Name for council record</dt><dd>{record.intake.name}</dd><dt>Display name</dt><dd>{record.intake.displayName}</dd><dt>Domain and practice</dt><dd>{record.intake.domain} · {record.intake.practice}</dd><dt>Skills</dt><dd>{record.intake.skills.join(', ')}</dd><dt>General location</dt><dd>{record.intake.area}</dd><dt>Support interests</dt><dd>{record.intake.interests.join(', ') || 'None selected'}</dd><dt>Follow-up arrangement</dt><dd>{record.intake.followUp.kind === 'coordinator_mediated' ? `Coordinator-mediated: ${record.intake.followUp.coordinatorId}` : `Own channel: ${record.intake.followUp.channelLabel}`}</dd><dt>Acknowledged information notice</dt><dd>{record.intake.acknowledged ? 'Yes' : 'No'}</dd><dt>Listing choice</dt><dd>{record.optedIn ? 'Opted in' : 'Opted out'}</dd></dl><h3>Work evidence</h3><ul>{record.intake.evidence.map((item) => <li key={item.id}>{item.kind.replaceAll('_', ' ')} · {item.text} · {item.publicApproved ? 'Creator marked for public display' : 'Private to council'}</li>)}</ul><p><strong>Source:</strong> {record.source.mode} · {record.source.siteId ?? 'No site'} · captured {record.source.capturedOn}</p></section>
    <section className="public-card"><h2>Public profile allowlist preview</h2><p>This preview contains only fields permitted in the public directory. Private evidence is omitted.</p><PublicProfileCard profile={listedPreview} eyebrow="Council review preview" draftPreview /></section>
    {candidate ? <section className="public-card"><h2>Possible duplicate comparison</h2><div className="comparison-grid"><div><h3>This record</h3><p>{record.intake.displayName} · {record.intake.area}</p><p>{record.intake.practice}</p><p>Reference {record.application.reference}</p></div><div><h3>Possible match · separate record</h3><p>{candidate.intake.displayName} · {candidate.intake.area}</p><p>{candidate.intake.practice}</p><p>Reference {candidate.application.reference}</p></div></div><p>{record.application.duplicate?.reason ?? 'Review both records before deciding.'}</p>{record.application.duplicate?.status === 'open' ? <><label className="field-inline">Reason for linking or keeping separate<textarea value={duplicateReason} onChange={(event) => setDuplicateReason(event.target.value)} rows={3} /></label><div className="action-row"><Button disabled={!duplicateReason.trim()} variant="secondary" onClick={() => perform((data, ctx) => resolveDuplicate(data, ctx, { recordId, decision: 'not_duplicate', reason: duplicateReason }))}>Not a duplicate</Button><Button disabled={!duplicateReason.trim()} variant="secondary" onClick={() => perform((data, ctx) => resolveDuplicate(data, ctx, { recordId, decision: 'linked', reason: duplicateReason }))}>Link to existing record</Button></div></> : <p>Decision recorded: {record.application.duplicate?.status}.</p>}</section> : null}
    {candidate && record.application.duplicate?.status === 'linked' ? <section className="public-card"><h2>Linked record history · read only</h2><p>{candidate.application.reference} remains separate; referrals and history are not moved or merged.</p><ul>{state.data.audit.filter((event) => event.entityId === candidate.id).slice(-6).reverse().map((event) => <li key={event.id}>{event.at.slice(0, 10)} · {event.action}{event.reason ? ` · ${event.reason}` : ''}</li>)}</ul><h3>Separate referrals</h3><ul>{state.data.referrals.filter((item) => item.recordId === candidate.id).map((item) => <li key={item.id}>{item.id} · {item.state}</li>)}</ul></section> : null}
    {record.application.duplicate?.status !== 'linked' && state.data.records.some((alias) => alias.application.duplicate?.status === 'linked' && alias.application.duplicate.candidateRecordId === record.id) ? <section className="public-card"><h2>Linked record history · read only</h2>{state.data.records.filter((alias) => alias.application.duplicate?.status === 'linked' && alias.application.duplicate.candidateRecordId === record.id).map((alias) => <article key={alias.id}><h3>{alias.application.reference} · {alias.intake.displayName}</h3><p>This linked alias stays separate; its referrals and history are not merged.</p><ul>{state.data.audit.filter((event) => event.entityId === alias.id).slice(-6).reverse().map((event) => <li key={event.id}>{event.at.slice(0, 10)} · {event.action}{event.reason ? ` · ${event.reason}` : ''}</li>)}</ul><h4>Separate referrals</h4><ul>{state.data.referrals.filter((item) => item.recordId === alias.id).map((item) => <li key={item.id}>{item.id} · {item.state}</li>)}</ul></article>)}</section> : null}
    {!linked ? <section className="public-card"><h2>Review actions</h2>{record.application.state === 'received' ? <Button onClick={() => perform((data, ctx) => startReview(data, ctx, recordId))}>Start review</Button> : null}{record.application.state === 'under_review' ? <><label className="field-inline">Council reason for changes or decline<textarea ref={reasonInput} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label><fieldset><legend>Public content decision</legend><label><input type="radio" checked={publicDecision === 'approve'} onChange={() => setPublicDecision('approve')} /> Approve current public content</label><label><input type="radio" checked={publicDecision === 'changes'} onChange={() => setPublicDecision('changes')} /> Membership approved, public changes needed</label><label><input type="radio" checked={publicDecision === 'not_reviewed'} onChange={() => setPublicDecision('not_reviewed')} /> Membership approved, public content not reviewed</label></fieldset>{publicDecision === 'changes' ? <p>The reason above will be saved as the public-content change request.</p> : null}<div className="action-row"><Button disabled={record.application.duplicate?.status === 'open'} onClick={() => { if (publicDecision === 'changes' && !reason.trim()) { setMessage('Add a reason for the public profile changes.'); reasonInput.current?.focus(); return; } perform((data, ctx) => approveApplication(data, ctx, { recordId, approvePublicContent: publicDecision === 'approve', ...(publicDecision === 'changes' ? { publicChangesReason: reason } : {}) })); }}>Approve membership</Button><Button variant="secondary" onClick={() => { if (!reason.trim()) { setMessage('Add a reason before requesting changes.'); reasonInput.current?.focus(); return; } perform((data, ctx) => requestChanges(data, ctx, { recordId, reason })); }}>Request changes</Button><Button variant="danger" onClick={() => { if (!reason.trim()) { setMessage('Add a reason before declining.'); reasonInput.current?.focus(); return; } perform((data, ctx) => declineApplication(data, ctx, { recordId, reason })); }}>Decline</Button></div>{record.application.duplicate?.status === 'open' ? <p>Resolve the possible duplicate before approval.</p> : null}</> : null}{record.application.state === 'verified' && record.application.updatePending ? <><p>{record.application.updateReason ? `Changes needed: ${record.application.updateReason}` : 'A profile update is waiting for council review.'}</p><label className="field-inline">If requesting more changes, explain what is needed<textarea ref={reasonInput} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="action-row"><Button onClick={() => perform((data, ctx) => resolveUpdate(data, ctx, { recordId, decision: 'approve' }))}>Approve profile update</Button><Button variant="secondary" onClick={() => { if (!reason.trim()) { setMessage('Add a reason before requesting profile changes.'); reasonInput.current?.focus(); return; } perform((data, ctx) => resolveUpdate(data, ctx, { recordId, decision: 'request_changes', reason })); }}>Request profile changes</Button></div></> : null}</section> : null}
    {record.application.state === 'verified' && !record.application.updatePending && record.optedIn && listingStatus(record) === 'pending_review' ? <section className="public-card"><h2>Public content review</h2><p>Membership is already verified. Approve the allowlisted public content or explain what the creative should change.</p><label className="field-inline">Reason for requested public changes<textarea ref={reasonInput} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="action-row"><Button onClick={() => perform((data, ctx) => approvePublicContent(data, ctx, recordId))}>Approve public content</Button><Button variant="secondary" onClick={() => { if (!reason.trim()) { setMessage('Add a reason before requesting public changes.'); reasonInput.current?.focus(); return; } perform((data, ctx) => requestPublicContentChanges(data, ctx, { recordId, reason })); }}>Request public changes</Button></div></section> : null}
    {openCases.length ? <section className="public-card"><h2>Open cases</h2>{openCases.map((item) => <article key={item.id}><h3>{caseLabel(item.kind)}</h3><p>Request: {item.reason}</p>{item.kind === 'outcome_correction' ? <p><Link to={`/council/referrals/${state.data.referrals.find((referral) => referral.id === item.referralId)?.opportunityId ?? ''}`}>Choose a correction or keep the current outcome in the referral tracker</Link></p> : <>{item.kind === 'human_review' ? <label><input type="checkbox" checked={reopenCases[item.id] ?? false} onChange={(event) => setReopenCases((previous) => ({ ...previous, [item.id]: event.target.checked }))} /> Reopen council review</label> : null}<label className="field-inline">Resolution note<textarea rows={2} value={caseResolutions[item.id] ?? ''} onChange={(event) => setCaseResolutions((previous) => ({ ...previous, [item.id]: event.target.value }))} /></label><Button disabled={!(caseResolutions[item.id] ?? '').trim()} onClick={() => perform((data, ctx) => resolveCase(data, ctx, { caseId: item.id, resolution: caseResolutions[item.id] ?? '', reopen: reopenCases[item.id] ?? false }))}>{item.kind === 'human_review' && reopenCases[item.id] ? 'Reopen review' : 'Resolve case'}</Button></>}</article>)}</section> : null}
    <section className="public-card"><h2>Review history</h2>{timeline.length ? <ol className="timeline-list">{timeline.map((event) => <li key={event.id}><strong>{event.action.replaceAll('_', ' ')}</strong><span>{event.at.slice(0, 10)}</span>{event.reason ? <p>{event.reason}</p> : null}</li>)}</ol> : <p>No review history yet.</p>}</section>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}

export function CreativeProfileView() {
  const { state, actor, run } = useDemo();
  const view = creativeView(state.data, actor.id);
  const record = view.record;
  const [fields, setFields] = useState<IntakeFields | null>(record ? structuredClone(record.intake) : null);
  const [formErrors, setFormErrors] = useState<{ field: string; message: string }[]>([]);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const requestReasonInput = useRef<HTMLTextAreaElement | null>(null);
  if (!record) return <section className="public-card"><h2>Profile editor unavailable</h2><p>Your personal profile editor is available after an existing record is linked to your account.</p><Link to="/me">Open your status</Link></section>;
  if (record.application.state !== 'verified') return <section className="public-card"><h2>Profile editor unavailable</h2><p>Your record is still in council review. Use the reason on your home page if the council requested changes.</p><Link to="/me">Open your status</Link></section>;
  const current = fields ?? record.intake;
  const change = (updated: IntakeFields) => { setFields(updated); setFormErrors([]); };
  const save = () => {
    if (!fields) return;
    const updated = { ...fields, skills: fields.skills.map((item) => item.trim()).filter(Boolean), interests: fields.interests.map((item) => item.trim()).filter(Boolean) };
    const validation = intakeValidationErrors(updated);
    if (validation.length) { setFormErrors(validation); focusProfileField(validation[0]!.field); return; }
    setFormErrors([]);
    const result = run((data, ctx) => editProfile(data, ctx, { recordId: record.id, fields: updated }));
    setMessage(result.ok ? 'Profile saved. Membership remains verified; reviewed changes wait for council approval.' : result.message);
  };
  const listing = view.listing;
  const old = Date.parse(demoTime(state.clock)) - Date.parse(record.lastConfirmed) >= 90 * 24 * 60 * 60 * 1000;
  const correctionOpen = state.data.cases.some((item) => item.recordId === record.id && item.kind === 'profile_correction' && item.state === 'open');
  const withdrawalOpen = state.data.cases.some((item) => item.recordId === record.id && item.kind === 'withdrawal' && item.state === 'open');
  const ownCases = state.data.cases.filter((item) => item.recordId === record.id);
  const request = (kind: CaseKind) => {
    if (!reason.trim()) { setMessage('Add a reason before sending this request.'); requestReasonInput.current?.focus(); return; }
    const result = run((data, ctx) => openCase(data, ctx, { kind, recordId: record.id, reason }));
    setMessage(result.ok ? 'Your request is recorded for the council.' : result.message);
    if (result.ok) setReason('');
  };
  const previewFields = { ...current, skills: current.skills.map((item) => item.trim()).filter(Boolean), interests: current.interests.map((item) => item.trim()).filter(Boolean) };
  const preview = projectPublicIntake(record.id, previewFields, record.lastConfirmed);
  const previewIsDraft = listing !== 'listed' || record.application.updatePending || JSON.stringify(previewFields) !== JSON.stringify(record.intake);
  return <div className="public-stack">
    <section className="public-card"><h2>Profile and listing status</h2><p><StatusBadge label={LISTING_LABEL[listing!].label} tone={LISTING_LABEL[listing!].tone} /></p>{record.application.updatePending ? <p><StatusBadge label={UPDATE_PENDING_LABEL.label} tone={UPDATE_PENDING_LABEL.tone} />{record.application.updateReason ? ` ${record.application.updateReason}` : ''}</p> : null}<p>Last confirmed {record.lastConfirmed.slice(0, 10)}.{old ? ' Refresh prompt: this profile is over the 90-day demo reminder interval. Review it when convenient.' : ''}</p><label className="choice-row"><input type="checkbox" checked={record.optedIn} disabled={withdrawalOpen && !record.optedIn} onChange={(event) => { const result = run((data, ctx) => setListing(data, ctx, { recordId: record.id, optedIn: event.target.checked })); setMessage(result.ok ? (event.target.checked ? 'Listing choice saved. Changed public content may wait for council review.' : 'Your profile is no longer listed.') : result.message); }} /> I want my profile considered for the public directory</label><p>Turning listing off takes effect immediately. Membership and support eligibility stay separate.</p>{withdrawalOpen ? <p>A withdrawal request is waiting for the council. Listing cannot be turned back on until it is resolved.</p> : null}</section>
    <ProfileFieldsEditor fields={current} onChange={change} errors={formErrors} />
    <div className="action-row"><Button onClick={save}>Save profile changes</Button></div>
    <section className="public-card"><h2>Public profile preview</h2><p>This is the same allowlisted card used by the directory. Private contact, interests, and evidence stay out of the preview.</p><PublicProfileCard profile={preview} eyebrow="Your preview" draftPreview={previewIsDraft} /></section>
    <section className="public-card"><h2>Ask the council for help</h2><label className="field-inline">Reason for your request<textarea ref={requestReasonInput} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="action-row"><Button variant="secondary" disabled={correctionOpen} onClick={() => request('profile_correction')}>Request a correction</Button><Button variant="danger" disabled={withdrawalOpen} onClick={() => request('withdrawal')}>Request withdrawal</Button></div>{correctionOpen ? <p>A correction request is waiting for the council.</p> : null}{withdrawalOpen ? <Notice tone="warning">Your profile is removed from public listing while the council reviews this request.</Notice> : null}{message ? <p role="status">{message}</p> : null}</section>
    <section className="public-card"><h2>Your requests to the council</h2>{ownCases.length ? <ol className="timeline-list">{ownCases.slice().reverse().map((item) => <li key={item.id}><strong>{caseLabel(item.kind)} · {item.state === 'open' ? 'Waiting for council' : 'Resolved'}</strong><p>{item.reason}</p>{item.resolution ? <p><strong>Council note:</strong> {item.resolution}</p> : null}</li>)}</ol> : <p>No requests have been sent.</p>}</section>
  </div>;
}

function caseLabel(kind: CaseKind): string {
  return ({ human_review: 'Human review', profile_correction: 'Profile correction', withdrawal: 'Withdrawal', outcome_correction: 'Outcome correction' } as Record<CaseKind, string>)[kind];
}
