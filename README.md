# Creative Connect Zamboanga

A browser-only clickable prototype for a proposed community-assisted creative onboarding, directory, and opportunity-referral service.

**This is not an official council website.** It is a proposed service concept for demonstration. All people, sites, providers, contact routes, opportunities, and outcomes in the demo are fictional. The council has not approved the service, its wording, or any contact route.

## What it is

- A single static web application (React, TypeScript, Vite) that runs entirely in the browser.
- A simulated service across four roles: guest, creative, community coordinator, and council administrator.
- A walk-through of the MVP journeys: public discovery, self-service and assisted registration, an offline device queue with simulated sending, council review and corrections, verified membership, opportunity referrals, and outcomes.
- Demo controls for choosing a persona, simulating connection and a failed send, and resetting the data. They sit outside the product and are labeled as such.

## What it is not

- Not a real service, a business permit, a certification, or an official council channel. Verification means council membership checks passed; it is not a rating of work.
- Not a source of work, income, paid placements, or guaranteed places. Opportunities and referrals record support received.
- Not secure. Personas are a demo session, not sign-in. No password, code, or account is checked or sent. Permission rules run in the browser and are not security.
- Not connected to a server, database, messaging service, analytics, or any external API. After the page loads, it makes no network requests.
- Not for real personal data. Do not enter real names, contacts, or evidence.

## Prerequisites

- Node.js **22.12 or later** (`engines` in `package.json`).
- npm (ships with Node.js).
- For the browser suite: Chromium, installed for Playwright (see Checks).

## Install and run

```sh
npm ci
npm run dev
```

`npm run dev` starts the Vite development server. Open the local URL it prints.

For the static production build and the local demonstration:

```sh
npm run build
npm run preview
```

Open the local URL that `npm run preview` prints. The build output in `dist/` uses relative local assets and hash routes, so it does not need a host with special configuration.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium   # one-time, if Chromium is not already installed for Playwright
npm run test:e2e
```

- `npm test` runs the Vitest domain and unit tests.
- `npm run test:e2e` builds the app and starts its own preview server on port 4173. Keep that port free, or choose another. In PowerShell:

  ```powershell
  $env:PLAYWRIGHT_PORT = '4187'
  npm run test:e2e
  ```

- The browser suite covers the main and alternate journeys, exception paths, role access, persistence and Reset, a network guard, axe scans, keyboard runs, and 320/360/768/1280 px layout. Passing these checks is not a claim of full accessibility certification.

## Reset

Open **Demo controls — not part of the service** (the dashed bar at the top; collapsed by default), choose **Reset demo data**, then confirm **Reset demo data** in the dialog. Reset restores the fictional baseline records, opportunities, audit history, and settings, and clears this browser's saved copy.

Demo data is saved only in this browser (`localStorage`, key `ccz-demo:v1`). If storage is blocked, the prototype runs in memory and progress is lost on reload.

## Personas

Choose a persona in **Demo controls**. Each is fictional.

| Persona | Role in the demo |
|---|---|
| Guest visitor | Public visitor: directory, opportunities, guidance. |
| Mika (fictional illustrator) | No account yet. Her record is being registered by Site A. |
| Jun (fictional video editor) | Self-service creative with a draft in progress. |
| Rhea (fictional designer, verified) | Verified and listed. Has an offer and a recorded outcome. |
| Noel (fictional filmmaker, verified) | Self-service, verified, and listed. Expressed interest in a workshop. |
| Coordinator — Demo Site A | Assigned to the fictional barangay hall site only. |
| Coordinator — Demo Site B | Assigned to the fictional school site only. |
| Council administrator (fictional) | Reviews records, manages opportunities and referrals. |

## Known limitations

- **Simulated security and sign-in.** No real authentication, password handling, or permission enforcement. Role access is a prototype rule only.
- **Simulated offline and sync.** The coordinator's device queue is a browser simulation. There is no real device storage security, background sync, or retry scheduling; a "next send fails" switch simulates failure.
- **Simulated messaging.** Codes, invitations, and notifications are on-screen examples. No SMS or email is sent.
- **Fictional data only.** Adults, sites, providers, opportunities, and outcomes are invented and labeled. Council rules, sub-sector lists, guidance sources, and contact routes are placeholders pending council approval.
- **English only.** No translation.
- **No export.** The prototype does not export records, files, or reports, and it accepts no file uploads.
- **Storage.** Saved demo data is versioned. Older saved data is reset to the starting data with a notice. Blocked storage means in-memory use only.
- **No deployment.** No hosting, domain, or publication is set up. The local static build (`npm run build` then `npm run preview`) is the only supported way to present it.
- **Accessibility checks are automated.** Axe, keyboard, and zoom-approximation checks run in the browser suite. A manual screen-reader check and a 200% zoom check on the presenting machine are not recorded here.
- **Browser coverage.** The browser suite runs on desktop Chromium only.

## Documentation

- `DEMO.md`: the single demonstration script (main and alternate stories, talking points, pre-demo checklist, presenter-laptop checklist, and handoff record).
- `context/`: the product scope, architecture, UI rules, code standards, feature specifications, and progress tracker. Read `AGENTS.md` before changing the project.
- Operational requirements for any future hosting, real authentication, consent handling, or data protection are not defined in this prototype. Record them in `context/` before they are built.

## Project map

- `src/domain/`: pure state transitions, permissions, public projections, and selectors.
- `src/fixtures/`: fictional baseline records, opportunities, and personas.
- `src/state/`: demo state and local persistence.
- `src/views/`: role views and shared intake.
- `tests/e2e/`: browser journey, accessibility, and responsive tests.
