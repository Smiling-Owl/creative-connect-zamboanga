# Code Standards

Project-specific conventions for the Vite + React + TypeScript prototype. The layout below is the implemented one; deviations from the original plan are noted inline.

## Language / Framework Conventions

- TypeScript in `strict` mode for all source and tests; function components and hooks only; no class components.
- Use the platform and React before adding dependencies. Approved runtime dependencies: `react`, `react-dom`, `react-router` (hash router). Anything else requires escalation.
- No global state library. One demo store in `src/state/store.tsx` (React context with `useState` and a ref, so `run` reads the latest state synchronously).
- Keep the smallest maintainable diff; no speculative abstractions, factories, plugin systems, mock API layers, or generic form engines.

## Project Structure

Implemented layout:

```
src/
  App.tsx, main.tsx        # router, shell layout, mount
  routes.ts                # view map (IDs, paths, role gates) and per-role navigation
  labels.ts                # the only place for user-facing status wording (ui-context vocabulary)
  domain/                  # pure rules: no React, no storage, no Date.now()
    types.ts               # entities, state unions, Result and Ctx
    taxonomy.ts            # nine statutory creative-domain names
    core.ts                # clone, deterministic ids, audit log, reasons, lookups
    policy.ts              # can(actor, action, target): frontend representation, not security
    application.ts         # intake validation, receipt, review, duplicates, profile updates
    drafts.ts              # saving drafts; source derived from the acting user
    queue.ts               # coordinator device queue: sync, simulated failure, conflicts
    visibility.ts          # listing rules and public-content fingerprint
    account.ts             # coordinator invitation and creative claim (no duplicate records)
    referral.ts            # interest, invitation, offers, responses, confirmation, outcomes
    opportunity.ts         # draft, publish, edit, close, cancel with cascade
    cases.ts               # human review, outcome correction, withdrawal requests
    publicProfile.ts       # allow-listed public projection and directory search
    coordinator.ts         # coordinator follow-up notes and consented relays for assigned records
    selectors.ts           # counts, council overview, capacity, persona views, next action, notices
    *.test.ts              # colocated unit tests
  fixtures/                # fictional baseline data, personas, guidance examples
  state/                   # store and versioned persistence (+ tests)
  components/ui.tsx        # shared primitives (button, badge, notice, dialog with focus trap)
  components/PublicProfileCard.tsx # allow-listed public profile and draft-preview rendering
  components/ProfileFieldsEditor.tsx # shared profile field editing (C02, council, coordinator)
  components/NotificationList.tsx    # one labelled in-app notification list for C01, C03, F01, M01
  views/public/           # public discovery and simulated access
  views/intake/           # shared intake/review, creative status (C01) and referrals (C03)
  views/coordinator/      # F01 workspace/device queue, F02 assisted record
  views/council/          # M01 queue + overview panel, M02 review, C02 profile, M03–M05 opportunities/referrals
  demo/DemoControls.tsx    # demo controls outside the product chrome
  styles/                  # tokens.css, base.css
  test/                    # Vitest setup and helpers
tests/e2e/                 # Playwright: shell, public-access, intake, coordinator, council-profile,
                           # opportunities, overview, journeys (main/alternate/exceptions),
                           # a11y-responsive (every route), support.ts helpers
```

Planned names that changed during implementation: `permissions.ts` became `policy.ts`, and `references.ts` became `core.ts`. All routes in `routes.ts` now have real views; the placeholder branch in `App.tsx` is unreachable for known routes. Each feature moves its view into `src/views/<area>/`. Domain modules never import from `state/`, `components/`, or `views/`.

Feature 03 update (2026-10-27): P01–P06 and A01–A02 are implemented in `src/views/public/PublicViews.tsx`; other feature views remain placeholders. `OpportunityDetail` is exported for reuse. `tests/e2e/public-access.spec.ts` covers public/access journeys, private-profile boundaries, bounded return context, recovery, accessibility, and narrow-screen rendering. Directory filtering now includes an exact skill option.

Feature 04 update (2026-10-27): R01/R02 and C01 live in `src/views/intake/IntakeViews.tsx`. `intakeValidationErrors` supplies field keys/messages; `validateIntake` retains the domain result contract. `projectPublicIntake` produces an unpublished preview using the same allow-list boundary and `PublicProfileCard` as P03. UI progress/receipt context is persisted separately from domain draft fields in schema version 3. `tests/e2e/intake.spec.ts` covers intake/status and alternate branches without adding production test backdoors or council-review screens.

Classification revision (2026-10-27): the required domain field extends intake, projection, public-content fingerprint, and directory filtering; specific practice is free text. Persisted shape is now schema version 4, using the existing mismatch/reset notice. Visible location labels use **General location**, retaining internal `area` and fictional values.

Features 05–07 update (2026-10-27): F01/F02 in `src/views/coordinator/CoordinatorViews.tsx`; M01/M02/C02 in `src/views/council/CouncilViews.tsx`; M03–M05 in `src/views/council/OpportunityViews.tsx`; C03 in `src/views/intake/CreativeReferralViews.tsx`. Browser coverage: `coordinator.spec.ts`, `council-profile.spec.ts`, `opportunities.spec.ts`.

Feature 08 update (2026-10-28): `CouncilOverviewPanel.tsx` renders `councilOverview`; `overviewText.ts` formats "x of y (window)" and renders empty bases as "—" with "no records yet" (never NaN/Infinity/0%). Known exception to "labels only in `labels.ts`": in-app notice sentences remain in `NOTICE_TEXT` in `domain/selectors.ts`, written in a neutral voice so every role's list reads correctly.

Feature 09 update (2026-10-28): no production changes. `journeys.spec.ts` and `a11y-responsive.spec.ts` share helpers in `tests/e2e/support.ts`. Two tests seed browser state through the saved `ccz-demo:v1` envelope (`page.evaluate` + reload) where the UI cannot reach the state directly; no production test hook exists.

## Naming

- Files: `PascalCase.tsx` for components and views, `camelCase.ts` for modules.
- Domain states are lower snake case string literals exactly as in `architecture-context.md` (`changes_requested`, `did_not_attend`). User-facing labels come only from `src/labels.ts`, matching the Status Vocabulary in `ui-context.md`. Never inline status wording in views.
- Domain action functions are imperative verbs: `submitIntake`, `enqueueSubmission`, `syncQueue`, `startReview`, `approveApplication`, `requestChanges`, `inviteCreative`, `offerReferral`, `confirmPlace`, `recordOutcome`.
- Fixture personas and places are visibly fictional, for example "Demo Site A — barangay hall (fictional)".

## Types

- Discriminated unions for every state machine. Switches over state unions are exhaustive by construction (TypeScript checks the return type); add a `never` check when a switch has no default and the union may grow.
- IDs and references are `string`. Timestamps are ISO strings from the demo clock.
- Domain functions return `Result`: `{ ok: true; data: DomainData; id?: string; failedItemId?: string } | { ok: false; code: string; message: string }`. `message` is user-facing plain language; `code` is stable for tests.
- No `any`. Use `unknown` plus narrowing at the persistence boundary.

## Validation

- Validate at two boundaries: form input (field-level messages and an error summary) and persisted state on load (shape and `schemaVersion`; on failure fall back to baseline fixtures with a notice).
- Required intake fields are minimal: display name, name for the council record, one valid creative domain, free-text specific creative practice, general location (`area` internally), at least one skill, at least one piece of evidence (link, sample, or description), follow-up arrangement, and the information-use acknowledgment. Never require a portfolio URL, business permit, or government ID.
- Reasons are required (non-empty, trimmed) for: request changes, decline, not selected, withdraw, cancel, resolve duplicate, human-review decisions, outcome correction, and update change requests.

## Error Handling

- Domain functions never throw for expected rule violations. They return `{ ok: false }`, and the view shows the message beside the control and moves focus to it.
- Messages say what happened and what to do next. They never show raw internal state names.
- Storage failures are caught and degrade to in-memory operation with a non-blocking notice.
- Unknown route: friendly not-found page with a link home. Disallowed route for the role: access-not-available panel.

## API Conventions

No HTTP APIs. The "API" is the set of domain functions reached through `DemoStore.run`. Each user action calls one domain function, and that is the only way views change state.

## Database / Data Access

- All reads go through `domain/selectors.ts` and `domain/publicProfile.ts`. Views never filter raw state for business meaning, such as "what is listed" or "what the council can see".
- Counts are derived, never stored.
- Time comes from the demo clock passed in through `Ctx`. Never call `Date.now()` inside `domain/`.
- Bump `schemaVersion` whenever the persisted state shape changes.

## Security

- No secrets, tokens, `.env` values, analytics, or external requests. No real names of private individuals, contact details, partner sites, providers, or council branding in code, fixtures, tests, or docs.
- No `dangerouslySetInnerHTML`, `eval`, or navigation to user-entered URLs.
- Permission checks run in domain functions **and** shape UI visibility. Copy never claims they are real security.
- Simulated access screens must not collect real passwords. Prefer persona buttons and prefilled fictional values.

## Testing

- Domain rules: write the failing test for a transition or invariant, see it fail for the right reason, implement, and rerun. **Feature 02 was written code-first and its tests added afterwards, which is a deviation.** From Feature 03 on, follow the rule above.
- Every domain module has colocated Vitest tests covering allowed transitions, rejected transitions (with `code`), idempotency, and audit events.
- Required regression tests (all present as of 2026-10-26): public projection never exposes private fields; council selectors exclude unreceived items; duplicate blocks approval; one referral per pair; capacity cannot be exceeded; cancellation cascades; counts agree across role views; one record per creative; drafts derive their source from the actor.
- Playwright journeys start from a reset and use stable accessible locators (role and name), not CSS classes. Deterministic references and the demo clock keep assertions stable.
- Test fixtures are fictional and may reuse the baseline. Do not add test-only behavior to production code paths except an explicit, documented flag.

## Logging

No telemetry or remote logging. `console` output is limited to development warnings. The audit log in state is the product-facing history.

## Performance

- Keep the production bundle small (target under 200 KB gzipped JS, PROPOSED). Current: about 134.0 KB (Features 01–09). No images or fonts beyond inline SVG icons.
- Code-split by role area only if the bundle target is exceeded.

## Accessibility

Follow `ui-context.md` → Accessibility. Every new view must pass the axe scan with no serious or critical violations and be operable by keyboard before it is reported complete.

## Verification Commands

Features 01–09 verified on 2026-10-28 (Windows development workstation) on branch `feature/mvp-completion`. Re-run before citing these results for later code changes. Features 08–09 were implemented by a Claude Haiku 5.5 worker and independently verified by a Claude Sonnet 5.5 reviewer (both reran every command); the orchestrator reran the full set afterwards.

| Command | What it checks | Last result |
|---|---|---|
| `npm ci` | Clean install from the lockfile | exit 0; 237 packages |
| `npm run typecheck` | `tsc --noEmit`, strict | exit 0 |
| `npm run lint` | ESLint with typescript-eslint and react-hooks rules | exit 0 |
| `npm test` | Vitest unit tests, single run | 180 passed (16 files) |
| `npm run build` | Typecheck, then static build to `dist/` | exit 0; 134.02 KB gzipped JS, 3.05 KB gzipped CSS |
| `npm run preview` | Serves `dist/` locally (demo fallback) | used by the e2e run; separately served on port 4195 with local relative assets only (development workstation, not the presenter laptop) |
| `npm run test:e2e` | Playwright (Chromium), which builds and serves `dist/` | 81 passed (9 files) with `PLAYWRIGHT_PORT`; two consecutive verifier runs also 81/81, no flakes. Includes main/alternate journeys, exception paths, axe on every route, overflow at 320/360/768/1280 px, keyboard-only runs, CSS-zoom 200% approximation, and an external-request guard |
| `git diff --check` | Whitespace errors | exit 0 |

Chromium needs a one-time install: `npx playwright install chromium` on each machine that runs the browser suite. Manual screen-reader testing, real browser 200% zoom, non-Chromium browsers, and the presenter-laptop run remain unverified.

Do not cite a command as passing unless its result is recorded here from a run in the current session.
