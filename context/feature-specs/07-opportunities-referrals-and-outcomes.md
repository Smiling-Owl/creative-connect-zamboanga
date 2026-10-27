# Feature 07 — Opportunities, Referrals, and Outcomes

## Goal

Build the opportunity lifecycle (M03, M04), the referral tracker with outcome recording (M05), and the creative's opportunities/referrals view (C03), including express-interest on P05, so that "offer → accept → confirm → attended" and its exception paths (not selected, declined, capacity full, cancellation, awaiting follow-up, outcome correction) work with accurate status everywhere.

## Context

FR 11, 12, 13 in `project-overview.md`; opportunity/referral state machines, capacity rule, and one-referral-per-pair rule in `architecture-context.md`; M03–M05, C03, P05 in `ui-context.md`. Canonical ordering: council offers → creative accepts → council confirms. Day 5.

## Requirements

1. **M03 Opportunity management:** lists by state (draft, published, closed, cancelled) with capacity used/total and referral counts per state; "New opportunity".
2. **M04 Editor and preview:** fields — title, type (workshop/clinic/support; grants/contracts are allowed as descriptive types but no payment/approval flow), fictional provider, description, eligibility, cost, capacity, date(s), deadline, location/mode, responsible owner, next step/confirmation process, contact route; validation; live preview with the P05 component; Publish, Close, Cancel (reason required; shows which referrals will be affected before confirming). Editing a published opportunity's date, location/mode, or cost shows a warning listing confirmed referrals that will need re-confirmation; reducing capacity below used is blocked with an explanation.
3. **M05 Referral tracker** (per opportunity): roster grouped by referral state; capacity bar with text ("2 of 3 places confirmed"); "Find verified creatives" by skill/interest/area (manual filters, alphabetical order, no ranking or scores; includes private verified records, never shows them as public); actions per referral: Invite (→ offered), Start review (interest → under review), Offer, Not selected (reason), Confirm place (blocked when full/closed/cancelled, with reason), Add practical instructions, Record outcome (Attended/completed, Did not attend, Awaiting follow-up), Resolve outcome-correction case; full audit trail per referral.
4. **C03 My opportunities and referrals:** list of the creative's referrals with status; selected detail shows the opportunity (P05 component), current status sentence, actions (Accept / Decline an offer; Withdraw after accepting with a reason), confirmation instructions once confirmed, cancellation reason if cancelled, recorded outcome, and "This outcome is wrong — request a correction". Copy never calls attendance paid work or income.
5. **P05 action:** verified creative "Express interest" creates one referral in `interest`; afterwards the button is replaced by the current status.
6. In-app notifications (examples) for offer, confirmation, cancellation, outcome recorded.
7. Assisted creatives do not need a personal account to question an outcome. F02 supports an online, assigned-coordinator relay of an outcome-correction request with the person's explicit agreement, required reason, referral/record ownership checks, and coordinator audit attribution. Council still decides whether to correct or uphold; the coordinator cannot edit outcomes. The assigned coordinator sees the request and resolution.

## Non-Goals

Automated matching/ranking/recommendations, provider accounts, payments or grant disbursement, calendar integrations, waitlist automation (a "full" explanation suffices), CSV export (Feature 08 optional), messaging.

## Architecture / Design Constraints

- All rules through domain functions (capacity, one referral per pair, cascades, material-edit handling).
- The opportunity-detail component is shared by P05, C03, M04 preview, and M05.
- Every referral action records actor, role, `via` (if relayed), and reason where required.

## Dependencies

Features 01, 02, 03 (P05 shell). Feature 06 provides verified records in live runs; fixtures already contain verified records, so this feature can be built in parallel with 04–06.

## Edge Cases

- Express interest twice / council invites a creative who already expressed interest → single referral.
- Accept after the opportunity was cancelled → shows cancelled, no accept.
- Confirm when full → blocked; after a confirmed referral is cancelled, a place frees up and confirm works.
- Close an opportunity with accepted-but-unconfirmed referrals → they remain accepted with a note that confirmation is no longer possible (PROPOSED: council should cancel them with a reason; show a prompt).
- Decline does not affect membership/verification (explicit copy).
- Outcome correction request on "Did not attend" → council case; resolution updates or keeps the outcome with a reason visible to the creative.
- Private verified creative referred and attending → never appears in directory; outcome counts include them.

## Testing / Verification

Unit tests for view helpers; Playwright: main-story tail (council offers clinic to Mika → accept (direct or relayed) → confirm → record attended; C01/C03/F02/M05 agree); capacity-full fixture; cancellation fixture cascades to creative view; express-interest idempotency; outcome correction loop; axe on M03/M04/M05/C03; 320 px and 1280 px layouts.

## Acceptance Criteria

- [ ] An opportunity can be drafted, previewed, published, edited, closed, and cancelled; cancelled shows the reason on P05 and in every affected referral.
- [ ] Interest, invitation, offer, acceptance, confirmation, and attendance are distinct, separately labeled states in C03, F02, and M05.
- [ ] Confirmed places never exceed capacity; the full-capacity fixture blocks confirmation with a clear message.
- [ ] Repeating interest or invitation never creates a second referral for the same creative and opportunity.
- [ ] Cancelling an opportunity changes all its active referrals to "Cancelled — see reason" and leaves completed/did-not-attend outcomes unchanged.
- [ ] Mika (private, verified) can be offered, accept, be confirmed, and be recorded as attended without ever appearing in the directory.
- [ ] A creative can request an outcome correction, and the council's resolution is visible to them.
- [ ] No screen or copy labels a referral outcome as paid work, income, or employment.
- [ ] Referral actions work by keyboard; status changes are announced; layouts work at 320 px and desktop.

## Open Questions

Actual opportunities, providers, capacity, and confirmation processes are council decisions (OPEN #8, #12); the clinic and all offers are labeled fictional.
