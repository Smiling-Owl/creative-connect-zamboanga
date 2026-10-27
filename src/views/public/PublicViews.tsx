import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Button, Notice, Simulated, StatusBadge } from '../../components/ui';
import { PublicProfileCard } from '../../components/PublicProfileCard';
import { GUIDANCE, GUIDANCE_DISCLAIMER } from '../../fixtures/guidance';
import { PERSONAS } from '../../fixtures/personas';
import { OPPORTUNITY_LABEL, REFERRAL_LABEL } from '../../labels';
import { publicDirectory, publicProfileById, searchDirectory } from '../../domain/publicProfile';
import { opportunityCapacity } from '../../domain/selectors';
import { expressInterest } from '../../domain/referral';
import { claimRecord } from '../../domain/account';
import { saveDraft } from '../../domain/drafts';
import { CREATIVE_DOMAINS } from '../../domain/taxonomy';
import { demoTime, useDemo } from '../../state/store';

const HELP_ROUTE = 'Coordinator contact route (placeholder — fictional demo sites only; confirm locally with the council).';

export function PublicView({ id }: { id: string }) {
  switch (id) {
    case 'P01': return <Welcome />;
    case 'P02': return <Directory />;
    case 'P03': return <PublicProfileView />;
    case 'P04': return <Opportunities />;
    case 'P05': return <OpportunityPage />;
    case 'P06': return <Guidance />;
    case 'A01': return <Access />;
    case 'A02': return <Recovery />;
    default: return null;
  }
}

function Welcome() {
  return <div className="public-stack">
    <section className="welcome-panel">
      <p className="eyebrow">A proposed service concept · fictional demo</p>
      <h2>Make your creative practice easier for the council to find.</h2>
      <p>Creative Connect helps adult creatives record their practice and hear about council support. You can register on your own or sit with a coordinator at a fictional barangay or school site.</p>
      <div className="action-row"><Link className="btn btn-primary" to="/access?mode=signup">Start registration</Link><Link className="btn btn-secondary" to="/access?mode=help">Get help registering</Link></div>
    </section>
    <section className="public-grid" aria-label="Explore the service">
      <article className="public-card"><h3>Find creatives</h3><p>Browse members who chose to be publicly listed.</p><Link to="/directory">Open the directory</Link></article>
      <article className="public-card"><h3>Find support</h3><p>See fictional clinics, workshops, and other opportunities.</p><Link to="/opportunities">Browse opportunities</Link></article>
      <article className="public-card"><h3>Understand your options</h3><p>Read example information about registration, work records, and support.</p><Link to="/guidance">Read support guidance</Link></article>
    </section>
    <section className="public-card"><h2>What registration does and does not do</h2><ul><li>It gives the council a record of your creative practice and a way to consider you for support.</li><li>It is not a business permit or certification.</li><li>Verification confirms council membership checks; it is not a rating of your work.</li><li>Registration does not guarantee work, a referral, or a place in an activity.</li><li>You can receive support without appearing in the public directory.</li></ul></section>
    <section className="public-card"><h2>Need someone beside you?</h2><p>Fictional demo sites show how in-person help may work. Ask the council to confirm a real coordinator route before visiting.</p><p>{HELP_ROUTE}</p></section>
  </div>;
}

function Directory() {
  const { state } = useDemo();
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [practice, setPractice] = useState('');
  const [skill, setSkill] = useState('');
  const [area, setArea] = useState('');
  const all = publicDirectory(state.data);
  const practices = [...new Set(all.map((p) => p.practice))].sort();
  const skills = [...new Set(all.flatMap((p) => p.skills))].sort();
  const areas = [...new Set(all.map((p) => p.area))].sort();
  const filtered = searchDirectory(state.data, { query, domain, practice, skill, area });
  return <div className="public-stack">
    <section className="public-card"><h2>Search listed creatives</h2><div className="filter-grid">
      <label className="field-inline">Search by name, domain, practice, skill, or general location<input value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label className="field-inline">Creative domain<select value={domain} onChange={(e) => setDomain(e.target.value)}><option value="">All creative domains</option>{CREATIVE_DOMAINS.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field-inline">Specific practice<select value={practice} onChange={(e) => setPractice(e.target.value)}><option value="">All specific practices</option>{practices.map((p) => <option key={p}>{p}</option>)}</select></label>
      <label className="field-inline">Skill<select value={skill} onChange={(e) => setSkill(e.target.value)}><option value="">All skills</option>{skills.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field-inline">General location<select value={area} onChange={(e) => setArea(e.target.value)}><option value="">All locations</option>{areas.map((a) => <option key={a}>{a}</option>)}</select></label>
      <Button variant="secondary" onClick={() => { setQuery(''); setDomain(''); setPractice(''); setSkill(''); setArea(''); }}>Clear filters</Button>
    </div><p role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'creative' : 'creatives'} listed</p></section>
    {filtered.length ? <ul className="card-list">{filtered.map((person) => <li className="public-card" key={person.id}><h2><Link to={`/directory/${person.id}`}>{person.displayName}</Link></h2><p>{person.domain} · {person.practice} · {person.area}</p><p>{person.skills.join(' · ')}</p></li>)}</ul> : <section className="public-card"><h2>No listed creatives match</h2><p>Try a broader search or clear your filters.</p></section>}
  </div>;
}

function PublicProfileView() {
  const { profileId = '' } = useParams();
  const { state } = useDemo();
  const profile = publicProfileById(state.data, profileId);
  if (!profile) return <section className="public-card"><h2>This profile is not publicly listed</h2><p>It may be private or no longer available.</p><Link to="/directory">Return to the directory</Link></section>;
  return <PublicProfileCard profile={profile} eyebrow="Public profile · fictional"><section className="notice notice-info"><h3>Ask the council about this creative</h3><p>{'Council contact route (placeholder — not yet approved). No inquiry is sent from this prototype.'}</p></section></PublicProfileCard>;
}

function Opportunities() {
  const { state } = useDemo();
  const [includeClosed, setIncludeClosed] = useState(false);
  const [type, setType] = useState('');
  const [availability, setAvailability] = useState('');
  const items = state.data.opportunities.filter((o) => {
    if (o.state !== 'published' && !(includeClosed && ['closed', 'cancelled'].includes(o.state))) return false;
    const remaining = opportunityCapacity(state.data, o.id)?.remaining ?? 0;
    return (!type || o.type === type) && (!availability || (availability === 'available' ? o.state === 'published' && remaining > 0 : o.state === 'published' && remaining === 0));
  });
  return <div className="public-stack"><section className="public-card"><div className="filter-grid"><label className="field-inline">Opportunity type<select value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option><option value="clinic">Clinic</option><option value="workshop">Workshop</option><option value="support">Support</option><option value="other">Other</option></select></label><label className="field-inline">Availability<select value={availability} onChange={(e) => setAvailability(e.target.value)}><option value="">All availability</option><option value="available">Places available</option><option value="full">Full</option></select></label></div><label className="choice-row"><input type="checkbox" checked={includeClosed} onChange={(e) => setIncludeClosed(e.target.checked)} /> Show closed and cancelled opportunities</label></section>
    {items.length ? <ul className="card-list">{items.map((item) => <OpportunityCard key={item.id} opportunity={item} />)}</ul> : <section className="public-card"><h2>No opportunities are currently listed</h2><p>Check again later or ask the council about support.</p></section>}</div>;
}

function OpportunityCard({ opportunity }: { opportunity: ReturnType<typeof useDemo>['state']['data']['opportunities'][number] }) {
  const { state } = useDemo();
  const capacity = opportunityCapacity(state.data, opportunity.id);
  const passed = opportunity.state === 'published' && demoTime(state.clock).slice(0, 10) > opportunity.deadline;
  const status = passed ? { label: 'Deadline passed', tone: 'neutral' as const } : OPPORTUNITY_LABEL[opportunity.state];
  const availability = opportunityAvailability(opportunity, capacity?.remaining ?? 0, demoTime(state.clock));
  return <li className="public-card"><p><StatusBadge label={status.label} tone={status.tone} /> · {opportunity.type}</p><h2><Link to={`/opportunities/${opportunity.id}`}>{opportunity.title}</Link></h2><p>{opportunity.eligibility}</p><p>{availability} · Deadline {opportunity.deadline}</p></li>;
}

function opportunityAvailability(
  opportunity: ReturnType<typeof useDemo>['state']['data']['opportunities'][number],
  remaining: number,
  at: string,
): string {
  if (opportunity.state === 'closed' || opportunity.state === 'cancelled') return `No new interest — ${opportunity.state}`;
  if (at.slice(0, 10) > opportunity.deadline) return `No new interest — deadline passed ${opportunity.deadline}`;
  return remaining ? `${remaining} places showing as available` : 'Full';
}

/** Shared public opportunity facts. Other role views can provide their own action area around this component. */
export function OpportunityDetail({
  opportunity,
  remaining,
  at,
}: {
  opportunity: ReturnType<typeof useDemo>['state']['data']['opportunities'][number];
  remaining: number;
  at: string;
}) {
  return <><p>{opportunity.description}</p><dl className="detail-list"><dt>Provider</dt><dd>{opportunity.provider}</dd><dt>Who can take part</dt><dd>{opportunity.eligibility}</dd><dt>Cost</dt><dd>{opportunity.costLabel}</dd><dt>Availability</dt><dd>{opportunityAvailability(opportunity, remaining, at)}</dd><dt>Date</dt><dd>{opportunity.dateLabel}</dd><dt>Deadline</dt><dd>{opportunity.deadline}</dd><dt>Location or format</dt><dd>{opportunity.locationMode}</dd><dt>Next step</dt><dd>{opportunity.nextStep}</dd></dl></>;
}

function OpportunityPage() {
  const { opportunityId = '' } = useParams();
  const { state, actor, run } = useDemo();
  const opportunity = state.data.opportunities.find((o) => o.id === opportunityId && o.state !== 'draft');
  const cap = opportunity ? opportunityCapacity(state.data, opportunity.id) : null;
  const ownRecord = state.data.records.find((r) => r.personId === actor.id);
  const referral = ownRecord && opportunity ? state.data.referrals.find((r) => r.recordId === ownRecord.id && r.opportunityId === opportunity.id) : null;
  const [message, setMessage] = useState('');
  if (!opportunity) return <section className="public-card"><h2>This opportunity is unavailable</h2><Link to="/opportunities">Browse opportunities</Link></section>;
  const deadlinePassed = demoTime(state.clock).slice(0, 10) > opportunity.deadline;
  const open = opportunity.state === 'published' && !deadlinePassed && (cap?.remaining ?? 0) > 0;
  const statusLabel = opportunity.state === 'published' && deadlinePassed ? { label: 'Deadline passed', tone: 'neutral' as const } : OPPORTUNITY_LABEL[opportunity.state];
  return <article className="public-card"><Link to="/opportunities">← All opportunities</Link><p><StatusBadge label={statusLabel.label} tone={statusLabel.tone} /></p><h2>{opportunity.title}</h2><OpportunityDetail opportunity={opportunity} remaining={cap?.remaining ?? 0} at={demoTime(state.clock)} />
    {referral ? <Notice tone="info"><StatusBadge label={REFERRAL_LABEL[referral.state].label} tone={REFERRAL_LABEL[referral.state].tone} /></Notice> : !open ? <Notice tone="warning">This opportunity is {deadlinePassed && opportunity.state === 'published' ? `past its ${opportunity.deadline} deadline` : opportunity.state === 'published' ? 'full' : opportunity.state}. It cannot accept new interest right now.</Notice> : actor.role === 'guest' ? <div className="action-row"><Link className="btn btn-primary" to={`/access?mode=signup&returnTo=${encodeURIComponent(`/opportunities/${opportunity.id}`)}`}>Register to take part</Link><Link className="btn btn-secondary" to={`/access?mode=help&returnTo=${encodeURIComponent(`/opportunities/${opportunity.id}`)}`}>Get help registering</Link></div> : actor.role === 'creative' && ownRecord?.application.state === 'verified' ? <Button onClick={() => { const result = run((d, ctx) => expressInterest(d, ctx, { recordId: ownRecord.id, opportunityId: opportunity.id })); setMessage(result.ok ? 'Your interest is recorded in this demo and is waiting for council review.' : result.message); }}>Express interest</Button> : actor.role === 'creative' && ownRecord ? <Notice tone="neutral">Your application is still in progress. <Link to="/me">View your application status</Link> to see what happens next.</Notice> : actor.role === 'creative' ? <Notice tone="neutral">You can start registration before expressing interest. <Link to="/apply">Start registration</Link>.</Notice> : <Notice tone="neutral">Ask a coordinator for help with registration.</Notice>}
    {actor.role === 'creative' && !ownRecord ? <p><Link to="/apply">Continue your registration</Link></p> : null}{message ? <p role="status">{message}</p> : null}<p>{'Council contact route: placeholder — no message is sent.'}</p></article>;
}

function Guidance() {
  return <div className="public-stack"><section className="notice notice-warning"><h2>Example guidance only</h2><p>{GUIDANCE_DISCLAIMER}</p></section><div className="public-grid">{GUIDANCE.map((card) => <article className="public-card" key={card.id}><p className="eyebrow">{card.topic === 'ip' ? 'Work and rights' : card.topic === 'formalization' ? 'Registration' : 'Support'}</p><h2>{card.title}</h2><p>{card.summary}</p><p className="muted">{card.sourceLabel}<br />Last reviewed {card.lastReviewed}</p></article>)}</div><p><Link to="/access?mode=help">Ask for registration help</Link></p></div>;
}

function Access() {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const { state, setPersona, setAccess, run, actor } = useDemo();
  const params = new URLSearchParams(search);
  const mode = params.get('mode') ?? 'signin';
  const returnTo = params.get('returnTo') ?? '';
  const hasReturnTo = params.has('returnTo');
  const returnOpportunityId = state.data.opportunities.find((opportunity) => returnTo === `/opportunities/${opportunity.id}`)?.id ?? null;
  const returnToHref = returnOpportunityId ? `/opportunities/${returnOpportunityId}` : null;
  useEffect(() => {
    if (hasReturnTo) setAccess({ returnOpportunityId, returnOpportunityOwnerId: actor.role === 'creative' ? actor.id : null });
  }, [actor.id, actor.role, hasReturnTo, returnOpportunityId, setAccess]);
  const [contact, setContact] = useState(state.access.signupContact);
  const [code, setCode] = useState('INV-DEMO-DANI');
  const [verificationCode, setVerificationCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [staff, setStaff] = useState('coord-a');
  const goMode = (next: string) => navigate(`${pathname}?mode=${next}${returnToHref ? `&returnTo=${encodeURIComponent(returnToHref)}` : ''}`);
  const creatives = PERSONAS.filter((p) => p.actor.role === 'creative');
  const staffers = PERSONAS.filter((p) => p.actor.role === 'coordinator' || p.actor.role === 'council');
  const claim = () => {
    const target = PERSONAS.find((p) => p.id === 'jun')!;
    setPersona(target.id);
    const result = run((data, ctx) => claimRecord(data, ctx, { code }));
    setFeedback(result.ok ? `This demo links the existing record ${result.id}. No new record was created.` : result.message);
    if (result.ok) navigate('/me');
  };
  const signup = () => { setAccess({ signupContact: contact, signupStatus: 'verification_pending' }); goMode('verify'); };
  const complete = () => {
    const target = PERSONAS.find((p) => p.id === 'jun')!;
    setPersona(target.id);
    const draft = state.data.drafts.find((item) => item.ownerId === 'person-jun' && item.recordId === null);
    if (draft) {
      const result = run((data, ctx) => saveDraft(data, ctx, {
        draftId: draft.id,
        recordId: null,
        source: draft.source,
        fields: { ...draft.fields, followUp: { kind: 'own_channel', channelLabel: contact } },
      }));
      if (!result.ok) setFeedback(result.message);
    }
    const opportunityId = returnOpportunityId ?? (!hasReturnTo && state.access.returnOpportunityOwnerId === target.actor.id ? state.access.returnOpportunityId : null);
    setAccess({ signupContact: contact, signupStatus: 'verified', returnOpportunityId: opportunityId, returnOpportunityOwnerId: opportunityId ? target.actor.id : null });
    navigate(opportunityId ? `/apply?returnTo=${encodeURIComponent(opportunityId)}` : '/apply');
  };
  return <div className="public-stack"><Simulated>no credentials are processed or sent. Values stay in this browser demo.</Simulated>
    {mode === 'help' ? <section className="public-card"><h2>Get help registering</h2><p>{HELP_ROUTE}</p><p>These sites are fictional. Ask the council to confirm a real help route.</p>{returnToHref ? <p><Link to={returnToHref}>Return to the opportunity you came from</Link></p> : null}<Link to="/access">Back to account access</Link></section> : null}
    {mode === 'signin' ? <section className="public-card"><h2>Choose a demo account</h2><p>Signing in is represented by choosing a fictional persona. No password is requested.</p><div className="card-list">{creatives.map((p) => <Button key={p.id} variant="secondary" onClick={() => { setPersona(p.id); navigate('/me'); }}>{p.label}</Button>)}</div><div className="action-row"><Button variant="quiet" onClick={() => goMode('signup')}>Create a creative account</Button><Button variant="quiet" onClick={() => goMode('claim')}>Claim an invited record</Button><Button variant="quiet" onClick={() => goMode('staff')}>Accept a staff invitation</Button><Link to="/access/recover">Recover access</Link></div></section> : null}
    {mode === 'signup' ? <section className="public-card"><h2>Create a creative account</h2><p>This fictional contact is prefilled for the demo. No real address is needed.</p><label className="field-inline">Demo contact<input type="email" value={contact} onChange={(e) => { setContact(e.target.value); setAccess({ signupContact: e.target.value }); }} autoComplete="off" /></label><Button onClick={signup}>Continue to simulated verification</Button><p>Already have a record? <button className="text-button" onClick={() => goMode('claim')}>Claim it with an invitation</button></p></section> : null}
    {mode === 'verify' ? <section className="public-card"><h2>Verify this demo contact</h2><Notice tone="info">A code would be sent to the fictional contact. Nothing is sent. Use the demo code 000000.</Notice><label className="field-inline">Simulated code<input inputMode="numeric" autoComplete="off" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} /></label><Button disabled={verificationCode !== '000000'} onClick={complete}>Complete demo verification and continue</Button></section> : null}
    {mode === 'claim' ? <section className="public-card"><h2>Claim an existing record</h2><p>This invitation links the record to your demo account. It never creates another record.</p><p>Demo invitation for Dani (fictional): INV-DEMO-DANI</p><label className="field-inline">Invitation code<input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" /></label><Button onClick={claim}>Link existing record</Button>{feedback ? <p role="status">{feedback} {feedback.includes('already linked') ? <Link to="/access/recover">Recover access</Link> : null}</p> : null}</section> : null}
    {mode === 'staff' ? <section className="public-card"><h2>Accept a staff invitation</h2><p>Choose the fictional role represented by this invitation.</p><label className="field-inline">Invitation role<select value={staff} onChange={(e) => setStaff(e.target.value)}>{staffers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label><Button onClick={() => { setPersona(staff); navigate(staff === 'council' ? '/council' : '/coordinator'); }}>Accept simulated invitation</Button></section> : null}
    {feedback && mode !== 'claim' ? <p role="status">{feedback}</p> : null}{actor.role === 'creative' && mode === 'signin' ? <p><Link to="/me">Open your creative home</Link></p> : null}
  </div>;
}

function Recovery() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const { state, setAccess } = useDemo();
  const recoveryState = params.get('state') === 'expired' || params.get('state') === 'help' ? params.get('state') : state.access.recovery;
  const [contact, setContact] = useState('jun@example.invalid');
  return <div className="public-stack"><Simulated>no credentials are processed or sent.</Simulated><section className="public-card"><h2>{recoveryState === 'expired' ? 'This recovery link has expired' : recoveryState === 'help' ? 'Ask for help with access' : 'Recover access'}</h2>
    {recoveryState === 'expired' ? <><p>The link is no longer active. You can request a new simulated link.</p><Button onClick={() => { setAccess({ recovery: 'idle' }); navigate('/access/recover', { replace: true }); }}>Request a new link</Button></> : recoveryState === 'help' ? <><p>{HELP_ROUTE}</p><p>A coordinator can help you check whether you already have a record. They cannot change your consent or review outcome.</p></> : <><p>Enter the fictional contact on your demo account. No code is sent.</p><label className="field-inline">Demo contact<input type="email" autoComplete="off" value={contact} onChange={(e) => setContact(e.target.value)} /></label><Button onClick={() => setAccess({ recovery: 'code_requested' })}>Show recovery instructions</Button>{recoveryState === 'code_requested' ? <Notice tone="success">A code would be sent to the verified route. Nothing is sent in this prototype.</Notice> : null}</>}
    <div className="action-row"><button className="text-button" onClick={() => { setAccess({ recovery: 'expired' }); navigate('/access/recover', { replace: true }); }}>Show expired-link state</button><button className="text-button" onClick={() => { setAccess({ recovery: 'help' }); navigate('/access/recover', { replace: true }); }}>I cannot access that contact</button><Link to="/access">Back to account access</Link></div></section></div>;
}
