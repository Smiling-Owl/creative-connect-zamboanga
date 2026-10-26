# Feature 01 — Foundation and Demo Shell

## Goal

Create the runnable project skeleton every other feature builds on: tooling, verified scripts, design tokens, app shell with role-aware navigation, route skeleton for all 20 views, demo controls, and the store/persistence/reset mechanism.

## Context

Approved stack: Vite + React + TypeScript static SPA; in-memory store mirrored to `localStorage` with Reset (`architecture-context.md`). Navigation, tokens, and screen map: `ui-context.md`. Structure and scripts: `code-standards.md`. Day 1–2 of the schedule.

## Requirements

1. Scaffold Vite + React + TypeScript (strict) with pinned dependency versions (`package-lock.json`), `.gitignore` (node_modules, dist, test output), Vite `base: './'`.
2. Add and verify the scripts listed in `code-standards.md` → Verification Commands: `dev`, `build`, `preview`, `typecheck`, `lint`, `test` (Vitest), `test:e2e` (Playwright, Chromium, with `@axe-core/playwright`). Replace that section with the verified commands.
3. `src/styles/tokens.css` and `base.css` implementing the tokens, typography, focus ring, and spacing from `ui-context.md`.
4. App shell: header with text wordmark and "Prototype · fictional data" marker, role-specific navigation (menu button below ~640 px), skip link, main landmark, polite live region, route-change focus to `h1` and document title update.
5. Hash router with every route in the architecture route map; each route renders a placeholder page with its view ID and title, so later features fill them in. Unknown route → not-found page. Role-disallowed route → access-not-available panel (uses the permission policy once Feature 02 lands; until then a minimal role→area map).
6. Store provider (`state/store.tsx`): context + reducer, session (role + persona), demo settings (connectivity online/offline, fail-next-send), demo clock, and a dispatch path that Feature 02 domain functions plug into.
7. Persistence (`state/persistence.ts`): versioned key, try/catch everywhere, fallback to baseline with a notice on missing/invalid/mismatched data, save on change.
8. Demo controls bar (`demo/DemoControls.tsx`) outside product chrome: persona switch (Guest, Mika, Jun, Coordinator, Council admin, plus the second-site coordinator), connectivity toggle, "Next send fails" toggle, Reset with confirmation. Collapsible; keyboard operable; never covers content at 320 px.
9. Shared base components needed by the shell: button, link-button, inline notice (info/warning/error/simulation), status badge (label map stub), confirmation dialog with focus trap/restore, access-not-available panel, empty state.
10. A smoke Playwright test that loads the app, switches persona, toggles connectivity, resets, and checks no horizontal overflow at 320 px; and an axe scan of the shell.

## Non-Goals

Domain rules, fixtures content, and real view contents (Features 02–08). No UI framework, CSS-in-JS, icon font, web font, service worker, or backend.

## Architecture / Design Constraints

- Follow the planned structure in `code-standards.md`; record any path deviation there.
- The persona switch changes session only; it is visibly a demo control, not a product login.
- No network requests besides the app's own static assets.

## Dependencies

None. Feature 02 can start once the project builds and `npm test` runs.

## Edge Cases

- `localStorage` unavailable or throwing (private window) → app works in memory, shows a non-blocking notice.
- Persisted data from an older `schemaVersion` → baseline + notice, no crash.
- Reset while on a role-specific record page → lands on a valid page for the current persona.
- Persona switch to a role without access to the current route → access-not-available panel, not a crash or blank page.

## Testing / Verification

Run every script once and record results in the progress report; Playwright smoke + axe on shell; manual keyboard pass over header, nav menu, and demo controls at 320 px and 1280 px.

## Acceptance Criteria

- [ ] `npm run build`, `typecheck`, `lint`, `test`, and `test:e2e` all succeed on a clean checkout after `npm ci`; `code-standards.md` lists them as verified.
- [ ] All 20 view routes from the architecture route map resolve and show their view ID and `h1`.
- [ ] Switching persona changes the navigation to that role's destinations (`ui-context.md` → Navigation).
- [ ] Toggling Offline and "Next send fails" is reflected in the demo bar and in store state.
- [ ] Reloading the page preserves persona and settings; Reset (after confirmation) restores defaults and clears the persisted copy.
- [ ] Corrupting the stored JSON manually results in the baseline state plus a visible notice, not an error screen.
- [ ] At 320 px there is no horizontal scroll and the demo bar collapses to one button.
- [ ] Axe reports no serious/critical violations on the shell; all controls reachable and operable by keyboard with visible focus.
- [ ] Network log during the smoke test shows no external requests.

## Open Questions

None blocking. Hosting is decided later (Feature 09).
