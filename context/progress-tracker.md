# Progress Tracker

Last updated: 2026-10-27.

## Current Phase

Feature 04 and the approved creative-domain/location revision are implemented, independently reviewed, and verified. Features 01–04 are complete at their scoped boundaries; the full MVP is not complete.

## Current Goal

Next implementation scope is Feature 05: coordinator workspace and offline queue simulation. The classification revision does not implement Feature 05.

## Milestones

| # | Milestone / feature spec | Status | Notes |
|---|---|---|---|
| 0 | Planning and project context | DONE | Baseline commit 8f6aa3c. |
| 01 | Foundation and demo shell | DONE, accepted gaps below | Existing commit 1dc8db3; Sol Senior re-reviewed the foundation. |
| 02 | Domain state, permissions, fixtures | DONE, accepted gaps below | Existing commit 1dc8db3; later regression checks extend it. |
| 03 | Public discovery, guidance, simulated access | DONE at Feature 03 scope | Code commit e860df9; P01–P06/A01–A02. Feature 04 completes the post-intake opportunity return. |
| 04 | Shared intake, privacy, application status | DONE at Feature 04 scope | Code bc30efe plus classification revision 45f9439; R01/R02/C01, assisted capture, corrections and human-review requests. |
| 05 | Coordinator workspace/offline simulation | NEXT | Queue domain rules and assisted capture exist; workspace/sync screens do not. |
| 06 | Council review/corrections/profile maintenance | NOT STARTED | Creative correction entry exists; council review and C02 remain unbuilt. |
| 07 | Opportunities/referrals/outcomes | NOT STARTED | P05 expresses interest; full role workflows remain unbuilt. |
| 08 | Council overview/reporting/notifications | NOT STARTED | Selectors and creative example notices exist; council screens unbuilt. |
| 09 | Full-journey verification/demo packaging | NOT STARTED | README present; complete demo stories depend on 05–08. |

Dependency order: 01 -> 02 -> {03, 04, 07} -> {05, 06} -> 08 -> 09.

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

- Features 05–08 workspaces and full main/alternate demo stories remain unfinished. F05 sync management, council M02 review, C02 maintenance, and C03 referral workflows are later scopes.
- No production backend/auth, real credentials/messages, official endorsement, live integrations, or personal-data collection.
- No site deployment/hosting resource; GitHub is source hosting only.
- Mobile navigation wraps rather than using a menu button, as previously accepted.
- Coordinator Follow-ups and council Creative records navigation arrive later.
- Store run has browser coverage rather than a dedicated unit suite.
- Previously accepted domain minors remain: creative edits can clear updateReason; reverting pending content can leave updatePending; explicit tests for non-confirmed recordInstructions refusal and updateReason clearing on approval remain absent. Not broadened into this iteration.
- Manual screen-reader testing, complete 200% zoom coverage, every future role view's keyboard audit, and full no-network main-story testing remain for Feature 09.
- Detailed sub-sector taxonomy, eligibility evidence, information-use wording, guidance sources, and real contact routes require council confirmation; the nine statutory domain names are established, and demo examples remain labeled.

## Repository / Integration

Public application source repository: https://github.com/Smiling-Owl/creative-connect-zamboanga . Visibility was changed to public at the user's request. The public Smiling-Owl/hermosa research repository is separate.

Existing history is preserved. Integration targets main in E:/dev-work/hermosa. Root checks clean status, fast-forwards the iteration, pushes origin/main, and compares the local/remote hashes. Workers do not merge, push, or deploy.

## Next Recommended Action

Implement context/feature-specs/05-coordinator-workspace-and-offline-queue.md, reusing assisted drafts, device receipts, actor-scoped intake progress, and existing queue transitions. Do not describe the current application as a finished MVP.

Open questions: exact event date/demo duration, team ownership, judge hosting/access, approved guidance/contact routes, and whether a deck/video is required. These do not block the fictional prototype.
