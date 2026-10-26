# Project Overview

Working product name: **Creative Connect Zamboanga**. Prepared 2026-10-23 from the team's planning materials (see Source Provenance). This file is the canonical product brief for the first release; it contains no implementation progress.

Decision markers used throughout: **CONFIRMED** (stated in the client brief or approved by the team), **PROPOSED** (recommended, not yet approved by the team or council), **OPEN** (unresolved; see the list at the end).

## Goal

Build, in about one week, a coherent, demonstrable **browser-based clickable prototype** (CONFIRMED) of a council onboarding, directory, and opportunity-referral service for the Zamboanga City Creative Council (ZCCC) reverse-pitch ideathon challenge. It must make the journey "disconnected creative → assisted registration → council review → private or public profile → support referral → documented outcome" understandable to ideathon judges and potential council users, without explanatory intervention from the developer.

The prototype uses fictional data and in-browser demo state. It does not collect real data, process credentials, send messages, connect to council systems, or establish partners.

## Problem Being Solved

Official challenge (CONFIRMED, client brief): *How might we design a hybrid digital and grassroots onboarding platform, leveraging Zamboanga City's barangay networks and academic institutions, to distribute high-value incentives (such as business permit guidance, IP protection, and investor matching) and seamlessly register hidden creative talent into a centralized, actionable database?*

Client-reported conditions (authoritative statements of the client's problem, not independent measurements): the creative sector is fragmented, informal and undocumented; creatives rely on word of mouth and fragmented social media; the council lacks a dynamic roster and cannot reach creatives across the city's barangays; permit/IP friction discourages formalization; there is no formal bridge from schools to studios; connectivity is inconsistent, so offline-to-online capture is required; the solution must use barangay/SK halls and universities as community hubs.

Problem the team chose to solve first (PROPOSED hypothesis, untested): creatives outside the council's network may not know how to join, see no concrete benefit, or need help registering; the council therefore lacks current, usable records. Selected approach: **benefit-first onboarding delivered through assisted community outreach**, with self-service as an alternative route and the directory as a by-product of serving people.

Priority domain for initial pilots (CONFIRMED): design and visual creative services — graphic design, visual arts, digital content, film/video production, crafts. The council has nine domains in total; the full taxonomy is OPEN.

## Users / Actors

| User | Prototype capabilities | Permission boundary to demonstrate |
|---|---|---|
| Guest / studio / opportunity provider | Read program and guidance, browse directory and opportunities, view details, see council contact route | Approved public information only; never private contact, evidence, application, or internal records |
| Creative | Register, track review, correct information, manage visibility, express interest / respond to referrals, view outcome | Own profile, own application, own referrals |
| Community coordinator (barangay/SK/school) | Assist intake, handle assigned drafts and device queue, help with corrections and follow-up, initiate account claim | Assigned cohort/site records only; cannot approve verification or grant roles |
| Council administrator | Review cases, manage directory and opportunities, route referrals, record outcomes, see operational counts | Explicitly assigned council access; every decision records actor and reason |

Studios and providers have no signed-in portal; council staff manage their opportunities and referrals (CONFIRMED). Personal accounts are optional for assisted creatives; a later claim links the person to the **same** record and never automatically creates a duplicate (CONFIRMED).

Demo personas (CONFIRMED that they are fictional adults; names PROPOSED): **Mika**, an adult illustrator with work samples but no online portfolio (main story); a self-service creative such as **Jun**, an adult video editor (alternate story); one community coordinator; one council administrator; a guest. All sites, providers, opportunities and outcomes are fictional and labeled so.

## Requirements

Functional requirements (CONFIRMED unless marked):

1. **Program discovery** — explain who the service is for, benefits, limits (no guaranteed work, no permit/certification), and how to get registration assistance. Starting registration from an opportunity preserves that opportunity as the return destination.
2. **Access simulation** — creative sign-up/sign-in, invited staff access, contact verification, invitation claim of an existing record, and recovery states (including expired link and help route). State clearly that no real credentials are processed.
3. **Shared intake** — one workflow in self-service and coordinator-assisted modes; drafts; name/display name, creative practice, skills, broad area, interests, follow-up arrangement, work evidence. Never require a polished online portfolio or business permit. Allow coordinator-mediated follow-up when the person has no device/contact channel. Assisted mode records intake source, site and assisting coordinator; assistance is not substitute consent.
4. **Privacy choices** — readable information-use explanation, plus a separate optional public-directory choice that starts **off**. Refusing public listing never blocks support. Private contact, evidence, and internal notes never appear in public previews.
5. **Submission status** — distinguish draft, queued on device (simulated), received (council receipt), and under review. Show a reference and the next action. Coordinator attribution and site survive handoffs.
6. **Offline demonstration** — queued, failed/retry, received, and possible-conflict states with an explicit simulated reconnection. No review before simulated receipt; no duplicates from repeated submit or retry.
7. **Council review** — evidence and contact/follow-up checks, duplicate warning, approve / request changes / decline with a reason, review history, correction and human-review paths. Never rank or score artistic quality automatically.
8. **Directory** — search and filter by skill/practice and broad area; lists only verified, opted-in, publishable profiles. Public profile shows permitted work evidence and a council-mediated inquiry route.
9. **Profile maintenance** — edit, public preview, visibility withdrawal, last-updated and refresh prompt, correction or withdrawal request. Indicate which changes require renewed review. Turning visibility off removes the public listing without affecting eligibility for support.
10. **Guidance** — public, council-curated examples on formalization, IP, and support resources, each showing source and last-reviewed date. Guidance is not legal advice, permit issuance, or certification.
11. **Opportunity management** — draft, preview, publish, edit, close, cancel; fields: provider, eligibility, cost, capacity, dates/deadline, delivery location/mode, responsible owner, next step.
12. **Referrals** — at most one active referral per creative/opportunity; expression of interest or council invitation; manual suitability review; offer; accept/decline; capacity confirmation; practical instructions; cancellation states. No overbooking, no duplicate interest.
13. **Outcomes** — distinguish accepted, confirmed, attended/completed, did not attend, cancelled, and awaiting follow-up. Creatives can request correction. Never label workshop attendance as paid work or income.
14. **Workspaces** — creatives see their next action; coordinators see assigned cases and queue; council sees pending cases, records, opportunities, referrals, and basic coverage/funnel counts. Notifications are in-app examples only; no SMS/email/Messenger delivery is implied.
15. **Reporting** — illustrative onboarding, verification, and referral counts with consistent denominators, labeled synthetic. CSV export is optional for this release (PROPOSED: omit unless time remains); authorized export is a future MVP requirement.

### Screen coverage (CONFIRMED)

Twenty planned views (variants allowed, not 20 unrelated templates); IDs are retained for traceability. Detailed contents are in `ui-context.md`.

| IDs | Views |
|---|---|
| P01–P06 | Welcome; creative directory; public creative profile; opportunities; opportunity details; support/guidance |
| A01–A02 | Account access/invitation claim; access recovery |
| R01–R02 | Creative intake; review/privacy choices/submission |
| C01–C03 | Creative home/application status; profile/preferences; opportunities/referrals and selected detail |
| F01–F02 | Coordinator workspace/queue; assisted record/follow-up |
| M01–M05 | Council overview/review queue; application review; opportunity management; opportunity editor/preview; referral tracker/outcome detail |

Interactive depth priority (CONFIRMED): intake, correction/review, private vs public profile, offline simulation, referral-to-outcome. Guidance, reports, and access/recovery are representative and clearly simulated. No dead-end controls: every control performs its local action or is explicitly marked unavailable in the prototype.

## Major Features

1. Demo shell: role-aware navigation, demo controls (role switch, connectivity, reset), persistent fictional demo state.
2. Public discovery: welcome, directory, public profile, opportunities, guidance.
3. Simulated access: sign-up/sign-in, staff invitation, record claim, recovery.
4. Shared intake and submission with privacy choices (self-service and assisted).
5. Coordinator workspace with simulated offline queue, retry and conflict handling.
6. Council review with duplicate handling, correction loop, decline/human review.
7. Profile maintenance and public visibility control.
8. Opportunity lifecycle and referral-to-outcome tracking with capacity rules.
9. Council overview counts, synthetic funnel reporting, in-app notifications.
10. Demo packaging: script, reset, run instructions, known limitations, local fallback.

## Core Workflows

### Main demo story (CONFIRMED)

Mika hears about a fictional portfolio-feedback clinic → coordinator helps with intake → Mika keeps the public listing off → coordinator's device is offline, record queues, simulated reconnection delivers it → council requests clarification → Mika/coordinator corrects through the same record → council verifies → council offers the clinic referral → Mika accepts → council confirms capacity/arrangements → attendance recorded. Shows that a private verified creative still receives support.

### Alternate demo story (CONFIRMED)

Self-service creative registers → council approves → creative opts into the directory → guest discovers the profile → council contact route is shown. Uses the same underlying records across role views.

### Exception paths that must be understandable (CONFIRMED)

Correction requested, decline (with human-review request), private visibility, duplicate warning, send failure and retry, capacity full, opportunity cancellation. Also: no online portfolio (assisted description accepted), no personal device (coordinator-mediated follow-up), disputed outcome (correction request).

## Business Rules

State rules (CONFIRMED); exact state names live in `architecture-context.md`.

- **Application:** draft → queued (if offline) → received → under review → verified. Review can request changes or decline. A correction returns the application to review. Duplicate/conflict flags can never silently become verification.
- **Public visibility:** an independent opt-in/out, subject to review of public content. Verification alone never publishes. Directory = verified ∧ opted-in ∧ public content approved.
- **Opportunity:** draft → published → closed; a published offer can be cancelled, which updates affected referrals.
- **Referral:** interest → council review → offered or not selected; a council invitation enters at offered; offered → accepted or declined; accepted → confirmed after allocation; confirmed → attended/completed or did not attend. Cancelled and awaiting-follow-up states remain explicit.
- **Canonical ordering:** council offers → creative accepts → council confirms capacity/arrangements. Staff may check suitability/capacity before an offer, but final confirmation is a distinct recorded step.
- An invitation or interest never reserves a place; a full or closed opportunity cannot accept a new confirmed allocation.
- Relevant edits invalidate affected downstream demo decisions. Back navigation preserves drafts; reset returns to a known starting state.
- All counts, visibility, queues, and outcomes agree across role views.
- Account ≠ verification ≠ business registration. "Verified" means agreed membership checks passed; it never certifies artistic quality, legal compliance, copyright ownership, or guaranteed work.
- Coordinators relay acceptance/decline with actor and source recorded; they never silently act as the creative. Council confirms allocation and outcomes.

PROPOSED rule details (pending team approval; implementers follow them unless changed):

- Public fields are reviewed as part of application review. Opting in later with already-approved public content lists immediately; editing public-facing fields after approval hides the listing until the council approves the change.
- Substantive edits after verification (practice, skills, evidence) return the changed information to council review while the record stays verified and eligible for support; contact preference and visibility changes do not need review.
- A human-review request on a declined application opens a council case; the council either reopens review or upholds the decline with a reason.
- Expressing interest requires a verified record; unverified creatives see why and what to do next.
- Material edits to a published opportunity (date, location/mode, cost) return confirmed referrals to accepted pending re-confirmation; reducing capacity below the number already confirmed is blocked.

## Non-Goals

Out of scope for this release (CONFIRMED): artisan e-commerce or CIIC provenance certification, payments/escrow, marketplace checkout, direct chat, buyer/provider accounts, AI matching or ranking, social feed, automated legal/IP certification, native apps, high-resolution portfolio hosting, complex analytics, live government-system integrations, automated messaging, production data collection, a production backend/database, and real authentication.

Do not import requirements from the CIIC (Zamboanga del Norte artisan commerce), tourism, water-delivery, or healthcare challenges in the research workspace. Do not choose a production schema/provider or start a real-data pilot because future requirements are listed here.

Do not add a deck, video, translations, or published hosting automatically; those are separate team decisions.

## Constraints

- **Time** (CONFIRMED): about one week. Recommended sequence (not a staffing estimate; reduce supporting-view depth before cutting the core journey):

| Day | Focus | Exit condition |
|---|---|---|
| 1 | Scope, flows, fictional fixtures, wireframes | Main journey and branches mapped; open decisions documented |
| 2 | Shared design and public/access/intake views | Responsive base and usable registration path |
| 3 | Creative workspace and council review | Submission, correction and verification journey works |
| 4 | Coordinator workspace and offline simulation | Assisted entry and retry/receipt states work coherently |
| 5 | Directory, opportunities and referrals | Both demo stories complete through outcome |
| 6 | User feedback if available; functional/accessibility/responsive checks | Material defects fixed; data and status agree |
| 7 | Rehearsal, freeze, packaging and fallback | Repeatable presentation with known limits and reset |

- **Truthfulness:** no fabricated real credentials, messages, personal records, partner commitments, or economic outcomes. Label demo metrics synthetic. Participant feedback, if gathered, is labeled with its sample size and limits.
- **Identity:** represent a *proposed* council service; no implied official endorsement and no unapproved council branding (logos, seals). Use the working name.
- **Language:** English is the provisional demo language. Do not invent translated cultural or official terminology; confirm local language needs before any translation.
- **Age:** fictional adult participants only until age eligibility is decided.

## Integrations

None for this release. No external APIs, analytics, messaging, maps, fonts, or CDNs are required. Guidance cards may *name* a public authority as where authoritative information lives (PROPOSED; see Open Questions), but the prototype does not fetch or reproduce third-party content.

## Non-Functional Requirements

- Mobile-first intake and coordinator use; desktop-friendly council review. Verified at 320 px, 360 px, tablet, and desktop widths without clipped controls or horizontal overflow.
- Plain labels, clear next actions, visible status text (never color alone), readable contrast (WCAG 2.2 AA target), full keyboard operation, preserved and visible focus, labeled inputs, specific error recovery, ~44 px touch targets.
- Lightweight: no unnecessary media, no web-font download, no decorative motion; respect reduced-motion. Low connectivity is shown through explicit simulation controls.
- Frontend permission checks represent the boundaries only; the prototype must not claim they are real security.

## Future Operational Requirements (retained, not in this release)

Before any real deployment: server-side role and record permissions; secure account claiming; data minimization and council-approved privacy arrangements (Data Privacy Act); protected uploads; approved retention/correction/deletion; cultural/portfolio permission and takedown; audit trails; encrypted transport and secure device storage; safe offline retries/conflicts and device-loss response; backups with a restore check; monitored failures and support ownership; authorized CSV export. The prototype does not establish compliance or satisfy these controls.

Human commitments software cannot supply (to confirm with the council): one accountable product owner/data steward; verification rules and appeal authority; named site coordinators; actual opportunities and providers; staff time, devices and connectivity; data-sharing authority; hosting/support funding; maintenance and handover.

Later pilot measures (not this release): onboarding completion, verified/current profiles, time/cost per review, active partner coverage, guidance usage, referrals, confirmations, completed support, and eventually evidenced paid engagements — with baselines and denominators. The official pilot target is 50–100 verified creatives/MSMEs across 3–5 barangays and at least two academic institutions in 6–12 months; the transcript's "5,200" is a transcription error and must not be used.

## Definition of Done

The release is done when all of the following are observed and documented in `progress-tracker.md`:

- Both demo stories complete without explanatory intervention from the developer.
- Correction, decline, private visibility, duplicate warning, retry, capacity-full, and cancellation paths are understandable.
- No public view exposes private contact, evidence, or internal notes (including via direct URL).
- A queued application cannot be reviewed before simulated receipt.
- Repeat submissions, invitations, and interest actions do not create duplicate records.
- Attendance is separate from invitation, acceptance, and confirmation, and is reflected across views.
- Role restrictions are represented consistently, without claiming frontend routing is real security.
- No real credentials, messages, personal records, partner commitments, or economic outcomes are fabricated.
- Browser interactions, focus, narrow-screen layouts, and reset are checked; test results and remaining gaps are documented.
- A repeatable demo package exists: reset control, run instructions, known limitations, short demo script, and a working local fallback. Publishing to a host is a separate, authorized action.

## Open Questions

Team (do not block building; affect packaging and scope trimming):

1. Exact event date, demo duration, and organizer requirements.
2. Team size, skills, and ownership of features.
3. Hosting/access method for judges and budget (blocks publishing only; local fallback is required regardless).
4. Existing branding/assets, if any.
5. Whether a deck or video is also required (not added automatically).
6. Guidance content: may example cards name and link real public authorities (e.g., the IP office), or should all sources be placeholders?

Council (prototype proceeds with explicit fictional assumptions):

7. Representative/user access for feedback.
8. Actual pilot sites, coordinators, opportunities, and providers.
9. Definition of "verified", evidence rules, and the complete domain taxonomy.
10. Adult/minor eligibility.
11. Required languages, devices, and connectivity at sites.
12. Real incentives available and who funds them.
13. Staff allocation for review and follow-up.
14. Data, verification, and privacy authority (controller/data steward).
15. Commercial and maintenance path (contracting entity, budget).

## Source Provenance

Precedence when sources conflict: (1) the team's latest explicit decisions, recorded in these context files; (2) the official client brief `Zamboanga City Creative Council.md`; (3) the presentation transcript (conflicts resolved against the brief); (4) `synthesized-notes.md`, `preliminary-notes.md`, `research.json` (analysis, last reviewed 2026-08-20, not independently current); (5) `IDEATHON CONCEPT AND JOURNEY.md` and `MVP USER FLOWS AND SCREENS.md` (proposed product and flow baseline); (6) `PROJECT BOOTSTRAP.md` (release framing). These live in the team's separate research workspace (`industries/creatives/` of the `hermosa` research repository), not in this repository; everything implementation needs has been carried into `context/`. An earlier exploratory nine-step browser walkthrough of the Mika story exists outside this repository; it is not a dependency or a code base to extend.
