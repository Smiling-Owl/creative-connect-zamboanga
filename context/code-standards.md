# Code Standards

Project-specific conventions for the Vite + React + TypeScript prototype. Paths below are **planned targets**; at handoff the repository contains only `AGENTS.md` and `context/`.

## Language / Framework Conventions

- TypeScript in `strict` mode for all source and tests; function components and hooks only; no class components.
- Use the platform and React before adding dependencies. Approved runtime dependencies: `react`, `react-dom`, `react-router` (hash mode). Anything else requires escalation.
- No global state library: one store via React context + `useReducer` (see architecture).
- Keep the smallest maintainable diff; no speculative abstractions, factories, plugin systems, mock API layers, or generic form engines.

## Project Structure

```
index.html
src/
  main.tsx                 # mounts app, imports styles
  App.tsx                  # router + shell
  domain/                  # pure rules (no React, no storage, no Date.now())
    types.ts               # entities, state unions, action payloads
    application.ts  queue.ts  visibility.ts  opportunity.ts  referral.ts  account.ts
    permissions.ts         # can(session, action, target)
    publicProfile.ts       # allow-listed public projection
    selectors.ts           # derived lists and counts
    references.ts          # deterministic reference generation
    *.test.ts              # colocated unit tests
  fixtures/baseline.ts     # fictional baseline data + demo clock origin
  state/
    store.tsx              # provider, reducer, dispatch helpers
    persistence.ts         # versioned localStorage load/save/reset
  components/              # shared UI (see ui-context.md)
  views/
    public/  access/  intake/  creative/  coordinator/  council/
  demo/DemoControls.tsx
  styles/tokens.css  base.css
tests/e2e/                 # Playwright journeys, a11y, viewport checks
README.md                  # run instructions, demo script, known limitations (feature 09)
```

One view per file named by screen (e.g., `views/council/ApplicationReview.tsx`) with its view ID in a top-of-file comment (`// M02 Application review`). Shared components never import from `views/`. Domain modules never import from `state/`, `components/`, or `views/`.

## Naming

- Files: `PascalCase.tsx` for components/views, `camelCase.ts` for modules.
- Domain states are lower snake case string literals exactly as in `architecture-context.md` (`changes_requested`, `did_not_attend`). User-facing labels come only from one label map matching the Status Vocabulary in `ui-context.md`; never inline status wording in views.
- Action names are imperative verbs: `submitApplication`, `retryQueueItem`, `requestChanges`, `offerReferral`, `confirmReferral`, `recordOutcome`.
- Fixture personas and places are visibly fictional (e.g., "Demo Site A — barangay hall").

## Types

- Discriminated unions for every state machine and for action payloads; exhaustive `switch` with a `never` check.
- IDs and references are `string`; timestamps are ISO strings from the demo clock.
- Domain functions return `Result = { ok: true; state; events } | { ok: false; code; message }`. `message` is user-facing plain language; `code` is stable for tests.
- No `any`; `unknown` plus narrowing at the persistence boundary.

## Validation

- Validate at two boundaries: form input (field-level messages, error summary) and persisted state on load (shape + `schemaVersion`; on failure fall back to baseline fixtures with a notice).
- Required intake fields are minimal: display name, practice, broad area, follow-up arrangement, at least one evidence item (any type), information-use acknowledgment. Never require a portfolio URL, business permit, or government ID.
- Reasons are required (non-empty, trimmed) for request changes, decline, not selected, cancel, uphold decline, and outcome correction resolution.

## Error Handling

- Domain functions never throw for expected rule violations; they return `{ ok: false }` and the view shows the message beside the control and moves focus to it.
- Messages say what happened and what to do next ("Capacity is full (3 of 3 confirmed). Close the offer or record an outcome before confirming another place.").
- Storage failures are caught and degrade to in-memory operation with a non-blocking notice.
- Unknown route → friendly not-found with links home; disallowed route for the role → access-not-available panel.

## API Conventions

No HTTP APIs. The "API" is the set of store actions; each action maps 1:1 to a domain function and is the only way views change state.

## Database / Data Access

- All reads through `domain/selectors.ts` (and `publicProfile.ts` for public data). Views never filter raw state for business meaning (e.g., "what is listed", "what the council can see").
- Counts are derived, never stored.
- Time comes from the demo clock passed into domain functions; never call `Date.now()` inside `domain/`.
- Bump `schemaVersion` whenever the persisted state shape changes.

## Security

- No secrets, tokens, `.env` values, analytics, or external requests. No real names of private individuals, contact details, partner sites, providers, or council branding in code, fixtures, tests, or docs.
- No `dangerouslySetInnerHTML`, `eval`, or navigation to user-entered URLs.
- Permission checks run in domain functions **and** inform UI visibility; copy never claims they are real security.
- Simulated access screens must not collect real passwords; prefer persona buttons and prefilled fictional values.

## Testing

- Test-first for domain rules: write the failing test for a transition/invariant, see it fail for the right reason, implement, rerun.
- Every domain module has colocated Vitest tests covering allowed transitions, rejected transitions (with `code`), idempotency, and audit events.
- Required regression tests: public projection never exposes private fields; council selectors exclude unreceived items; duplicate blocks approval; one referral per pair; capacity cannot be exceeded; cancellation cascades; counts agree across role selectors.
- Playwright journeys start from Reset and use stable accessible locators (role + name), not CSS classes. Deterministic references and demo clock make assertions stable.
- Test fixtures are fictional and may reuse the baseline; do not add test-only behavior to production code paths except an explicit "skip simulated delay" flag.

## Logging

No telemetry or remote logging. `console` output is limited to development warnings (e.g., persistence fallback). The audit log in state is the product-facing history.

## Performance

- Keep the production bundle small (target < 200 KB gzipped JS, PROPOSED); no images or fonts beyond inline SVG icons.
- Code-split by role area only if the bundle target is exceeded.

## Accessibility

Follow `ui-context.md` → Accessibility. Every new view must pass the axe scan with no serious/critical violations and be operable by keyboard before it is reported complete.

## Verification Commands

**No commands exist yet** — there is no `package.json` at handoff. Feature 01 must add and verify the following npm scripts, then replace this section with the verified list:

| Planned script | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Type-check and produce static `dist/` |
| `npm run preview` | Serve `dist/` locally (demo fallback) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests (single run) |
| `npm run test:e2e` | Playwright journeys, a11y, and viewport checks |

Until Feature 01 records them as verified, do not cite these commands as passing.
