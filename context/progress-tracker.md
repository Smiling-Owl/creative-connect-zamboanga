# Progress Tracker

Last updated: 2026-10-28.

## Current Phase

The MVP (Features 01–09) is implemented, verified, and integrated: `main` was fast-forwarded to `feature/mvp-completion` at `e9b44e7c8db9b29e5ae6161bb4ebef4a7f2483fb` and pushed to `origin/main` on 2026-10-28 (local and remote hashes matched). Remaining items are human handoffs (presenter laptop, non-builder rehearsal, manual screen reader, real 200% zoom) and team decisions, not unbuilt features.

## Current Goal

Complete the presenter-laptop handoff in `DEMO.md` and the manual accessibility checks. Features 08–09 used a Claude Haiku 5.5 worker with independent Claude Sonnet 5.5 verification, as the user requested on 2026-10-28; Features 05–07 used the earlier GPT-6 Luna / GPT-6.1 Sol routing. Root (orchestrator) owns scope, integration, documentation, and final verification.

## Milestones

| # | Milestone / feature spec | Status | Notes |
|---|---|---|---|
| 0 | Planning and project context | DONE | Baseline commit 8f6aa3c. |
| 01 | Foundation and demo shell | DONE, accepted gaps below | Existing commit 1dc8db3; Sol Senior re-reviewed the foundation. |
| 02 | Domain state, permissions, fixtures | DONE, accepted gaps below | Existing commit 1dc8db3; later regression checks extend it. |
| 03 | Public discovery, guidance, simulated access | DONE at Feature 03 scope | Code commit e860df9; P01–P06/A01–A02. Feature 04 completes the post-intake opportunity return. |
| 04 | Shared intake, privacy, application status | DONE at Feature 04 scope | Code bc30efe plus classification revision 45f9439; R01/R02/C01, assisted capture, corrections and human-review requests. |
| 05 | Coordinator workspace/offline simulation | DONE (branch) | Code 8295749; GPT-6.1 Sol approved; covered by full-journey suite. |
| 06 | Council review/corrections/profile maintenance | DONE (branch) | Code f79dda4; covered by full-journey suite. |
| 07 | Opportunities/referrals/outcomes | DONE (branch) | Code d7773b2; covered by full-journey suite. |
| 08 | Council overview/reporting/notifications | DONE (branch) | Code 352c9d3; Sonnet 5.5 approved after one repair batch. |
| 09 | Full-journey verification/demo packaging | DONE (branch), human handoffs open | Tests/README/DEMO.md in the Feature 09 commit; no production changes. Presenter-laptop and non-builder rehearsal pending. |

Dependency order: 01 -> 02 -> {03, 04, 07} -> {05, 06} -> 08 -> 09.

## Vinta theme — 2026-10-28

User-directed visual revision: the team's Zamboanga vinta palette (#FE4800, #008735, #FEBA00, #007ED5, #2B2E32, #F8F8F8) with a modern, low-bandwidth look drawn from Apple, GOV.UK, Linear, and Stripe principles. Branch `feature/vinta-theme` (worktree `E:/side-work/hermosa-vinta-theme`). Design direction is in `ui-context.md` (Visual Direction, Vinta signature, Typography, Design Tokens).

- Haiku 5.5 researched the reference sites and built the theme in three passes; Sonnet 5.5 verified twice (CHANGES REQUIRED, then APPROVE). Root reviewed the screenshots after each pass and applied the final minors (table-safe hidden overview headers, three cards across from 768 px, spec wording).
- No copy, label, route, or domain changes. Markup hooks only: `.app-shell[data-area]`, the sail mark, the P01 hero sail, and `FigureText`. The council logo, lettering, and supplied artwork are not reproduced.
- Results: typecheck/lint clean; `npm test` 180/180; e2e 81/81 (axe on every route, no overflow at 320/360/768/1280); CSS 4.80 KB gzip (+1.75 KB), JS 134.51 KB gzip (+0.49 KB); no external requests, fonts, images, or filters. All text pairs ≥ 4.5:1 and UI/focus ≥ 3:1.
- Mobile header (non-sticky) at 320×568: 239 px guest, 214 px creative/coordinator, 258 px council.
- Integrated: `main` fast-forwarded to `3a42535` and pushed to `origin/main` on 2026-10-28. Rerun on `main` after a clean `npm ci`: typecheck/lint clean, 180/180 unit, 81/81 e2e, build 4.80 KB CSS / 134.51 KB JS gzip, `git diff --check` clean.
- Open: a person should confirm the band is not a trace of the supplied council pattern artwork and that the team may use the council palette. The hidden overview table headers and `:has()` layouts are verified in Chromium only.

## Feature 08 — 2026-10-28

Code commit `352c9d3f68641ed4db9a03693569317f84a55a1c`.

- M01 overview panel (`CouncilOverviewPanel.tsx`) above the review queue, from `councilOverview`: pending reviews (new/resubmitted/under review/profile updates/open cases/overdue), records by status, listed vs private verified, opportunities, current referrals, cumulative referral funnel, exceptions, site and source coverage. Every figure states its base and window; empty bases render "—" with "no records yet". Synthetic-data label and device-exclusion note shown. No export control.
- One `NotificationList` ("In-app example — no SMS or email is sent") on C01, C03, F01, M01, from role-scoped `noticesFor` with links each role can open. F01 shows "N items on devices, not received".
- Verifier repairs: attended stage drops completions reversed by outcome correction; cross-view e2e agreement (M01/M05/C03/M02); canonical status labels with three documented council variants; meaningful queue/draft guard tests; linked-duplicate note on the records tab; overdue from latest receipt; notice sentences for public-content changes, decline upheld, review reopened; unused `councilFunnel` removed. Root also aligned queue age with latest receipt.
- Decisions recorded in `architecture-context.md` (Feature 08–09 notes) and `ui-context.md` (council aggregate variants).

## Feature 09 — 2026-10-28

- `tests/e2e/journeys.spec.ts` (8): Mika main story from Reset (offline queue, failed send, retry → exactly one record, changes requested, coordinator correction with same reference, verify, claim, invitation, coordinator-relayed acceptance, confirm with instructions, attended; Mika never in directory; agreement across C01/C03/F02/M02/M05/M01 and M01 deltas); Jun alternate story (sign-up from opportunity, verify, list, guest finds with no private data, unlist); decline + human review; duplicate resolution; conflict discard; capacity full; direct-URL denial (guest, Site B); reload mid-decision and Reset-to-baseline.
- `tests/e2e/a11y-responsive.spec.ts` (11): axe (no serious/critical) and no overflow at 320/360/768/1280 px on every route in `routes.ts`; keyboard-only council error focus, coordinator sync/retry with `aria-live` announcement, and referral response (intake keyboard run is in `intake.spec.ts`); CSS-zoom 200% approximation; simulation notices on access, queue, notifications, reporting.
- Pre-existing tests cover cancellation cascade, withdrawal, outcome correction, conflict resubmit, and the external-request guard; the coverage map is in `DEMO.md`.
- Copy review: forbidden terms (paid, income, hired, certified, guaranteed, official, endorsed, salary, wage, job, employ) appear only as negative disclaimers; only `.invalid` email addresses; names labelled "(demo)"/"(fictional)". Collision with real people's names was not checked.
- README rewritten (what it is/is not, prerequisites, verified commands, Reset, personas, limitations). `DEMO.md` is the single demo script, corrected to match the real UI; its handoff table is intentionally empty.
- Sonnet 5.5 approved with no blocking issues; root applied its minors (directory anchor assertion, final C01 check, timing qualifier).

## Final verification — 2026-10-28 (development workstation)

Production source identical to `352c9d3`; the Feature 09 commit adds tests and documentation only.

| Check | Result |
|---|---|
| `npm ci` | PASS; 237 packages (worker) |
| Typecheck / lint | PASS (worker, verifier, root) |
| `npm test` | PASS; 180 tests in 16 files (worker, verifier, root) |
| `npm run build` | PASS; 134.02 KB gzipped JS, 3.05 KB gzipped CSS |
| `npm run test:e2e` | PASS; 81 tests in 9 files (root run on port 4193; verifier ran twice, no flakes) |
| `git diff --check` | PASS |
| Local fallback | `npm run preview` on port 4195 served local relative assets only — development workstation evidence, NOT the presenter laptop |

Integration rerun on `main` at `e9b44e7` (E:/dev-work/hermosa): `npm ci` 237 packages; typecheck and lint clean; `npm test` 180/180 (16 files); build 134.02 KB gzipped JS; `PLAYWRIGHT_PORT=4197 npm run test:e2e` 81/81; `git diff --check` clean.

Not verified: manual screen-reader pass, real browser 200% zoom, non-Chromium browsers, presenter-laptop install/build/preview, non-builder teammate rehearsal, narration timing.

## MVP completion checkpoints (Features 05–07)

- Feature 05 code: `8295749e45868733e4fc994de05933e6ef1303da`. F01/F02, assigned-site search/follow-ups, audited notes/relay, invitation claim identity choice, serial simulated send/failure/retry/conflict, coalesced corrections, current R02 transfer/receipt status. GPT-6.1 Sol source review approved after eight repairs; root independently reran coordinator Playwright: 10/10, with a fresh production build. Worker also reported 54 focused domain tests, typecheck/lint/diff checks green. Full integrated counts and complete stories are not yet verified.
- Feature 06 code: `f79dda4cecd7c04dd8e4768f2713cba297a9a259`. M01/M02/C02, separate membership/public-content decisions, immediate withdrawal and relist guard, linked history without ownership transfers, profile editing/validation, per-case resolution, and online consented F02 maintenance for accountless creatives. GPT-6.1 Sol approved after the consolidated repair batch and a final shared focus-target repair. Root reran coordinator+council/profile browser tests: 21/21. Worker ran the added missing-name/display/evidence focus regression: 1/1; type/lint/diff checks green. Manual screen-reader and full integrated verification remain outstanding.
- Feature 07 code: `d7773b2c949089ca467d967663f7911afca2b506`. M03/M04/M05/C03, manual private/nonalias verified candidates, opportunity lifecycle, material-change reconfirmation, allocation/cancellation rules, response/outcome/correction flows, and consented F02 outcome requests. GPT-6.1 Sol approved after eight source repairs, including action/case form isolation and runtime outcome validation. Root independently reran the opportunity browser suite: 7/7 with production rebuild. Worker reported 63 focused domain tests and type/lint/diff checks green. Complete from-Reset stories, aggregate reporting, and all-view checks remain Feature 09 gates.
- Root is maintaining `DEMO.md` as the role journey matrix and eventual exact-click demonstration script. Do not claim a human teammate rehearsal or manual screen-reader check has happened.

## Creative Classification Revision — 2026-10-27

User-approved choice: **Domain + free-text practice**. The attached feedback identified missing creative fields; the team selected the nine statutory domains plus a specific practice in the person's own words while Amado's detailed sub-sector list remains pending.

- Native creative-domain select uses all nine names from RA 11904 Section 3, with concise illustrative examples. No fixed sub-sector list or runtime inference from practice was added.
- Required domain and free-text practice persist through self-service/assisted drafts, correction, queue, receipt, readback, and public preview. Domain joins the allow-listed public projection and content fingerprint; domain edits wait for public-content review.
- Directory supports domain filtering/search alongside specific practice and skill filters. It reads only the public projection.
- **General location** replaces the visible **Broad area** label and explains barangay/district/general locality, never street address. Fictional Area 1/2/3 values remain; real location choices need council input.
- Schema version 4 uses the existing compatibility reset notice for older local demo data. Fictional fixtures have explicit authored domains; no real user's classification is inferred.
- Fixed route-heading focus overriding a requested intake-field focus. Known rendered intake controls receive focus; unknown or absent targets fall back to the heading.
- Canonical product/UI/spec/architecture/code-standard documentation and README reconciled with the approved revision.

Same routing: gpt-6-luna implementation, independent Sol Senior source/UI review, root integration. Sol approved after fixture classification accuracy and accessible helper/focus repairs. Domain validation, public projection/filtering, and domain-only review tests were observed red before implementation, then green.

Verified code commit: **45f9439a115b4a600c12d14ae2975b9f2035bf37**. This tracker change is documentation-only after that commit.

| Check | Result |
|---|---|
| Clean locked install | PASS; 237 packages |
| Typecheck / lint | PASS |
| Full Vitest | PASS; 129 tests in 14 files |
| Production build | PASS; 104.30 KB gzipped JS |
| Full Playwright, port 4188 | PASS; 28 tests |
| New browser regressions | All nine choices/examples; custom practice survives reload/readback/submission; domain filter; domain-error focus; unknown-focus fallback |
| Keyboard / axe | Natural keyboard journey and existing 320/360px intake/status scans pass; directory scan includes the new filter |
| Visual / runtime | Revised intake step 2, review, and directory inspected at 1280/320/360px; no overflow or browser exceptions; concise helper-copy confirmation passed |
| Network smoke / diff check | PASS; prototype-origin-only browser check and git diff --check |

Focused test attempts also caught test setup/query-assertion errors and the real route-focus issue; they were corrected before the final green run. Browser checks ran outside the Windows subprocess sandbox. No required check remains failing. Manual screen-reader testing and complete 200% zoom coverage remain unverified.

## Completed Feature 04 (before classification revision)

- Shared three-step intake for self-service and coordinator-assisted capture: names, follow-up, practice/skills/area/interests, and text work evidence with per-item public permission.
- Saved drafts restore progress and choices through reload, navigation, and persona switching. Assisted source/site/coordinator/date are actor-derived and read-only.
- Review readback with edit routes; labeled draft information-use wording; required acknowledgment separate from the default-off listing choice.
- Allow-listed live public preview using the same PublicProfileCard as P03; private name/contact/evidence stay outside that projection.
- Online council receipt, offline assisted device receipt explicitly unreceived by council, and offline self-service saved-draft guidance.
- Sequential coordinator registrations start separately. Actor-scoped draft/receipt metadata blocks cross-persona direct URLs; stale or submitted draft links show recovery guidance.
- Opportunity origin is bound to its intended creative, survives another persona's separate intake, and returns to the originating opportunity after actual submission.
- C01 shows current status, reference, next step, reason/history, assistance, and labeled example notifications.
- Corrections retain the existing record/reference and explicit listing choice, including queued delivery. Only changes-requested records enter correction intake.
- Declined creatives can open one human-review case and see the waiting request after reload; no council decision interface was added.
- Structured validation rejects blank/whitespace skills, work descriptions, and own-channel labels. Error actions focus the field or open its saved step without breaking hash routing.
- Schema version 3 persistence, README, architecture, code standards, and regression coverage updated.

## Review and Routing

Same setup as the previous iteration: the exposed gpt-6-luna implementer and independent sol_senior verifier. The user's original requested “6.1 Luna” name was unavailable and that substitution was previously disclosed. Work was isolated on feature/intake-application-status. Root owns scope, documentation, verification, integration, and publication.

Sol Senior approved Feature 04 after repairs to validation, correction/privacy handling, draft/receipt ownership, opportunity-origin ownership, direct correction/draft guards, and error-summary focus. The final focus repair received a separate approval. Desktop/mobile UI review found no blocking clipping or readability issue.

Domain TDD evidence: whitespace validation and correction listing-choice regressions were observed failing before fixes and then passed. Browser journeys exposed real typing, step-routing, and hash-router focus issues. Do not claim every UI line was written test-first.

## Feature 04 Verification — 2026-10-27 (before classification revision)

Verified code commit: bc30efe25adb85a506e64486870e500aadc93c63. This tracker update is documentation-only after that commit.

| Check | Result |
|---|---|
| npm ci --no-audit --no-fund | PASS; 237 locked packages in fresh worktree |
| npm run typecheck | PASS |
| npm run lint | PASS, including final browser-test update |
| npm test | PASS; 125 tests in 14 files |
| npm run build | PASS; 104.48 KB gzipped JS, also rebuilt by browser suite |
| PLAYWRIGHT_PORT=4188 npm run test:e2e | PASS; 25 tests |
| Intake browser journeys | Eight tests: draft/receipt/reload, correction, human review, assisted/offline/persona isolation, actual opportunity return, narrow accessibility, natural keyboard completion, and C01 state variants |
| Axe / responsive | No serious/critical violations on R01 steps, R02, C01 draft/received/correction/declined-review at 320/360px; prior public/access scans retained |
| Desktop/mobile screenshots | R01/R02/C01 inspected at 1280/320/360px; no overflow or browser exceptions |
| Keyboard | Natural Tab traversal, text entry, Enter/Space activation, summary focus/recovery, acknowledgment and successful intake submission |
| External request smoke | PASS; existing prototype-origin-only browser check |
| git diff --check | PASS |
| Local development preview | Vite on port 4190 used for screenshots; owned preview process stopped afterward |

The first full browser run passed 24/25: the old Feature 03 return-context test still expected placeholder copy/link text. It was updated to the implemented intake while retaining assistance and malicious-return-URL assertions; the full rerun passed 25/25. No failing required check remains. Port 4188 avoided an unrelated server on 4173.

## Remaining Boundaries and Accepted Gaps

- No production backend/auth, real credentials/messages, official endorsement, live integrations, or personal-data collection.
- No site deployment/hosting resource; GitHub is source hosting only.
- Mobile navigation wraps rather than using a menu button, as previously accepted.
- Store run has browser coverage rather than a dedicated unit suite.
- Previously accepted domain minors (creative edits clearing updateReason; reverting pending content leaving updatePending; missing explicit tests for non-confirmed recordInstructions refusal and updateReason clearing on approval) were partly addressed by Feature 06's pending-review rules but were not re-audited.
- Human handoffs still open: manual screen-reader spot check, real browser 200% zoom (only a CSS-zoom approximation is automated), non-Chromium browsers, presenter-laptop install/build/preview, and a non-builder teammate rehearsal recorded in the `DEMO.md` handoff table.
- Team decision pending: invitations/offers are refused once confirmed places are full (recorded in `architecture-context.md`). The claim form pre-fills a fictional `INV-DEMO-DANI` code that presenters replace, as `DEMO.md` explains.
- Minor verifier notes not acted on: two notices for one outcome correction (case resolved + outcome corrected); notice links use full sentences, some identical; overview tables stay two-column below 640 px (no overflow).
- Detailed sub-sector taxonomy, eligibility evidence, information-use wording, guidance sources, and real contact routes require council confirmation; the nine statutory domain names are established, and demo examples remain labeled.

## Repository / Integration

Public application source repository: https://github.com/Smiling-Owl/creative-connect-zamboanga . Visibility was changed to public at the user's request. The public Smiling-Owl/hermosa research repository is separate.

Existing history is preserved. Integration targets main in E:/dev-work/hermosa. Root checks clean status, fast-forwards the iteration, pushes origin/main, and compares the local/remote hashes. Workers do not merge, push, or deploy.

## Next Recommended Action

1. On the presenter laptop: follow the `DEMO.md` presenter checklist (`npm ci`, `npm run build`, `npm run preview`), then have a teammate who did not build the app run both stories and fill in the handoff table.
2. Do a manual screen-reader spot check and a real 200% zoom check, and record the results here.

Open questions: exact event date/demo duration, team ownership, judge hosting/access, approved guidance/contact routes, whether a deck/video is required, and the full-capacity invitation rule. These do not block the fictional prototype.
