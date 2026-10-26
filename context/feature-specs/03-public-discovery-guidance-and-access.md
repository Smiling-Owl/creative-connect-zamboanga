# Feature 03 — Public Discovery, Guidance, and Simulated Access

## Goal

Build the public views (P01–P06) and the simulated access views (A01–A02) so a guest can understand the service, find listed creatives and opportunities, reach the council contact route, and start registration — and so account states (sign-up, sign-in, verification, invitation claim, staff invitation, recovery) are represented honestly.

## Context

Screen contents: `ui-context.md` → Screen map. Rules: listing rule, public projection, account states (`architecture-context.md`). FR 1, 2, 8, 10 in `project-overview.md`. Day 2 (public/access) and Day 5 (directory completeness).

## Requirements

1. **P01 Welcome:** who the service is for, benefits, explicit limits (not a permit, not certification, no guaranteed work, verification is not a quality rating), how joining works (self-service or with a coordinator), entry points to directory, opportunities, guidance, join, and "get help registering" (shows how to reach a coordinator — fictional sites).
2. **P02 Directory:** search by text, filter by practice/skill and broad area, result count, empty state with clear-filters, only listed profiles via the public projection.
3. **P03 Public profile:** projection fields only; "Ask the council about this creative" shows the labeled placeholder council contact route; unknown or unlisted profile id → "This profile is not publicly listed" (no data leak, same message for private and nonexistent).
4. **P04 Opportunities:** published opportunities with type, availability (capacity remaining or "Full"), deadline, eligibility summary; filters; closed/cancelled ones shown as such only where referenced (PROPOSED: a "Show closed and cancelled" toggle).
5. **P05 Opportunity details:** shared opportunity-detail component (reused by C03/M05/M04 preview) plus a role-aware action area: guest → "Register to take part" (carries the opportunity id as return destination) or "Get help registering"; unverified creative → reason and next step; verified creative → "Express interest" (action implemented in Feature 07; until then, the button dispatches the domain action from Feature 02); existing referral → its status; full/closed/cancelled → explanation.
6. **P06 Guidance:** example cards with source label, last-reviewed date, and the disclaimer; reachable without an account.
7. **A01 Access** variants: sign-in (persona buttons + simulation notice), creative sign-up (fictional prefilled contact, simulated verification code step), claim existing record via invitation code (links the same record; shows the record it links to), staff invitation acceptance (coordinator/council persona). After sign-up started from an opportunity, the user continues to intake and the opportunity is preserved for after submission.
8. **A02 Recovery:** recovery through verified route (simulated "a code would be sent" with no sending), expired-link state with "request a new link", and a help route via coordinator/council for people without access to their channel.

## Non-Goals

Real authentication, password handling, email/SMS sending, in-app inquiry inbox, buyer/provider accounts, ranking or "featured" creatives, maps.

## Architecture / Design Constraints

- Public views read creative data only through `publicProfile.ts` selectors.
- Simulation notice ("Simulated — no credentials are processed or sent") visible on every A01/A02 variant.
- No free-text password fields; any typed values remain in the store only.
- Guidance cards must not reproduce third-party content; whether to name/link real authorities is OPEN — default to neutral source labels such as "Example source — to be confirmed by the council".

## Dependencies

Feature 01 (shell, routes), Feature 02 (selectors, projection, account transitions, fixtures).

## Edge Cases

- Directory filters producing no results; search with leading/trailing spaces; very long names wrapping at 320 px.
- Profile that becomes unlisted (opt-out) while a guest has its URL open/bookmarked → not-listed message after navigation/reload.
- Opportunity deadline passed or capacity full → no register/interest CTA, explanation instead.
- Claim code for a record that already has an active account → explains it is already claimed and offers recovery; never creates a second record.
- Sign-up whose fictional contact matches an existing assisted record → proceeds but council sees a duplicate flag (Feature 06 handles review).

## Testing / Verification

Playwright: guest browse → filter → profile → council route; register-from-opportunity preserves destination; claim links to existing record (record count unchanged); direct URL to a private record's profile shows not-listed; axe on each view; 320 px overflow check.

## Acceptance Criteria

- [ ] A guest can explain from P01 what joining offers and what it does not guarantee (copy contains the explicit limits).
- [ ] Directory lists exactly the profiles that satisfy verified ∧ opted-in ∧ public-content approved, and the count matches Feature 02's selector.
- [ ] No P0x page or DOM contains any private field of any fixture record (asserted in e2e by searching rendered text for fixture private values).
- [ ] Visiting `#/directory/<private-record-id>` shows the not-listed message with no record data.
- [ ] Starting registration from the clinic's P05 returns the user to that opportunity's context after submitting the application.
- [ ] Claiming an invitation links to the existing record; total record count is unchanged.
- [ ] Each A01/A02 variant shows the simulation notice; no real credential is requested.
- [ ] Every view passes axe (no serious/critical), works by keyboard, and has no horizontal overflow at 320 px.

## Open Questions

Guidance sources: may cards name/link real public authorities? (Team, OPEN #6.) Council contact route text (council, OPEN).
