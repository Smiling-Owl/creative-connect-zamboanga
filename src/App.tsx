import { useEffect, useRef, useState } from 'react';
import { HashRouter, Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router';
import { DemoControls } from './demo/DemoControls';
import { AccessDenied, Button, PageHeader } from './components/ui';
import { ROLE_LABEL } from './labels';
import { NAV, VIEWS, canOpen, type ViewDef } from './routes';
import { DemoStoreProvider, useDemo } from './state/store';
import { PublicView } from './views/public/PublicViews';
import { IntakeView } from './views/intake/IntakeViews';
import { CoordinatorView } from './views/coordinator/CoordinatorViews';
import { CouncilView, CreativeProfileView } from './views/council/CouncilViews';
import { CouncilOpportunityView } from './views/council/OpportunityViews';
import { CreativeReferralView } from './views/intake/CreativeReferralViews';

const INTAKE_FOCUS_TARGETS: Record<string, string> = {
  name: 'intake-name',
  displayName: 'intake-display',
  domain: 'intake-domain',
  practice: 'intake-practice',
  area: 'intake-area',
  skills: 'intake-skills',
  evidence: 'intake-evidence',
  followUp: 'intake-followUp',
  acknowledged: 'intake-acknowledged',
};

export function App() {
  return (
    <DemoStoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            {VIEWS.map((view) => (
              <Route key={`${view.id}-${view.path}`} path={view.path} element={<ViewPage view={view} />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </HashRouter>
    </DemoStoreProvider>
  );
}

function Layout() {
  const { actor, persona, notice, dismissNotice } = useDemo();
  const location = useLocation();

  // Phone menu state (UI only). Any route or persona change closes it, including Back/Forward to a page where it was open.
  const menuKey = `${location.pathname}${location.search}|${persona.id}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuKeySeen, setMenuKeySeen] = useState(menuKey);
  if (menuKeySeen !== menuKey) {
    setMenuKeySeen(menuKey);
    setMenuOpen(false);
  }
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      // Only Escape pressed within the header closes the menu, so focus elsewhere on the page is never moved.
      if (event.key !== 'Escape' || !(event.target instanceof Node) || !header.current?.contains(event.target)) return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    const requestedFocus = new URLSearchParams(location.search).get('focus');
    const targetId = location.pathname === '/apply' ? INTAKE_FOCUS_TARGETS[requestedFocus ?? ''] : undefined;
    const target = targetId ? document.getElementById(targetId) : null;
    if (target instanceof HTMLElement) {
      target.focus();
      target.scrollIntoView({ block: 'nearest' });
      return;
    }
    document.querySelector<HTMLHeadingElement>('main h1')?.focus();
  }, [location.pathname, location.search]);

  const area = actor.role === 'guest' ? 'public' : actor.role;
  return (
    <div className="app-shell" data-area={area}>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <DemoControls />
      <header className="site-header" ref={header}>
        <div className="wordmark">
          <a href="#/">
            <svg className="sail-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
              <path className="sail-orange" d="M0 0H16V16Z" />
              <path className="sail-green" d="M32 0V16L16 0Z" />
              <path className="sail-yellow" d="M32 32H16V16Z" />
              <path className="sail-blue" d="M0 32V16L16 32Z" />
            </svg>
            Creative Connect Zamboanga
          </a>
          <span>Proposed service concept for the Zamboanga City Creative Council — not an official council site</span>
          <span className="prototype-marker">Prototype · fictional data</span>
        </div>
        <button
          type="button"
          className="menu-toggle"
          ref={menuButton}
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          Menu
        </button>
        <nav aria-label="Main" id="primary-nav" className={menuOpen ? 'is-open' : undefined}>
          <ul className="nav-list">
          {NAV[actor.role].map((item) => {
            const isCoordinatorDestination = actor.role === 'coordinator' && item.to.startsWith('/coordinator');
            const isCouncilQueueDestination = actor.role === 'council' && (item.to === '/council' || item.to.startsWith('/council?'));
            const followups = location.pathname === '/coordinator' && new URLSearchParams(location.search).get('tab') === 'followups';
            const councilTab = new URLSearchParams(location.search).get('tab');
            const active = isCoordinatorDestination
              ? item.to.includes('tab=followups') ? followups : location.pathname.startsWith('/coordinator') && !followups
              : isCouncilQueueDestination
                ? item.to.includes('tab=records') ? location.pathname === '/council' && councilTab === 'records' : location.pathname === '/council' && councilTab !== 'records'
                : false;
            return <li key={item.to}>
              {isCoordinatorDestination || isCouncilQueueDestination
                ? <Link to={item.to} className={active ? 'nav-link is-active' : 'nav-link'} aria-current={active ? 'page' : undefined}>{item.label}</Link>
                : <NavLink to={item.to} className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>{item.label}</NavLink>}
            </li>;
          })}
          </ul>
        </nav>
        <p className="persona">
          Viewing as <strong>{persona.label}</strong>, {ROLE_LABEL[actor.role].toLowerCase()}
        </p>
      </header>
      <div role="status" aria-live="polite" className="status-region">
        {notice ? (
          <div className="notice notice-warning">
            <span>{notice}</span>{' '}
            <Button variant="quiet" onClick={dismissNotice}>
              Dismiss
            </Button>
          </div>
        ) : null}
      </div>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        Prototype with fictional data. No real credentials, messages, or personal records are processed.
      </footer>
    </div>
  );
}

function ViewPage({ view }: { view: ViewDef }) {
  const { actor, state } = useDemo();
  useEffect(() => {
    document.title = `${view.title} — Creative Connect Zamboanga (prototype)`;
  }, [view.title]);

  if (!canOpen(view, actor.role)) {
    return (
      <>
        <PageHeader id={view.id} title={view.title} />
        <AccessDenied title={view.title} />
      </>
    );
  }
  if (view.id.startsWith('P') || view.id === 'A01' || view.id === 'A02') {
    return <><PageHeader id={view.id} title={view.title} /><PublicView id={view.id} /></>;
  }
  if (view.id === 'R01' || view.id === 'R02' || view.id === 'C01') {
    return <><PageHeader id={view.id} title={view.title} /><IntakeView id={view.id} /></>;
  }
  if (view.id === 'F01' || view.id === 'F02') {
    return <><PageHeader id={view.id} title={view.title} /><CoordinatorView id={view.id} /></>;
  }
  if (view.id === 'M01' || view.id === 'M02') {
    return <><PageHeader id={view.id} title={view.title} /><CouncilView id={view.id} /></>;
  }
  if (view.id === 'C02') {
    const recordId = state.data.records.find((record) => record.personId === actor.id)?.id ?? 'none';
    return <><PageHeader id={view.id} title={view.title} /><CreativeProfileView key={`${actor.id}:${recordId}`} /></>;
  }
  if (view.id === 'C03') return <><PageHeader id={view.id} title={view.title} /><CreativeReferralView /></>;
  if (view.id === 'M03' || view.id === 'M04' || view.id === 'M05') return <><PageHeader id={view.id} title={view.title} /><CouncilOpportunityView id={view.id} /></>;
  return (
    <>
      <PageHeader id={view.id} title={view.title} />
      <section className="placeholder" aria-label="Build status">
        <p>This screen is scheduled for a later build step. Its route and role check are in place.</p>
      </section>
    </>
  );
}

function NotFound() {
  return (
    <>
      <PageHeader id="—" title="Page not found" />
      <p>
        This address does not match a screen in the prototype. <a href="#/">Go to the welcome page</a>.
      </p>
    </>
  );
}
