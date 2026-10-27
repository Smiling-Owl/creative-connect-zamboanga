# Architecture Context

Decision markers: **APPROVED** (decided by the team), **PROPOSED** (recommended; implement unless the orchestrator/team changes it, and escalate before deviating), **OPEN** (unresolved).

## Architecture Summary

A single static, client-only single-page application. All "system" behavior — accounts, roles, the council's records, the coordinator's device queue, connectivity, review decisions, referrals — is simulated inside one in-browser demo store seeded from fictional fixtures. There is no server, database, API, or network dependency at runtime.

### Feature 04 implementation notes — 2026-10-27

- `src/views/intake/IntakeViews.tsx` implements the shared R01/R02 intake and C01 creative status views. Coordinator capture uses the same form with actor-derived, read-only source attribution. Later coordinator/council/profile/referral workspaces remain placeholders.
- The existing storage envelope now uses `schemaVersion: 3`. `intakeUi` stores the last step, separate public-listing choice, receipt context, and bounded opportunity return context alongside domain drafts. Metadata keys include the acting owner's ID, including after the submitted draft is removed. Older envelopes reset with the compatibility notice.
- Intake uses structured domain validation for field messages and a linked error summary. Whitespace-only skills, evidence, and own-channel labels are rejected. A description is valid work evidence; a portfolio URL, upload, permit, or ID is not required.
- Error-summary actions focus the current field or navigate to the saved intake step with a focus target. They do not use fragment-only anchors, which would be interpreted as routes by `HashRouter`.
- `projectPublicIntake` creates an allow-listed draft preview. R02 and P03 share `PublicProfileCard`; draft copy states that the preview is unpublished. Private readback information never enters the preview projection.
- Online submissions and corrections use domain transitions. Corrections retain the existing record/reference and persist the explicit listing choice, including queued correction delivery. Offline self-service keeps a draft; coordinator submissions can receive a device reference while remaining unreceived by the council.
- C01 derives status, reasons, history, and notifications from domain state. A declined application can open one human-review case; this does not reverse the council decision. Feature 06 still owns council review screens.
- Actual intake receipts now complete the Feature 03 return-to-opportunity path. A bounded public opportunity ID is retained, never an arbitrary return URL. Pending registration context is bound to its intended creative so a coordinator's separate capture cannot consume it.

### Feature 03 implementation notes — 2026-10-27

- Public and simulated-access views live in `src/views/public/PublicViews.tsx`, selected by existing view IDs from `App.tsx`. Feature 04 adds intake/status views; later feature views remain explicit placeholders.
- `OpportunityDetail` is exported for later role views. Public creative data uses the allow-listed projection. Exact skill filtering extends the existing directory selector.
- Feature 03 introduced `schemaVersion: 2` under the existing `ccz-demo:v1` storage key (superseded by version 3 in Feature 04). `access` state tracks recovery, a validated pending opportunity ID, fictional sign-up contact, and sign-up/verification stage.
- Simulated sign-up updates the selected fictional creative's draft through `saveDraft`. Existing receipt-time duplicate detection flags a matching assisted contact when intake is eventually submitted. Drafts are not sent to the council by sign-up.
- Opportunity origin accepts only a known public opportunity route; arbitrary return URLs are not rendered. Feature 04 completes its post-submission return path.
- `deadlinePassed` in `domain/core.ts` uses the deterministic demo date. New interest, invitations, and offers are blocked after the deadline; the deadline date itself remains valid. Closed/cancelled status takes precedence over expired-publication wording.
- Playwright accepts `PLAYWRIGHT_PORT` (default 4173). Verification used 4187 to avoid an occupied default port; application runtime behavior is unchanged.

No production backend, external requests, real authentication, or runtime dependencies were added. These notes record additive details, not authorization to collect real information.

```
Browser
 ├─ Demo controls (outside product chrome): role/persona · connectivity · fail-next-send · reset
 ├─ Views (P/A/R/C/F/M) ──read──> selectors ──> demo store
 │        └──dispatch actions──> domain transition functions ──> new state + audit events
 ├─ Demo store (React context + reducer)  <──mirror──> localStorage (this device only)
 └─ Fixtures (baseline fictional data, fixed demo clock)
```

## Approved Stack

| Decision | Status |
|---|---|
| Browser-based clickable prototype; no production backend, database, real auth, messaging, or real personal-data collection | APPROVED (brief) |
| Vite + React + TypeScript, static client-only SPA | APPROVED (team, 2026-10-23) |
| In-memory demo store mirrored to `localStorage` on the presenting device, with a visible Reset that restores baseline fixtures | APPROVED (team, 2026-10-23) |
| Git repository in this folder; worktree-isolated parallel work | APPROVED (team, 2026-10-23) |
| Hash-based routing (React Router in hash mode) and Vite `base: './'` so the build runs from any static host path | PROPOSED |
| Plain CSS with custom-property design tokens; no UI component framework, CSS-in-JS, or icon font | PROPOSED |
| Vitest for domain/unit tests; Playwright (Chromium) + `@axe-core/playwright` for journeys, accessibility, and viewport checks | PROPOSED |
| ESLint (typescript-eslint, react-hooks) and `tsc --noEmit` | PROPOSED |
| Node 22+ and npm (Node 24 / npm 12 present on the team machine) | PROPOSED |
| Hosting provider for judges | OPEN |

Exact library versions are chosen at foundation time (current stable releases) and pinned via `package-lock.json`. No other runtime dependencies without escalation.

## Major Components

| Component | Responsibility |
|---|---|
| `domain/` | Entity types, pure state-transition functions, invariants, permission policy, public-profile projection, count selectors. No React, no storage. |
| `fixtures/` | Baseline fictional data set supporting both demo stories and every exception path. |
| `state/` | Store provider (reducer over domain transitions), persistence/versioning, reset, demo clock, current session (role + persona). |
| `components/` | Shared UI: shell/navigation, status badge and timeline, form fields, record list/queue, review actions, profile card, opportunity detail, referral detail, empty/denied/simulation notices. |
| `views/` | The 20 planned views grouped by area (public, access, intake, creative, coordinator, council). Views read via selectors and dispatch actions; they contain no business rules. |
| `demo/` | Demo controls panel and demo-script helpers. |

## Frontend

- One responsive application; role-aware layouts share components (see `ui-context.md`).
- Route map (PROPOSED; foundation finalizes and records changes here):

| View | Route |
|---|---|
| P01 Welcome | `#/` |
| P02 Directory | `#/directory` |
| P03 Public profile | `#/directory/:profileId` |
| P04 Opportunities | `#/opportunities` |
| P05 Opportunity details | `#/opportunities/:opportunityId` |
| P06 Guidance | `#/guidance` |
| A01 Access / invitation claim | `#/access` (variants via step parameter: sign-in, sign-up, verify, claim, staff-invite) |
| A02 Access recovery | `#/access/recover` |
| R01 Intake | `#/apply` (and `#/coordinator/intake` for assisted mode) |
| R02 Review & submit | `#/apply/review` |
| C01 Home / status | `#/me` |
| C02 Profile & preferences | `#/me/profile` |
| C03 Opportunities & referrals | `#/me/referrals`, `#/me/referrals/:referralId` |
| F01 Coordinator workspace | `#/coordinator` |
| F02 Assisted record | `#/coordinator/records/:recordId` |
| M01 Council overview / queue | `#/council` |
| M02 Application review | `#/council/applications/:recordId` |
| M03 Opportunity management | `#/council/opportunities` |
| M04 Opportunity editor | `#/council/opportunities/:opportunityId/edit` (`new` for create) |
| M05 Referral tracker | `#/council/referrals`, `#/council/referrals/:opportunityId` |

- Every route resolves for every role; a route the current persona may not use renders an "access not available in this role" panel (and never renders private data), so direct URLs demonstrate the boundary.
- Intake draft state lives in the store (not component state) so back navigation and role switches preserve it.

## Backend

None. APPROVED. The "council system" is the demo store. Do not add a server, mock API layer, service worker, or fake network latency framework. A short artificial delay for "Sending…" is acceptable only if it is deterministic and skippable in tests.

## Persistence / Database

- No database. The demo store is held in memory and mirrored to `localStorage` under one versioned key (PROPOSED: `ccz-demo:v1`) as `{ schemaVersion, savedAt, state }`.
- On load: missing, unparsable, or schema-mismatched data → load baseline fixtures and show a brief notice. Every storage access is wrapped in try/catch; the app must work with storage unavailable (private window).
- Reset restores baseline fixtures and the demo clock, clears the persisted copy, keeps the user on a sensible page, and asks for confirmation first.
- Cross-tab sync via the `storage` event is optional (PROPOSED: only if time remains).
- Only fictional data is ever stored. The UI states that demo data stays in this browser.

## Data Model Overview

Conceptual entities (product needs, not a production schema). Identifiers are strings. All timestamps come from the demo clock.

- **Session**: current role (`guest | creative | coordinator | council`) and persona id. Set by the demo role switch or a simulated sign-in. Not security.
- **Persona/staff**: fictional coordinators (with site/cohort assignment) and council administrators.
- **Site**: fictional barangay/SK or school site (e.g., "Demo Site A — barangay hall"), never a real named partner.
- **CreativeRecord**: display name, name, creative practice, skills, broad area, interests, follow-up arrangement (`own_channel` with a fictional channel label, or `coordinator_mediated` with the responsible coordinator), work evidence items (`link` text, `sample` description, or `assisted_description`; each with a creator-approved-for-public flag), intake source (`self_service | assisted`, coordinator, site, date), information-use acknowledgment, internal notes, account state (`none | invited | active`), last confirmed date, `version` (incremented on each received change).
- **Application** (one per record): state, council reference (assigned on receipt), review history, duplicate flag and resolution, `receivedAt`.
- **PublicVisibility** (per record): `optedIn` boolean (default false), public-content review state (`not_submitted | pending | approved | changes_needed`), last approved public field snapshot.
- **DeviceQueueItem** (coordinator device): local reference, record id, kind (`new_application | correction`), `baseVersion`, transfer status (`waiting | sending | failed | conflict | delivered`), attempts, last error, idempotency key.
- **Opportunity**: title, type, fictional provider, description, eligibility, cost, capacity, dates/deadline, location/mode, responsible owner, next step/confirmation process, contact route, state, history.
- **Referral**: record id, opportunity id, origin (`interest | invitation`), state, practical instructions, outcome, correction requests, history (actor, role, via-coordinator, source, timestamp).
- **CorrectionRequest**: subject (profile, outcome, decline/human review, withdrawal), requester, reason, state (`open | resolved`), resolution note.
- **AuditEvent** (single append-only log): timestamp, actor {role, id}, `via` coordinator if relayed, entity type/id, action, from-state, to-state, reason. Review history, referral history, timelines, and in-app notifications are all derived from this log.

### State machines (APPROVED rules; identifiers PROPOSED)

**Application**

```
draft ──submit(online)──────────────────────────> received
draft ──submit(offline)──> queued ──sync ok────> received
                            └─sync fail─> queued[transfer=failed] ──retry──> …
                            └─version mismatch─> queued[transfer=conflict] ──coordinator resolves & resubmits──> …
received ──council starts review──> under_review
under_review ──approve──> verified            (blocked while duplicate flag unresolved)
under_review ──request changes(reason)──> changes_requested ──correct & resubmit──> received
under_review ──decline(reason)──> declined ──human-review request──> open case ──council reopens──> under_review
                                                                              └─council upholds(reason)──> declined
verified ──substantive edit──> verified + updatePending flag ──council approves update / requests changes
```

- After verification, substantive edits (practice, skills, evidence) set an `updatePending` flag rather than revoking verification (PROPOSED): the record stays verified and eligible for referrals; changed public fields stay hidden until approved. Contact-preference and visibility changes never trigger review.

- The device queue exists only on coordinator devices (flow baseline: offline capture is limited to intake drafts and queued submissions on approved coordinator devices). A self-service creative who is offline keeps a saved draft and is told submission needs a connection.
- Council views only see applications with `receivedAt` set. Queued items do not exist for the council.
- Duplicate and conflict are **flags**, never states that lead to `verified`. Approve is disabled until a duplicate flag is resolved as "not a duplicate" (with reason) or "linked to existing record" (merge preserves both histories; never merge on name alone).
- Submission is idempotent per (record, submission version): repeating submit or retry never creates a second record, application, or queue item.
- Withdrawal requests and correction requests are routed to the council queue as cases; they do not delete records.

**Public visibility** — independent of application state.

- Listed in directory ⇔ application `verified` ∧ `optedIn` ∧ public-content `approved`.
- Opt-out removes the listing immediately and never changes eligibility or referrals.
- Public-facing edits after approval set public-content `pending` and hide the listing until approved (PROPOSED).

**Opportunity**

```
draft ──publish──> published ──close──> closed
                   published ──cancel(reason)──> cancelled  → every active referral → cancelled (reason recorded, creative notified in-app)
```

Closed/cancelled opportunities remain visible where referenced, clearly marked; they accept no new interest, offers, or confirmations.

**Referral** — one record per (creative, opportunity) ever; later re-engagement reuses it (PROPOSED).

```
interest ──council review──> under_review ──offer──> offered
                             under_review ──not selected(reason)──> not_selected
(council invitation) ─────────────────────────────> offered
offered ──creative/coordinator-relayed response──> accepted | declined
accepted ──council confirms capacity & arrangements──> confirmed   (blocked if full or not published)
confirmed ──outcome──> completed ("attended/completed") | did_not_attend | awaiting_follow_up
awaiting_follow_up ──outcome──> completed | did_not_attend
any active state ──opportunity cancelled / creative withdraws──> cancelled
```

- Capacity used = referrals in `confirmed | completed | did_not_attend | awaiting_follow_up`. Confirm is impossible when used ≥ capacity; offers never reserve a place.
- Express interest requires a verified record and a published, open opportunity (PROPOSED).
- Outcome correction: a creative's request opens a CorrectionRequest; the council resolves it (change outcome or keep it with a reason). Outcomes are support received, never "paid work" or "income".
- Material opportunity edits return `confirmed` referrals to `accepted` for re-confirmation; capacity cannot drop below the used count (PROPOSED).

**Account**: `none → invited → active`. A claim always links to the existing record. A self-service sign-up that matches an existing assisted record raises a duplicate flag for council review; it never auto-merges.

## Data Flow

1. A view dispatches an intent (e.g., `submitApplication`, `syncQueue`, `approveApplication`, `offerReferral`).
2. The reducer calls the matching pure domain function with current state, session, demo time, and demo-control settings (connectivity, fail-next-send).
3. The function checks permission and invariants, returning either `{ ok: true, state, events }` or `{ ok: false, code, message }` with a user-facing, specific message.
4. On success the store appends audit events, increments sequence counters, and persists. On failure the view shows the message near the control; state is unchanged.
5. Views and counts read only through selectors, so every role sees the same underlying records.

References are deterministic sequence-based strings (e.g., council `CCZ-0007`, device `DEV-A-03`) so demos and tests are repeatable.

## APIs / Integrations

None. The app makes **no network requests** after loading its own static assets: no CDN, web fonts, analytics, maps, or third-party embeds. Evidence links in fixtures use the reserved `.invalid` domain or are plain text; user-entered links are displayed as text, not followed. The council contact route is a clearly labeled placeholder until the council supplies an approved route.

## Authentication / Authorization

- Real authentication: none (APPROVED). Access screens (A01/A02) simulate sign-up, sign-in, contact verification, staff invitation, record claim, and recovery with prefilled fictional identities and a visible "Simulated — no credentials are processed or sent" notice. No password value is stored or validated against anything; prefer buttons that continue as a fictional persona over free-text secret fields.
- Role switching is a demo control visibly outside the product chrome; it is not presented as a product feature.
- Authorization is represented by one pure policy module (`can(session, action, target)`) used by views and domain functions alike, covering: guest → public projection only; creative → own record/referrals; coordinator → records assigned to their site/cohort, no approve/decline/role grant; council → operational records, decisions require a reason.
- Copy must not claim that these frontend checks are real security.

## Security Boundaries

- Public views (P01–P06 and C02's public preview) obtain creative data **only** through the public-profile projection, which returns an allow-listed set of fields (display name, practice, skills, broad area, creator-approved evidence, last updated, council inquiry route). Tests assert that private fields (name if not display name, contact/follow-up details, non-approved evidence, internal notes, review history, coordinator/site, references) never appear.
- React escaping only; no `dangerouslySetInnerHTML`; no `eval`; no arbitrary URLs navigated.
- No secrets, tokens, or environment variables are needed; none may be committed.
- Fixture data is fictional adults only; no real names of private individuals, real partner sites, real providers, or council branding.

## Deployment

- Build output: static `dist/` folder (APPROVED that it is static). Works from any path thanks to hash routing and relative base (PROPOSED).
- Local fallback is required: `npm run build` then `npm run preview` on the presenting laptop, verified before the event. An optional single-file build that opens directly from disk may be added during packaging if the team wants an offline file fallback (PROPOSED, decide in feature 09).
- Public hosting (e.g., any static host): OPEN. Publishing requires a chosen host and explicit team authorization; it is not part of any feature spec's automatic scope.

## Testing Strategy

- **Domain unit tests (Vitest):** every state transition and invariant — idempotent submit/retry, no review before receipt, duplicate blocks approval, correction loop, visibility rule, capacity limits, cancellation cascade, one referral per pair, outcome distinctions, permission policy, public projection field allow-list, count selectors with consistent denominators, persistence version fallback.
- **Journey tests (Playwright, Chromium):** main story and alternate story end-to-end from a reset state; exception paths (decline + human review, duplicate, send failure + retry, conflict, capacity full, cancellation, visibility withdrawal, outcome correction); direct-URL access-denied checks; cross-role consistency (counts and statuses agree); reset restores baseline; reload preserves state; no external network requests.
- **Accessibility and layout:** axe scan of each view in its key states; keyboard-only completion of intake, review errors, sync status, and referral response; focus moves to headings/messages after navigation and actions; no horizontal overflow at 320, 360, 768, and 1280 px widths.
- Manual checks recorded in `progress-tracker.md`: screen-reader spot check, 200% zoom, demo rehearsal timing.

## Architectural Invariants

1. Business rules live only in `domain/`; views never mutate state directly or re-implement rules.
2. Every state change produces an audit event with actor, role, and (where relevant) reason and relaying coordinator.
3. Public data is produced only by the public-profile projection.
4. Counts are always computed from current state by selectors; never hardcoded or cached separately.
5. Council-side selectors exclude anything without `receivedAt`.
6. Submissions, invitations, and interest actions are idempotent.
7. No runtime network requests and no real data, credentials, or branding.
8. Every interactive control either performs its local action or is visibly marked as unavailable in the prototype.
9. Reset always returns to the same baseline; baseline supports both demo stories.

## Important Trade-offs

- **Client-only simulation vs. a mock backend:** a backend would make permissions real but cost days and imply production readiness. The brief asks for honest simulation; the policy module keeps boundaries consistent and the copy states they are not security.
- **localStorage persistence:** protects the live demo from an accidental refresh at the cost of a versioning/fallback path. Data is fictional and device-local.
- **Single store over per-view state:** slightly more upfront modeling, but guarantees cross-role consistency, which is an acceptance criterion.
- **Hash routing:** less pretty URLs, but zero host configuration and a working local fallback.
- **No UI framework:** a few more hand-built components, but lighter pages, full control of focus/touch targets, and fewer dependencies.

## Open Architecture Questions

1. Hosting/access method for judges (affects only packaging; static output works anywhere).
2. Whether a single-file offline fallback build is wanted (decide during feature 09).
3. Whether cross-tab sync is worth adding (only if two-window presenting is planned).

## Implementation Decisions Recorded 2026-10-26

Recorded after the Feature 01–02 implementation and the first Opus review. Each item is a decision made while building; the team has not yet approved the PROPOSED ones.

| Decision | Status |
|---|---|
| TypeScript pinned to 5.9.3 because typescript-eslint does not yet support TypeScript 7 | PROPOSED (revisit when typescript-eslint supports 7) |
| react-router v8 with `HashRouter` for hash routing, as built | PROPOSED (the stack table lists hash routing as PROPOSED; team to confirm) |
| Expressing interest is refused when an opportunity is full ("no new interest can be recorded") | PROPOSED |
| Offers, selections, and confirmations require a published opportunity; recording an outcome does not, so events on closed offers can still be recorded | PROPOSED |
| One record per creative. A second new record for the same person is refused, and drafts for a second record are refused too | PROPOSED |
| Verification requires the record to be under review first. Received records are never verified directly | PROPOSED |
| A duplicate resolved as "linked" keeps both histories, and that record cannot be verified separately. Nothing is merged | PROPOSED |
| Possible-duplicate heuristic: same display name and area, or the same own-channel contact label. Demo assumption only | OPEN (council rule) |
| Public-content approval happens at verification or later, whether or not the creative has opted in. A later opt-in lists immediately if content is unchanged | PROPOSED |
| Coordinator-relayed responses, and coordinator-requested human reviews, are recorded with the coordinator as the relay | PROPOSED |
| Coordinators can invite an assisted person to claim the existing record (online only). A claim links that record and never creates a second one | PROPOSED |
| Substantive edits to a verified profile set an update flag. The council approves it or asks for changes with a reason; the record stays verified | PROPOSED |
| The intake source is derived from the acting user, never supplied by the caller. A coordinator's intake is always attributed to that coordinator and site | PROPOSED (security boundary; team to confirm) |
| Changes to public content on a verified record (display name, area, practice, skills, public evidence) and to substantive fields set an update for council review. The listing choice does not. A coordinator's follow-up arrangement stays on the record until a coordinator changes it | PROPOSED |
| Public listing uses a fingerprint of the public fields. Any change to them hides the listing until the council approves the new content | PROPOSED |

Subsequent implementation: Feature 03 added simulated sign-up and access recovery; receipt-time contact matching flags a possible duplicate when intake is submitted. The notice and funnel selectors exist; their council screens belong to Feature 08.
