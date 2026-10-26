import { useEffect } from 'react';
import { HashRouter, NavLink, Outlet, Route, Routes, useLocation } from 'react-router';
import { DemoControls } from './demo/DemoControls';
import { AccessDenied, Button, PageHeader } from './components/ui';
import { ROLE_LABEL } from './labels';
import { NAV, VIEWS, canOpen, type ViewDef } from './routes';
import { DemoStoreProvider, useDemo } from './state/store';

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

  useEffect(() => {
    document.querySelector<HTMLHeadingElement>('main h1')?.focus();
  }, [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <DemoControls />
      <header className="site-header">
        <div className="wordmark">
          <a href="#/">Creative Connect Zamboanga</a>
          <span>Proposed service concept for the Zamboanga City Creative Council — not an official council site</span>
          <span className="prototype-marker">Prototype · fictional data</span>
        </div>
        <nav aria-label="Main">
          <ul className="nav-list">
            {NAV[actor.role].map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>
                  {item.label}
                </NavLink>
              </li>
            ))}
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
    </>
  );
}

function ViewPage({ view }: { view: ViewDef }) {
  const { actor } = useDemo();
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
