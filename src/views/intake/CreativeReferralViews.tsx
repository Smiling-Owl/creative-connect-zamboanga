import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { OpportunityDetail } from '../public/PublicViews';
import { NotificationList } from '../../components/NotificationList';
import { AccessDenied, Button, Notice, StatusBadge } from '../../components/ui';
import { openCase } from '../../domain/cases';
import { respondToOffer, withdrawReferral } from '../../domain/referral';
import { creativeView, noticesFor, opportunityCapacity } from '../../domain/selectors';
import { OPPORTUNITY_LABEL, REFERRAL_LABEL } from '../../labels';
import { demoTime, useDemo } from '../../state/store';

export function CreativeReferralView() {
  const { referralId = '' } = useParams();
  const { actor } = useDemo();
  const recordId = useDemo().state.data.records.find((item) => item.personId === actor.id)?.id ?? 'none';
  return <CreativeReferrals key={`${actor.id}:${recordId}:${referralId}`} referralId={referralId} />;
}

function CreativeReferrals({ referralId }: { referralId: string }) {
  const { state, actor, run } = useDemo();
  const view = creativeView(state.data, actor.id);
  const record = view.record;
  const referrals = view.referrals;
  const [reason, setReason] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [message, setMessage] = useState('');
  const [acceptanceConfirmed, setAcceptanceConfirmed] = useState(false);
  if (!record) return <section className="public-card"><h2>No linked record yet</h2><p>Your opportunities and referrals will appear here after your record is linked to this demo account.</p><Link to="/me">Open your home</Link></section>;
  const notices = noticesFor(state.data, actor);
  if (!referralId) return <div className="public-stack">
    <section className="public-card"><h2>My opportunities and referrals</h2><p>Interest, an offer, acceptance, and confirmation are separate steps. A referral does not guarantee a place or paid work.</p></section>
    {notices.length ? <NotificationList notices={notices} title="Recent updates" /> : null}
    {referrals.length ? <ul className="card-list">{referrals.map((referral) => {
      const opportunity = state.data.opportunities.find((item) => item.id === referral.opportunityId);
      return <li className="public-card" key={referral.id}><p>{referral.origin === 'interest' ? 'Your interest' : 'Council invitation'} · {opportunity?.title ?? 'Opportunity'}</p><StatusBadge label={REFERRAL_LABEL[referral.state].label} tone={REFERRAL_LABEL[referral.state].tone} /><p>{referral.reason ?? (referral.state === 'accepted' ? 'Waiting for the council to confirm availability and arrangements.' : '')}</p><Link to={`/me/referrals/${referral.id}`}>Open referral details</Link></li>;
    })}</ul> : <section className="public-card"><h2>No referrals yet</h2><p>When you express interest or receive a council invitation, the details will appear here.</p><Link to="/opportunities">Browse opportunities</Link></section>}
  </div>;

  const referral = referrals.find((item) => item.id === referralId);
  if (!referral) return <AccessDenied title="Referral detail" />;
  const opportunity = state.data.opportunities.find((item) => item.id === referral.opportunityId);
  if (!opportunity) return <AccessDenied title="Referral detail" />;
  const capacity = opportunityCapacity(state.data, opportunity.id);
  const cases = state.data.cases.filter((item) => item.recordId === record.id && item.referralId === referral.id && item.kind === 'outcome_correction');
  const hasOpenCorrection = cases.some((item) => item.state === 'open');
  const hasOutcome = (['completed', 'did_not_attend', 'awaiting_follow_up'] as string[]).includes(referral.state);
  const performResponse = (response: 'accept' | 'decline') => {
    const result = run((data, ctx) => respondToOffer(data, ctx, { referralId: referral.id, response, ...(response === 'decline' ? { reason } : {}) }));
    setMessage(result.ok ? (response === 'accept' ? 'You accepted this offer. The council still needs to confirm a place.' : 'You declined this offer. This does not affect your membership.') : result.message);
    if (result.ok) { setReason(''); setAcceptanceConfirmed(false); }
  };
  return <div className="public-stack">
    <p><Link to="/me/referrals">← My opportunities and referrals</Link></p>
    <section className="public-card"><p>{referral.origin === 'interest' ? 'Your interest' : 'Council invitation'}</p><h2>{opportunity.title}</h2><StatusBadge label={OPPORTUNITY_LABEL[opportunity.state].label} tone={OPPORTUNITY_LABEL[opportunity.state].tone} /><OpportunityDetail opportunity={opportunity} remaining={capacity?.remaining ?? 0} at={demoTime(state.clock)} /><p><StatusBadge label={REFERRAL_LABEL[referral.state].label} tone={REFERRAL_LABEL[referral.state].tone} /></p><p>{referral.state === 'offered' ? 'An offer is not a confirmed place. The council checks capacity and arrangements after your response.' : referral.state === 'accepted' ? 'You accepted. The council must confirm capacity and arrangements before your place is set.' : referral.state === 'confirmed' ? 'Your place is confirmed.' : referral.state === 'cancelled' ? 'This referral was cancelled. See the reason below.' : 'This is a support referral, not a promise of work.'}</p>
      {referral.state === 'offered' ? <div className="public-stack"><p>Origin: {referral.origin === 'interest' ? 'You expressed interest and the council made an offer.' : 'The council invited you to consider this opportunity.'}</p><label className="check-field"><input type="checkbox" checked={acceptanceConfirmed} onChange={(event) => setAcceptanceConfirmed(event.target.checked)} /> I have reviewed the offer details and want to respond.</label><label className="field-inline">Reason for declining (optional)<textarea value={reason} onChange={(event) => { setReason(event.target.value); setAcceptanceConfirmed(false); }} /></label><div className="action-row"><Button disabled={!acceptanceConfirmed} onClick={() => performResponse('accept')}>Accept offer</Button><Button variant="secondary" disabled={!acceptanceConfirmed} onClick={() => performResponse('decline')}>Decline offer</Button></div><p>Declining does not affect your membership. You may add a reason, but it is optional.</p></div> : null}
      {['accepted', 'confirmed'].includes(referral.state) ? <><label className="field-inline">Reason for withdrawing<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label><Button variant="secondary" disabled={!reason.trim()} onClick={() => { const result = run((data, ctx) => withdrawReferral(data, ctx, { referralId: referral.id, reason })); setMessage(result.ok ? 'Your withdrawal was recorded.' : result.message); }}>Withdraw from this opportunity</Button></> : null}
      {referral.instructions && referral.state === 'confirmed' ? <Notice tone="info" title="Practical instructions">{referral.instructions}</Notice> : null}
      {referral.reason ? <p>Reason: {referral.reason}</p> : null}
      {referral.state === 'cancelled' ? <p>Cancellation reason: {referral.reason ?? opportunity.cancelReason ?? 'See the council update.'}</p> : null}
      {hasOutcome ? <p>Recorded outcome: {REFERRAL_LABEL[referral.state].label}. This describes support received; it does not mean paid work or income.</p> : null}
    </section>
    {hasOutcome ? <section className="public-card"><h2>Question this recorded outcome</h2>{hasOpenCorrection ? <Notice tone="warning">Your request is waiting for the council.</Notice> : <><label className="field-inline">What needs correcting?<textarea value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} /></label><Button variant="secondary" disabled={!correctionReason.trim()} onClick={() => { const result = run((data, ctx) => openCase(data, ctx, { kind: 'outcome_correction', recordId: record.id, referralId: referral.id, reason: correctionReason })); setMessage(result.ok ? 'Outcome correction request sent to the council.' : result.message); if (result.ok) setCorrectionReason(''); }}>Request outcome correction</Button></>}</section> : null}
    {cases.length ? <section className="public-card"><h2>Outcome correction history</h2><ol className="timeline-list">{cases.map((item) => <li key={item.id}><strong>{item.state === 'open' ? 'Waiting for council' : 'Resolved'}</strong><p>Your request: {item.reason}</p>{item.resolution ? <p>Council decision: {item.resolution}</p> : null}</li>)}</ol></section> : null}
    <section className="public-card"><h2>Referral history</h2><ol className="timeline-list">{state.data.audit.filter((event) => event.entityId === referral.id).slice().reverse().map((event) => <li key={event.id}><strong>{event.action.replaceAll('_', ' ')}</strong><time>{event.at.slice(0, 10)}</time>{event.reason ? <p>{event.reason}</p> : null}{event.via ? <p>Recorded with coordinator assistance.</p> : null}</li>)}</ol></section>
    {message ? <p role="status" aria-live="polite">{message}</p> : null}
  </div>;
}
