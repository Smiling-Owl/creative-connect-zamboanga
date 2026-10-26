# Feature 06 — Council Review, Corrections, and Profile Maintenance

## Goal

Build the council review queue (M01 queue part) and application review (M02) with duplicate handling and reasoned decisions, and the creative's profile and preferences (C02) with public preview, visibility control, renewed-review indicators, and correction/withdrawal requests.

## Context

FR 4, 7, 8, 9 in `project-overview.md`; application/visibility state machines in `architecture-context.md`; M01/M02/C02 in `ui-context.md`. Council views are designed desktop-first (1280 px) and must still work at 320 px. Day 3 (review/correction), Day 5 (visibility/directory agreement).

## Requirements

1. **M01 review queue:** tabs — New (received), Resubmitted, Under review, Cases (human review, profile correction, withdrawal, outcome correction routed from Feature 07); each row shows reference, display name, source (self-service/assisted + site), age, flags (possible duplicate, update pending), overdue marker (PROPOSED threshold, e.g., older than 5 demo days); record search across received records. Queued/draft items never appear.
2. **M02 application review:** full application (all fields incl. private ones — council only), evidence list with public-approval flags, follow-up arrangement check, public-content preview (P03 component), review history, duplicate panel showing the suspected match side by side with "Not a duplicate" (reason) or "Link to existing record" (preserves histories); actions: Start review, Approve, Request changes (reason, which fields), Decline (reason). Approve disabled with an explanation while a duplicate is unresolved. Public-content approval is part of approval when the person opted in; council can approve membership while marking public content "changes needed".
3. **Cases:** human-review request on a decline → reopen review or uphold with reason; profile correction and withdrawal requests → resolve with note (withdrawal hides listing immediately and records the request; deletion/retention is out of scope and stated so); update-pending review on verified records → approve or request changes.
4. **C02 Profile and preferences:** edit fields with markers showing which changes need council review (practice, skills, evidence, public fields) and which do not (contact preference, listing on/off); public preview identical to P03; listing toggle with immediate effect when turning off and clear "pending review" state when turning on with unapproved content; last updated and a refresh prompt when older than a demo threshold (PROPOSED: 90 demo days, shown on a fixture); "Request a correction" and "Request withdrawal" creating council cases.
5. Coordinator equivalent for assigned records uses F02 (Feature 05); C02 is creative-only.

## Non-Goals

Automated scoring, ranking, or quality assessment of evidence; bulk actions; staff role management; real deletion/retention handling; image moderation.

## Architecture / Design Constraints

- Every decision requires a non-empty reason (except approve) and records the council actor; history is shown in C01, F02, and M02 from the same audit events.
- Listing is computed by the domain rule only; C02 and P02 must agree at all times.
- No copy implies verification certifies quality, legality, or IP ownership.

## Dependencies

Features 01, 02, 04 (submissions and correction path). Feature 05 for assisted/queued records in full runs.

## Edge Cases

- Approve attempt with unresolved duplicate → blocked with message.
- Request changes then the creative opts out of listing before resubmitting → still reviewable; listing stays off.
- Verified private creative opts in → listing pending public-content approval unless the same content was already approved (then listed immediately).
- Listed creative edits skills → listing hidden until approved, record remains verified and eligible.
- Withdrawal request on a listed profile → unlisted immediately; record remains for council handling.
- Linking duplicates where one has referrals → referrals and histories preserved on the kept record.

## Testing / Verification

Unit tests for any review view-model helpers; Playwright: main-story correction loop (request changes → coordinator/creative corrects → resubmitted tab → approve); decline → human review → reopen; duplicate fixture resolution; alternate story opt-in → directory listing; opt-out removes listing from P02 instantly; axe on M01/M02/C02; council views at 320 px and 1280 px.

## Acceptance Criteria

- [ ] M01 lists only received applications; counts match Feature 02 selectors and F01/C01 statuses.
- [ ] Approve is impossible while a duplicate flag is unresolved, and the reason is shown.
- [ ] Request changes / decline cannot be submitted without a reason; the reason appears verbatim in C01 and F02.
- [ ] A corrected resubmission appears in the Resubmitted tab with its full history and the same reference.
- [ ] A verified creative with listing off never appears in P02/P03 yet remains selectable for referrals in M05.
- [ ] Turning listing off in C02 removes the profile from P02 immediately; turning it on with approved content lists it; with changed content shows "Listing pending review".
- [ ] C02 marks which edits require renewed review; such edits set "Update waiting for council review" without revoking verification.
- [ ] Correction and withdrawal requests create council cases that can be resolved with a note visible to the creative.
- [ ] Review actions are keyboard operable; dialogs trap/restore focus; no overflow at 320 px.

## Open Questions

Definition of "verified", evidence rules, overdue threshold, refresh interval, and appeal authority are council decisions (OPEN #9, #14); demo values are labeled as assumptions.
