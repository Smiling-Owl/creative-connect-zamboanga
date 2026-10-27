# Feature 08 — Council Overview, Synthetic Reporting, and Notifications

## Goal

Complete the council overview (M01 dashboard area) with basic operational, coverage, and funnel counts that are derived from live demo state with consistent denominators, and unify in-app notification examples across roles.

## Context

FR 14, 15 in `project-overview.md`; selectors and invariant "counts are derived" in `architecture-context.md`. Reporting is representative depth, not a priority area. Day 5–6.

## Requirements

1. **M01 overview panel** (above or beside the review queue, not a second dashboard): pending reviews (new/resubmitted/cases/overdue), records by status, listed vs private verified, opportunities by state, referrals by state, recent activity (from audit log, last ~10).
2. **Funnel and coverage (synthetic):** received-only onboarding funnel (received → verified), verification outcomes (verified / changes requested / declined / pending), referral funnel (interest or invitation → offered → accepted → confirmed → attended/completed; plus not selected, declined, cancelled, did not attend, awaiting follow-up), and coverage by site and by intake source. Council panels explain that device-only starts/submissions are not yet received and are excluded; only coordinators see their own device counts. Each figure states its denominator and time window (e.g., "7 of 12 received applications (since demo start)"). A visible label: "Synthetic demo data — not real results". Distinguish current-state totals from cumulative funnel stages derived from history; completion after confirmation must not erase the historical confirmed stage.
3. Counts update immediately after any action in any role and match the numbers implied by other views.
4. **Notifications:** a consistent in-app notification list per persona (creative home, coordinator workspace, council overview), derived from audit events relevant to that persona, each labeled "In-app example — no SMS or email is sent".
5. CSV export: OPTIONAL (only if time remains). If built, it exports synthetic counts only (no personal fields) and is labeled; if not built, no export control appears.

## Non-Goals

Charts library, complex analytics, date-range pickers, real export of personal data, livelihood/income metrics, scheduled reports.

## Architecture / Design Constraints

- All numbers come from `domain/selectors.ts`; no hardcoded or separately cached counts.
- Use accessible tables/lists with text; simple CSS bars are allowed only with the number shown as text.
- Never present counts as evidence of impact or income.

## Dependencies

Features 02, 06, 07 (meaningful states); can start with fixtures after Feature 02.

## Edge Cases

- Zero denominators → show "—" with "no records yet" rather than 0% or NaN.
- Reset → counts return to baseline values.
- Records linked as duplicates are counted once.
- Queued (unreceived) items are excluded from council counts but visible in coordinator counts as "on devices, not received".

## Testing / Verification

Unit tests for selector math and denominators; Playwright cross-role consistency check after the main story (e.g., verified count, referrals confirmed, attended) across M01, F01, and C01/C03; axe and 320 px check for M01.

## Acceptance Criteria

- [ ] Every count on M01 shows its denominator/time window, and the panel carries the synthetic-data label.
- [ ] After completing the main story, M01's verified total and cumulative confirmed/attended funnel stages each increase by exactly one from baseline and agree with other views. Current-state confirmed totals are shown separately and can decrease when a confirmed referral becomes attended.
- [ ] Queued items are not counted as received anywhere on the council side.
- [ ] Zero-denominator cases render without NaN/Infinity.
- [ ] Each persona's notification list shows only events relevant to them and the "no SMS or email" label.
- [ ] No export control is shown unless export is implemented; any export contains no personal fields.

## Open Questions

Which counts the council actually needs for decisions (council OPEN); demo metrics are illustrative.
