# Feature 09 — Verification, Demo Script, and Packaging

## Goal

Prove the prototype meets the Definition of Done and package a repeatable demonstration: full journey tests, accessibility/responsive/keyboard checks, truthful-copy review, a short demo script, run instructions, known limitations, and a working local fallback.

## Context

Definition of Done in `project-overview.md`; testing strategy in `architecture-context.md`; Days 6–7 of the schedule. Publishing to a host is **not** part of this feature unless the team chooses a host and explicitly authorizes it.

## Requirements

1. **Journey tests (Playwright)** from Reset:
   - Main story: coordinator assisted intake for Mika (listing off) → offline queue → simulated reconnection (including one failed send + retry) → council requests clarification → correction via coordinator or Mika → council verifies → council offers the Portfolio Feedback Clinic (fictional) → Mika accepts (directly after claim or relayed) → council confirms → attended recorded; assert Mika never appears in the directory and statuses agree across C01/C03/F02/M02/M05/M01.
   - Alternate story: Jun self-service sign-up and intake → council approves → Jun opts into listing → guest finds Jun in P02 → P03 shows the council contact route and no private data.
   - Exception paths: decline + human review, duplicate resolution, conflict resolution, capacity full, cancellation cascade, visibility withdrawal, outcome correction, direct-URL access denial for guest and other-site coordinator.
   - Persistence: reload mid-story preserves state; Reset returns to baseline counts.
   - No external network requests during any test.
2. **Accessibility/responsive:** axe on every view in key states; no horizontal overflow at 320, 360, 768, 1280 px; keyboard-only run of intake, review errors, sync status, and referral response; manual screen-reader spot check and 200% zoom check recorded.
3. **Truthful-copy review:** search the UI copy for forbidden claims (paid, income, hired, certified, guaranteed, official, endorsed) and real names/branding; confirm simulation notices on access, queue, notifications, reporting.
4. **README.md:** what the prototype is and is not, prerequisites, `npm ci`, run/build/preview/test commands (only verified ones), how to reset, persona list, known limitations (simulated security/offline/messaging, fictional data, English only, no real export), and future operational requirements pointer.
5. **Demo script** (in README or `DEMO.md` — one file): 5–7 minute main story and 1–2 minute alternate story with exact clicks, persona switches, and talking points about what is simulated; pre-demo checklist (reset, browser zoom, offline toggle off, window size).
6. **Local fallback:** verified `npm run build` + `npm run preview` on the presenting machine; decide with the team whether to add a single-file build that opens from disk (record decision in `architecture-context.md`).
7. Record all results, failures, and remaining gaps in `progress-tracker.md` (via the orchestrator).

## Non-Goals

Publishing/deploying, creating hosting resources, decks or videos, translations, participant recruitment (participant feedback, if the team obtains it, is recorded with sample and limits but is not required to pass).

## Architecture / Design Constraints

No production code changes except defect fixes found by verification (each scoped and reported). Tests use accessible locators and deterministic fixtures.

## Dependencies

Features 01–08 integrated.

## Edge Cases

- Presenter machine without network: fallback still runs (no external assets).
- Browser with blocked storage: demo still runs in memory (state lost on reload — documented).
- Demo started from a dirty state: pre-demo checklist requires Reset.

## Testing / Verification

This feature is verification. All scripts (`build`, `typecheck`, `lint`, `test`, `test:e2e`) run on the integrated main branch; results recorded with the commit hash.

## Acceptance Criteria

- [ ] Main and alternate story tests pass from Reset on the integrated branch.
- [ ] All exception-path tests listed above pass.
- [ ] Axe reports no serious/critical violations; no horizontal overflow at the four widths; keyboard-only run documented.
- [ ] Copy review finds no forbidden claims, real people, contact details, or council branding.
- [ ] README and demo script exist; a teammate who did not build the app can run the demo from them without developer help (record who checked).
- [ ] Local fallback verified on the presenting machine (record date and machine).
- [ ] `progress-tracker.md` records verification results, the last verified commit, and remaining known gaps.

## Open Questions

Event date, demo duration, organizer requirements, and judge access/hosting (team OPEN #1, #3). Whether a deck or video is required (team OPEN #5) — not added automatically.
