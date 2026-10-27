# Creative Connect Zamboanga

A browser-only clickable prototype for a proposed community-assisted creative onboarding, directory, and opportunity-referral service. This is **not an official council website**. All people, sites, providers, contact routes, opportunities, and outcomes in the demo are fictional.

## Current iteration

The foundation and domain layer are present. Feature 03 adds public discovery, guidance, and simulated access:

- Program introduction and registration-assistance information.
- Searchable public directory and privacy-filtered creative profiles.
- Opportunity browsing, availability, details, and expressions of interest.
- Example guidance with neutral source labels.
- Simulated sign-in, sign-up/verification, invitation claiming, staff access, and recovery.

Intake, coordinator operations, council review, and the full referral-to-outcome screens are subsequent iterations. Their routes remain clearly labeled placeholders. Registration started from an opportunity retains that context for the later intake workflow; full post-submission return is not yet a completed user journey.

## Run locally

Use Node.js 22.12 or later and npm.

```sh
npm ci
npm run dev
```

For the static production build and local demonstration:

```sh
npm run build
npm run preview
```

Open the local URL printed by Vite. Routes use hashes so a static host does not need history fallback configuration. Publishing/hosting is separate from creating this source repository.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite builds and starts its own preview server on port 4173. Keep that port free before running it. It includes journey, privacy, accessibility, and narrow-screen checks; passing those checks is not a claim of complete accessibility certification.

If the default port is occupied, choose another without stopping an unrelated server. In PowerShell:

```powershell
$env:PLAYWRIGHT_PORT = '4187'
npm run test:e2e
```

## Demo behavior and limits

- Open **Demo controls** to select a fictional persona, change simulated connectivity, or reset to baseline fixtures.
- Fictional demo state stays in this browser using versioned localStorage, with an in-memory fallback if storage is unavailable.
- There is no production backend, database, authentication, permission enforcement, or messaging service.
- Simulated access never requires a real password. Do not enter real personal information.
- A public profile requires council verification, public opt-in, and approved public content. Private and nonexistent profile links have the same public response.
- A queued intake is not received by the council. A referral response is not a confirmed place; attendance is not paid work.

## Project map

- `context/project-overview.md`: product scope, users, and business rules.
- `context/architecture-context.md`: technical boundaries and state model.
- `context/ui-context.md`: screen map, vocabulary, and design system.
- `context/feature-specs/`: implementation acceptance criteria.
- `context/progress-tracker.md`: current checks, completed work, limitations, and next iteration.
- `src/domain/`: pure transitions, permissions, public projections, and selectors.
- `src/fixtures/`: fictional baseline records and personas.
- `src/state/`: demo state and local persistence.
- `src/views/`: implemented role views.
- `tests/e2e/`: browser tests.

Read `AGENTS.md` and the task-relevant context before changes. Keep the approved client-only architecture and preserve unrelated work. See the progress tracker for the iteration's actual verification results and remaining work.
