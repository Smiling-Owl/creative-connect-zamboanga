import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { AccessDenied, Button, ConfirmDialog, Notice, Simulated, StatusBadge } from '../../components/ui';
import { inviteAccount } from '../../domain/account';
import { assistProfileUpdate, recordFollowupNote } from '../../domain/coordinator';
import { openCase } from '../../domain/cases';
import { intakeValidationErrors } from '../../domain/application';
import { coordinatorWorkspace, noticesFor } from '../../domain/selectors';
import { resolveConflict, syncQueue } from '../../domain/queue';
import { respondToOffer } from '../../domain/referral';
import type { IntakeFields, QueueItem } from '../../domain/types';
import { focusProfileField, ProfileFieldsEditor } from '../../components/ProfileFieldsEditor';
import { APPLICATION_LABEL, REFERRAL_LABEL, TRANSFER_LABEL } from '../../labels';
import { useDemo } from '../../state/store';

export function CoordinatorView({ id }: { id: 'F01' | 'F02' }) {
  const { actor } = useDemo();
  const { recordId = '' } = useParams();
  return id === 'F01' ? <Workspace /> : <AssistedRecord key={`${actor.id}:${recordId}`} />;
}

function Workspace() {
  const { state, actor, run, setOnline } = useDemo();
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = coordinatorWorkspace(state.data, actor);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(state.settings);
  const syncActor = useRef(actor.id);
  const syncEpoch = useRef(0);
  useEffect(() => { settingsRef.current = state.settings; }, [state.settings]);
  useEffect(() => {
    if (syncActor.current === actor.id) return;
    syncActor.current = actor.id;
    syncEpoch.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setSendingId(null);
    setFeedback('Sync paused because the coordinator persona changed. The item remains in this device queue.');
  }, [actor.id]);
  const notices = noticesFor(state.data, actor, 5);
  const followupRecords = workspace.records.filter((record) => record.intake.followUp.kind === 'coordinator_mediated' || state.data.referrals.some((referral) => referral.recordId === record.id && referral.state === 'offered'));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = normalizedQuery
    ? workspace.records.filter((record) => `${record.intake.displayName} ${record.intake.name} ${record.application.reference}`.toLocaleLowerCase().includes(normalizedQuery))
    : [];

  useEffect(() => () => {
    syncEpoch.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const sendNext = (itemId?: string, continueQueue = false, allowResolved = false) => {
    if (!state.settings.online || sendingId) return;
    const next = workspace.queue.find((item) => itemId ? item.id === itemId && (item.status === 'waiting' || item.status === 'failed' || allowResolved) : item.status === 'waiting');
    if (!next) {
      setFeedback('There are no waiting items to send.');
      return;
    }
    const sendActor = actor.id;
    const sendEpoch = ++syncEpoch.current;
    setSendingId(next.id);
    setFeedback(`Sending ${next.deviceRef}…`);
    timer.current = setTimeout(() => {
      if (sendEpoch !== syncEpoch.current || syncActor.current !== sendActor) return;
      timer.current = null;
      if (!settingsRef.current.online) {
        setSendingId(null);
        setFeedback('Connection changed before receipt. The item is still waiting on this device.');
        return;
      }
      const result = run((data, ctx) => syncQueue(data, ctx, { itemId: next.id }));
      setSendingId(null);
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      const attempted = result.data.queue.find((item) => item.id === next.id);
      if (attempted?.status === 'failed') {
        setFeedback('Sending failed. Nothing was received; retry this item when connected.');
        return;
      }
      if (attempted?.status === 'conflict') {
        setFeedback('Needs attention — the council record changed since this was queued. Review the comparison before resubmitting.');
        return;
      }
      if (attempted?.status !== 'delivered') {
        setFeedback('The council has not confirmed receipt. Check this item in the device queue.');
        return;
      }
      if (!continueQueue) {
        setFeedback('This item was received by the council.');
        return;
      }
      const further = result.data.queue.find((item) => item.coordinatorId === actor.id && item.status === 'waiting');
      if (further) sendNext(further.id, true);
      else setFeedback('All waiting items were sent.');
    }, 300);
  };

  return <div className="coordinator-stack">
    <div className="coordinator-summary"><div><p className="eyebrow">Assigned site</p><strong>{state.data.sites.find((site) => site.id === actor.siteId)?.name ?? 'No site assigned'}</strong></div><StatusBadge label={state.settings.online ? 'Connected — demo setting' : 'Offline — demo setting'} tone={state.settings.online ? 'success' : 'warning'} /><Button variant="secondary" onClick={() => setOnline(!state.settings.online)} aria-pressed={!state.settings.online}>{state.settings.online ? 'Go offline' : 'Connect'}</Button></div>
    <Simulated>device storage and connectivity are simulated in this browser. A queued item is not visible to the council until receipt is confirmed.</Simulated>
    <section className="public-card" aria-labelledby="search-records-title">
      <h2 id="search-records-title">Search existing records before adding</h2>
      <form className="coordinator-search" onSubmit={(event) => { event.preventDefault(); setSearched(true); }}>
        <label className="field-inline" htmlFor="assigned-search">Name or council reference<input id="assigned-search" value={query} onChange={(event) => { setQuery(event.target.value); setSearched(false); }} /></label>
        <Button type="submit" variant="secondary">Search assigned records</Button>
      </form>
      {!state.settings.online ? <Notice tone="warning">Duplicate check pending — will run when received. Search is limited to records assigned to this site.</Notice> : null}
      {searched ? matches.length ? <ul className="coordinator-record-list">{matches.map((record) => <li key={record.id}><Link to={`/coordinator/records/${record.id}`}>{record.intake.displayName}</Link><span>{record.application.reference}</span><StatusBadge label={APPLICATION_LABEL[record.application.state].label} tone={APPLICATION_LABEL[record.application.state].tone} /></li>)}</ul> : <p>No assigned record matches this search.</p> : <p className="muted">Search runs only against this coordinator’s assigned site.</p>}
      <Button disabled={!searched || matches.length > 0} onClick={() => navigate('/apply')}>Add creative</Button>
      {matches.length > 0 ? <p className="muted">Open the matching assigned record before starting another intake.</p> : null}
      {!state.settings.online ? <p className="muted">You can capture offline after searching. Any duplicate check beyond this assigned site is pending until receipt.</p> : null}
    </section>

    <div className="coordinator-columns">
      <section className="public-card"><h2>Assigned records</h2>{workspace.records.length ? <ul className="coordinator-record-list">{workspace.records.map((record) => <li key={record.id}><Link to={`/coordinator/records/${record.id}`}>{record.intake.displayName}</Link><span>{record.application.reference}</span><StatusBadge label={APPLICATION_LABEL[record.application.state].label} tone={APPLICATION_LABEL[record.application.state].tone} /></li>)}</ul> : <p>No received records are assigned to this site.</p>}</section>
      <section className="public-card"><h2>Your drafts</h2>{workspace.drafts.length ? <ul className="coordinator-record-list">{workspace.drafts.map((draft) => <li key={draft.id}><div><strong>{draft.fields.displayName || 'Unnamed draft'}</strong><small>{draft.recordId ? 'Correction draft' : 'Assisted intake draft'} · saved {draft.updatedAt.slice(0, 10)}</small></div><Link to={`/apply?draftId=${encodeURIComponent(draft.id)}${draft.recordId ? `&recordId=${encodeURIComponent(draft.recordId)}` : ''}`}>Resume draft</Link></li>)}</ul> : <p>No saved drafts.</p>}</section>
    </div>

    <section className="public-card" aria-labelledby="device-queue-title"><div className="coordinator-section-heading"><div><h2 id="device-queue-title">Device queue</h2><p>Waiting, sending, failed and received items on this coordinator device.</p></div><Button disabled={!state.settings.online || sendingId !== null || !workspace.queue.some((item) => item.status === 'waiting')} onClick={() => sendNext(undefined, true)}>Sync now</Button></div>
      {feedback ? <p role="status" aria-live="polite">{feedback}</p> : null}
      {workspace.queue.length ? <div className="queue-list">{[...workspace.queue].sort((a, b) => a.queuedAt.localeCompare(b.queuedAt)).map((item) => <QueueCard key={item.id} item={item} sending={item.id === sendingId} online={state.settings.online} onRetry={() => sendNext(item.id)} onConflict={(action) => {
        const result = run((data, ctx) => resolveConflict(data, ctx, { itemId: item.id, action }));
        if (!result.ok) { setFeedback(result.message); return; }
        if (action === 'resubmit') { setFeedback('Reviewed change. Resubmitting the same record and device reference.'); sendNext(item.id, false, true); }
        else setFeedback('Queued change discarded. The council record was not changed.');
      }} />)}</div> : <p>No items are queued on this device.</p>}
    </section>

    <section className="public-card" id="coordinator-followups" aria-labelledby="followups-title"><h2 id="followups-title">Assigned follow-ups</h2>{location.search.includes('tab=followups') ? <p>Showing assigned records with coordinator-mediated follow-up or an offer awaiting response.</p> : <p>Follow-up tasks for records assigned to this site.</p>}{followupRecords.length ? <ul className="coordinator-record-list">{followupRecords.map((record) => <li key={record.id}><Link to={`/coordinator/records/${record.id}`}>{record.intake.displayName}</Link><span>{record.intake.followUp.kind === 'coordinator_mediated' ? 'Coordinator-mediated' : 'Offer awaiting response'}</span></li>)}</ul> : <p>No assigned follow-ups.</p>}</section>
    <section className="public-card"><h2>Coordinator notifications</h2><p>In-app examples — no SMS or email is sent.</p>{notices.length ? <ul className="notification-list">{notices.map((item) => <li key={item.id}><span>{item.text}</span><time>{item.at.slice(0, 10)}</time></li>)}</ul> : <p>No notifications yet.</p>}</section>
  </div>;
}

function QueueCard({ item, sending, online, onRetry, onConflict }: { item: QueueItem; sending: boolean; online: boolean; onRetry: () => void; onConflict: (action: 'resubmit' | 'discard') => void }) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const record = item.recordId ? item.recordId : null;
  const label = sending ? TRANSFER_LABEL.sending : TRANSFER_LABEL[item.status];
  return <article className="queue-item"><div className="queue-title"><div><h3>{item.fields.displayName || 'Unnamed creative'}</h3><p>{item.deviceRef} · {item.kind === 'correction' ? 'Correction' : 'New application'}</p></div><StatusBadge label={label.label} tone={label.tone} /></div>
    <dl className="queue-meta"><div><dt>Attempts</dt><dd>{item.attempts}</dd></div><div><dt>Last error</dt><dd>{item.lastError ?? 'None'}</dd></div></dl>
    {item.status !== 'delivered' ? <p className="muted">The council has not received this.</p> : <p>Received by the council. {item.deliveredRecordId ? <Link to={`/coordinator/records/${item.deliveredRecordId}`}>Open the same record</Link> : null}</p>}
    {item.status === 'failed' ? <Button variant="secondary" disabled={!online || sending} onClick={onRetry}>Retry</Button> : null}
    {item.status === 'conflict' ? <>
      <p><strong>Needs attention — the council record changed since this was queued.</strong></p>
      {record ? <ConflictDiff item={item} /> : null}
      <div className="action-row"><Button onClick={() => onConflict('resubmit')}>Review and resubmit</Button><Button variant="secondary" onClick={() => setConfirmDiscard(true)}>Discard queued change</Button></div>
      <ConfirmDialog open={confirmDiscard} title="Discard queued change?" message="This removes the unsent correction from this device. The council record stays as it is." confirmLabel="Discard change" onCancel={() => setConfirmDiscard(false)} onConfirm={() => { setConfirmDiscard(false); onConflict('discard'); }} />
    </> : null}
  </article>;
}

function ConflictDiff({ item }: { item: QueueItem }) {
  const { state } = useDemo();
  const record = item.recordId ? state.data.records.find((entry) => entry.id === item.recordId) : null;
  if (!record) return <p>The current council record is unavailable.</p>;
  const fields: Array<{ label: string; key: string; queued: string; current: string }> = [
    { label: 'Name for the council record', key: 'name', queued: item.fields.name, current: record.intake.name },
    { label: 'Display name', key: 'displayName', queued: item.fields.displayName, current: record.intake.displayName },
    { label: 'Creative domain', key: 'domain', queued: item.fields.domain, current: record.intake.domain },
    { label: 'Specific practice', key: 'practice', queued: item.fields.practice, current: record.intake.practice },
    { label: 'Skills', key: 'skills', queued: item.fields.skills.join(', '), current: record.intake.skills.join(', ') },
    { label: 'General location', key: 'area', queued: item.fields.area, current: record.intake.area },
    { label: 'Support interests', key: 'interests', queued: item.fields.interests.join(', ') || 'None selected', current: record.intake.interests.join(', ') || 'None selected' },
    { label: 'Follow-up arrangement', key: 'followUp', queued: describeFollowUp(item.fields.followUp), current: describeFollowUp(record.intake.followUp) },
    { label: 'Work evidence', key: 'evidence', queued: describeEvidence(item.fields), current: describeEvidence(record.intake) },
    { label: 'Information-use acknowledgment', key: 'acknowledged', queued: item.fields.acknowledged ? 'Acknowledged' : 'Not acknowledged', current: record.intake.acknowledged ? 'Acknowledged' : 'Not acknowledged' },
    { label: 'Public listing choice', key: 'optedIn', queued: item.optedIn ? 'Opted in' : 'Not opted in', current: record.optedIn ? 'Opted in' : 'Not opted in' },
  ];
  const changed = fields.filter(({ queued, current }) => queued !== current);
  return <div className="conflict-diff"><h4>Queued change and current council record</h4>{changed.length ? changed.map(({ label, key, queued, current }) => <div className="conflict-row" key={key}><strong>{label}</strong><div><span>Queued</span><p>{queued || 'Not provided'}</p></div><div><span>Current record</span><p>{current || 'Not provided'}</p></div></div>) : <p>The record’s displayed details match. Review still updates against its current version.</p>}</div>;
}

function describeFollowUp(followUp: IntakeFields['followUp']): string {
  return followUp.kind === 'coordinator_mediated' ? 'Coordinator-mediated' : `Person’s own channel: ${followUp.channelLabel}`;
}

function describeEvidence(fields: IntakeFields): string {
  return fields.evidence.map((item) => `${item.kind}: ${item.text} (${item.publicApproved ? 'may show publicly' : 'private'})`).join('; ') || 'No work evidence';
}

function AssistedRecord() {
  const { recordId = '' } = useParams();
  const { state, actor, run } = useDemo();
  const [note, setNote] = useState('');
  const [feedback, setFeedback] = useState('');
  const [relayForms, setRelayForms] = useState<Record<string, { agreed: boolean; response: 'accept' | 'decline'; reason: string }>>({});
  const [assistedFields, setAssistedFields] = useState<IntakeFields | null>(null);
  const [updateAgreed, setUpdateAgreed] = useState(false);
  const [updateErrors, setUpdateErrors] = useState<{ field: string; message: string }[]>([]);
  const [caseKind, setCaseKind] = useState<'profile_correction' | 'withdrawal'>('profile_correction');
  const [caseReason, setCaseReason] = useState('');
  const [caseAgreed, setCaseAgreed] = useState(false);
  const updateConsentRef = useRef<HTMLInputElement | null>(null);
  const caseConsentRef = useRef<HTMLInputElement | null>(null);
  const workspace = coordinatorWorkspace(state.data, actor);
  const record = workspace.records.find((item) => item.id === recordId);
  if (!record) return <AccessDenied title="Assisted record" />;

  const profileFields = assistedFields ?? record.intake;
  const recordCases = state.data.cases.filter((item) => item.recordId === record.id);
  const linkedAlias = record.application.duplicate?.status === 'linked';
  const referrals = state.data.referrals.filter((item) => item.recordId === record.id);
  const events = state.data.audit.filter((item) => item.entityId === record.id || referrals.some((referral) => item.entityId === referral.id)).slice(-12).reverse();
  const resultMessage = (result: ReturnType<typeof run>, success: string) => { setFeedback(result.ok ? success : result.message); };
  const updateRelayForm = (referralId: string, update: Partial<{ agreed: boolean; response: 'accept' | 'decline'; reason: string }>) => {
    setRelayForms((current) => ({ ...current, [referralId]: { agreed: false, response: 'accept', reason: '', ...current[referralId], ...update } }));
  };
  const handleNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = run((data, ctx) => recordFollowupNote(data, ctx, { recordId: record.id, note }));
    if (result.ok) setNote('');
    resultMessage(result, 'Follow-up note added to the record timeline.');
  };
  const submitProfileUpdate = () => {
    const errors = intakeValidationErrors(profileFields);
    if (errors.length) {
      setUpdateErrors(errors);
      focusProfileField(errors[0]!.field);
      return;
    }
    setUpdateErrors([]);
    if (!updateAgreed) {
      setFeedback('Confirm that the person agreed to these exact profile changes before sending.');
      updateConsentRef.current?.focus();
      return;
    }
    const fields = { ...profileFields, skills: profileFields.skills.map((item) => item.trim()).filter(Boolean), interests: profileFields.interests.map((item) => item.trim()).filter(Boolean) };
    const result = run((data, ctx) => assistProfileUpdate(data, ctx, { recordId: record.id, fields, personAgreed: updateAgreed }));
    resultMessage(result, 'The agreed profile update was recorded. Membership stays verified; reviewed public changes wait for the council.');
    setUpdateAgreed(false);
    if (result.ok) {
      const savedRecord = result.data.records.find((item) => item.id === record.id);
      if (savedRecord) setAssistedFields(structuredClone(savedRecord.intake));
    }
  };
  const submitProfileCase = () => {
    if (!caseReason.trim()) {
      setFeedback('Add a reason for the request.');
      document.getElementById('assisted-case-reason')?.focus();
      return;
    }
    if (!caseAgreed) {
      setFeedback('Confirm that the person agreed to this exact request before sending.');
      caseConsentRef.current?.focus();
      return;
    }
    const result = run((data, ctx) => openCase(data, ctx, { kind: caseKind, recordId: record.id, reason: caseReason, personAgreed: caseAgreed }));
    resultMessage(result, caseKind === 'withdrawal' ? 'Withdrawal request sent. This profile is now removed from the public directory.' : 'Profile correction request sent to the council.');
    setCaseAgreed(false);
    if (result.ok) setCaseReason('');
  };

  return <div className="coordinator-stack">
    <p><Link to="/coordinator">← Back to coordinator workspace</Link></p>
    <section className="public-card"><div className="record-heading"><div><p className="eyebrow">{record.application.reference}</p><h2>{record.intake.displayName}</h2></div><StatusBadge label={APPLICATION_LABEL[record.application.state].label} tone={APPLICATION_LABEL[record.application.state].tone} /></div><p>General location: {record.intake.area}</p><p>Creative domain: {record.intake.domain} · Specific practice: {record.intake.practice}</p><p>Skills: {record.intake.skills.join(', ')}</p><p>Source: Assisted registration at {state.data.sites.find((site) => site.id === record.siteId)?.name ?? 'assigned site'} on {record.source.capturedOn}.</p><p>Permission readback: Information-use notice acknowledged. Public listing choice: {record.optedIn ? 'opted in' : 'not opted in'}. Work examples: {record.intake.evidence.filter((entry) => entry.publicApproved).length} approved to show publicly.</p><p>Follow-up: {record.intake.followUp.kind === 'coordinator_mediated' ? 'Coordinator-mediated' : `Person’s own channel (${record.intake.followUp.channelLabel})`}. Private contact details are not shown here.</p>
      {record.application.state === 'changes_requested' && record.application.reason ? <Notice tone="warning" title="Current council request">{record.application.reason}<p><Link to={`/apply?recordId=${encodeURIComponent(record.id)}`}>Help correct this same record</Link></p></Notice> : null}
      <div className="action-row">{record.application.state === 'changes_requested' ? <Link className="btn btn-secondary" to={`/apply?recordId=${encodeURIComponent(record.id)}`}>Help correct</Link> : null}<Button variant="secondary" disabled={!state.settings.online} onClick={() => { const result = run((data, ctx) => inviteAccount(data, ctx, { recordId: record.id })); const code = result.ok ? result.data.records.find((entry) => entry.id === record.id)?.inviteCode : null; resultMessage(result, `Simulated invitation ready${code ? `: ${code}` : ''}. The person can claim this same record in Account access.`); }}>{record.inviteCode ? 'Show account invitation' : 'Send account invitation'}</Button></div>
      {!state.settings.online ? <p className="muted">Requires a connection. This invitation cannot be prepared while offline.</p> : null}
    </section>

    {feedback ? <p role="status" aria-live="polite">{feedback}</p> : null}
    {record.application.state === 'changes_requested' ? <section className="public-card"><h2>Help correct this record</h2><p>Continue the correction for the same record and council reference.</p><Link className="btn btn-primary" to={`/apply?recordId=${encodeURIComponent(record.id)}`}>Open correction intake</Link></section> : null}

    {record.application.state === 'verified' && !linkedAlias ? <>
      <section className="public-card"><h2>Help maintain this verified profile</h2><p>This is an assisted update to the same council record. No personal account is required. The person must agree to the exact details before you send them. Public content changes may wait for council review; membership stays verified.</p>
        <ProfileFieldsEditor fields={profileFields} onChange={(fields) => { setAssistedFields(fields); setUpdateAgreed(false); setUpdateErrors([]); }} coordinatorId={actor.id} errors={updateErrors} />
        <label className="check-field"><input ref={updateConsentRef} type="checkbox" checked={updateAgreed} onChange={(event) => setUpdateAgreed(event.target.checked)} /> The person reviewed and agreed to this exact profile update.</label>
        <Button disabled={!state.settings.online} onClick={submitProfileUpdate}>Send agreed profile update</Button>
        {!state.settings.online ? <p className="muted">A connection is required. This verified-profile update is not queued offline.</p> : null}
      </section>
      <section className="public-card"><h2>Request help from the council</h2><p>Ask permission before sending either request. A withdrawal request removes a public listing immediately. The council handles both requests online.</p>
        <label className="field-inline">Request type<select value={caseKind} onChange={(event) => { setCaseKind(event.target.value as typeof caseKind); setCaseAgreed(false); }}><option value="profile_correction">Profile correction</option><option value="withdrawal">Withdrawal</option></select></label>
        <label className="field-inline">Reason<textarea id="assisted-case-reason" rows={3} value={caseReason} onChange={(event) => { setCaseReason(event.target.value); setCaseAgreed(false); }} /></label>
        <label className="check-field"><input ref={caseConsentRef} type="checkbox" checked={caseAgreed} onChange={(event) => setCaseAgreed(event.target.checked)} /> The person agreed to send this exact request to the council.</label>
        <Button disabled={!state.settings.online || recordCases.some((item) => item.kind === caseKind && item.state === 'open')} variant={caseKind === 'withdrawal' ? 'danger' : 'secondary'} onClick={submitProfileCase}>{caseKind === 'withdrawal' ? 'Send withdrawal request' : 'Send correction request'}</Button>
        {!state.settings.online ? <p className="muted">A connection is required. Requests are not queued offline.</p> : null}
      </section>
    </> : null}
    {recordCases.length ? <section className="public-card"><h2>Requests on this record</h2><ol className="timeline-list">{recordCases.slice().reverse().map((item) => <li key={item.id}><strong>{item.kind.replaceAll('_', ' ')} · {item.state === 'open' ? 'Waiting for council' : 'Resolved'}</strong><p>{item.reason}</p>{item.resolution ? <p><strong>Council note:</strong> {item.resolution}</p> : null}</li>)}</ol></section> : null}

    <section className="public-card"><h2>Follow-up</h2><form onSubmit={handleNote}><label className="field-inline" htmlFor="followup-note">Record a follow-up note<textarea id="followup-note" value={note} onChange={(event) => setNote(event.target.value)} required maxLength={500} /></label><p className="muted">Keep this to a brief, relevant note. Do not add personal contact details.</p><Button type="submit">Save follow-up note</Button></form></section>

    <section className="public-card"><h2>Referral timeline</h2>{referrals.length ? <div className="referral-list">{referrals.map((referral) => { const opportunity = state.data.opportunities.find((item) => item.id === referral.opportunityId); const relay = relayForms[referral.id] ?? { agreed: false, response: 'accept' as const, reason: '' }; return <article key={referral.id}><h3>{opportunity?.title ?? 'Opportunity'}</h3><StatusBadge label={REFERRAL_LABEL[referral.state].label} tone={REFERRAL_LABEL[referral.state].tone} /><p>{referral.origin === 'invitation' ? 'Invitation' : 'Interest'} · updated {referral.updatedAt.slice(0, 10)}</p>{referral.instructions ? <p>Instructions: {referral.instructions}</p> : null}{referral.state === 'offered' ? <form className="relay-form" onSubmit={(event) => { event.preventDefault(); if (!relay.agreed) { setFeedback('Confirm the person agreed before relaying their response.'); return; } const result = run((data, ctx) => respondToOffer(data, ctx, { referralId: referral.id, response: relay.response, reason: relay.response === 'decline' ? relay.reason : undefined })); resultMessage(result, `The person’s ${relay.response === 'accept' ? 'acceptance' : 'decline'} was relayed and recorded with coordinator assistance.`); updateRelayForm(referral.id, { agreed: false }); }}><label className="field-inline">Response<select value={relay.response} onChange={(event) => updateRelayForm(referral.id, { response: event.target.value as 'accept' | 'decline' })}><option value="accept">Accept offer</option><option value="decline">Decline offer</option></select></label>{relay.response === 'decline' ? <label className="field-inline">Reason for declining<textarea value={relay.reason} onChange={(event) => updateRelayForm(referral.id, { reason: event.target.value })} required /></label> : null}<label className="check-field"><input type="checkbox" checked={relay.agreed} onChange={(event) => updateRelayForm(referral.id, { agreed: event.target.checked })} /> The person told me they agree with this response.</label><Button type="submit">Relay response</Button></form> : null}</article>; })}</div> : <p>No referrals for this record.</p>}</section>

    <section className="public-card"><h2>Application and referral timeline</h2>{events.length ? <ol className="timeline-list">{events.map((event) => <li key={event.id}><strong>{event.action === 'followup_note_recorded' ? 'Follow-up note recorded' : event.action === 'received' ? 'Received by the council' : event.action === 'changes_requested' ? 'Changes requested' : event.action === 'offer_response_relayed' ? 'Offer response relayed' : event.action.replaceAll('_', ' ')}</strong><time>{event.at.slice(0, 10)}</time>{event.reason ? <p>{event.reason}</p> : null}{event.via ? <p>With coordinator assistance ({event.via}).</p> : null}</li>)}</ol> : <p>No timeline events are available.</p>}</section>
    <Simulated>coordinator actions are recorded as assistance in the simulated record timeline. No approval, decline, or role-grant actions are available here.</Simulated>
  </div>;
}
