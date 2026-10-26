# Feature 02 — Domain State, Permissions, and Fixtures

## Goal

Implement the pure domain layer — entities, state machines, invariants, permission policy, public-profile projection, selectors/counts, deterministic references, audit events — and the fictional baseline fixtures that support both demo stories and every exception path. This is the contract all UI features consume.

## Context

Rules and state machines: `architecture-context.md` → Data Model Overview and State machines; business rules: `project-overview.md` → Business Rules. Naming/types/result shape: `code-standards.md`. Day 1–2.

## Requirements

1. `domain/types.ts`: entities and unions exactly as in the architecture (application, transfer status, visibility, opportunity, referral, account, correction request, audit event, session, demo settings).
2. Transition functions, each returning the `Result` shape and emitting audit events, for:
   - Application: save draft, submit (online → `received` with council reference; offline → `queued` with device reference), sync queue (deliver / fail / conflict by `baseVersion`), retry, resolve conflict and resubmit, start review, approve, request changes, decline, resubmit correction, request human review, reopen/uphold, substantive post-verification edit (`updatePending`) and its approval/change request.
   - Duplicate: flag (on receipt when a matching record exists — same display name + area or same follow-up contact label), resolve as not duplicate (reason) or link to existing record (preserve both histories).
   - Visibility: opt in/out, public-content review (approve/changes needed), automatic hide on public-field edit.
   - Account: invite (coordinator, online only), claim (links same record), simulated sign-up (creates record draft or raises duplicate flag if it matches), recovery states.
   - Opportunity: create draft, edit, publish, close, cancel (cascade to referrals), material-edit handling (confirmed → accepted), capacity reduction guard.
   - Referral: express interest, invite (enters `offered`), start review, offer, not selected, respond (accept/decline, with `via` coordinator when relayed), confirm (capacity/published guard), record instructions, record outcome (`completed`, `did_not_attend`, `awaiting_follow_up`), withdraw/cancel, outcome correction request and resolution.
   - Correction/withdrawal requests on profiles.
3. `permissions.ts`: `can(session, action, target)` covering the four roles and boundaries in `project-overview.md`; every transition calls it.
4. `publicProfile.ts`: allow-listed projection; only listed profiles are returned for directory queries.
5. `selectors.ts`: council queue (excludes unreceived), coordinator assigned records and device queue (by site), creative's own record/referrals/next action, directory search/filter, opportunity availability (capacity used/remaining), notifications per persona (from audit log), and synthetic counts/funnel with explicit denominators (feeds Feature 08).
6. `references.ts`: deterministic sequence-based council and device references.
7. `fixtures/baseline.ts` (all fictional, adults, labeled), relative to a fixed demo-clock origin:
   - Personas: guest; Mika (no record yet); Jun (no record yet); coordinator at Demo Site A (barangay hall); coordinator at Demo Site B (school); council administrator.
   - Records: ≥4 verified + listed profiles with varied practices/skills/areas (directory); 1 verified private; 1 under review flagged as a possible duplicate of an existing record; 1 received application suited to the decline path; 1 Site A assisted record with changes requested and a queued correction whose `baseVersion` is stale (conflict example); ≥1 Site B record (coordinator boundary).
   - Opportunities: the **Portfolio Feedback Clinic (fictional)** published with spare capacity; one published opportunity already at full capacity; one published opportunity with active referrals suitable for the cancellation demo; one draft; one closed with outcomes covering completed, did not attend, and awaiting follow-up.
   - 3–4 guidance examples (formalization, IP basics, support resources) with source label and last-reviewed date, marked as examples.
8. Wire all actions into the store from Feature 01 (reducer cases calling domain functions).

## Non-Goals

UI views. Ranking, scoring, or automated matching of creatives. Real data, real place/partner names. Any persistence beyond Feature 01's mechanism.

## Architecture / Design Constraints

- No React, storage, or `Date.now()` in `domain/`; time and settings are parameters.
- Idempotency: repeating submit/retry/invite/interest returns the existing result (`ok: true`, no new entity) or a clear `ok: false` code — never a duplicate.
- Labels are not part of the domain; provide the label map (Status Vocabulary) in a UI-side module.

## Dependencies

Feature 01 scaffold (build + Vitest running). Store wiring needs Feature 01's store provider.

## Edge Cases

- Submit while offline twice → one queue item. Retry after delivery → no-op.
- Sync with fail-next-send on → item `failed`, attempts incremented, setting consumed (next attempt can succeed).
- Council tries to start review on an item without `receivedAt` → rejected (and not even listed).
- Approve while duplicate unresolved → rejected with a specific message.
- Confirm when capacity used = capacity → rejected; confirm on closed/cancelled → rejected.
- Interest twice, or invitation after interest → returns the single existing referral.
- Cancel opportunity with referrals in mixed states → only active ones become `cancelled`; terminal outcomes untouched.
- Coordinator acting on another site's record → rejected by policy.
- Opt-in before verification → stored as preference; not listed until verified and public content approved.

## Testing / Verification

Test-first Vitest suites per module covering every transition, rejection code, idempotency case, cascade, policy boundary, projection allow-list, and count consistency (e.g., funnel stages sum correctly; directory count equals listed profiles; capacity used equals confirmed-type referrals). Fixture self-test: baseline passes all invariants.

## Acceptance Criteria

- [ ] Every transition and edge case above has a passing unit test; `npm test`, `typecheck`, and `lint` pass.
- [ ] A test proves the public projection of every fixture record contains no private field (contact/follow-up details, non-approved evidence, internal notes, review history, coordinator/site, references, legal name when different from display name).
- [ ] A test proves council selectors never return a draft or queued application.
- [ ] A test proves no sequence of repeated submit/retry/interest/invite actions creates duplicate records, applications, queue items, or referrals.
- [ ] A test proves confirmed allocations never exceed capacity under any action order in the suite.
- [ ] Baseline fixtures satisfy all invariants and contain only fictional, labeled people, sites, providers, and opportunities.
- [ ] Every store action dispatches to a domain function; no business rule exists outside `domain/`.

## Open Questions

Duplicate-matching heuristic is a demo assumption (name+area or contact label); the real rule is a council decision (OPEN, council).
