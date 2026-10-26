# Feature 05 — Coordinator Workspace and Offline Simulation

## Goal

Build the coordinator workspace (F01) and assisted record view (F02) with a convincing, honest simulation of low connectivity: queued, sending, failed/retry, delivered (received), and possible-conflict states, with no review before receipt and no duplicates — plus coordinator-mediated follow-up, relayed responses, and account invitations.

## Context

FR 3, 5, 6, 14 in `project-overview.md`; queue/transfer model and conflict rule in `architecture-context.md`; F01/F02 contents in `ui-context.md`. Main story beats: coordinator intake, offline queue, simulated reconnection, correction relay, acceptance relay. Day 4.

## Requirements

1. **F01 Workspace:** connection status (from demo controls) shown in plain language; assigned records for the coordinator's site with status badges; drafts; "Search existing records before adding" (assigned-site search; when offline, shows "Duplicate check pending — will run when received"); "Add creative" starts assisted intake (Feature 04 components in assisted mode).
2. **Device queue panel:** each item shows device reference, person, kind (new application / correction), transfer status, attempts, last error, and the statement "The council has not received this" until delivered. Actions: "Sync now" (online only), per-item "Retry" for failed items. When online, a sync delivers waiting items one by one with a visible "Sending…" step; "Next send fails" demo setting makes the next attempt fail.
3. **Conflict handling:** an item whose `baseVersion` is older than the council record shows "Needs attention — the council record changed since this was queued", a side-by-side summary of what changed, and "Review and resubmit" (updates the same record; no new application) or "Discard queued change".
4. **F02 Assisted record:** minimal assigned profile, source and permission readback (what the person chose), application and referral timeline, current council request (e.g., clarification reason) with "Help correct" (opens intake on the same record), follow-up arrangement and a "Record follow-up note" action, "Relay response" for offers (accept/decline on behalf with actor = coordinator, source recorded, and a confirmation that the person agreed), and "Send account invitation" (online only; produces a simulated invitation code usable in A01 claim).
5. Coordinator boundary: records from another site are not listed; direct URL shows the access-not-available panel; no approve/decline/role-grant controls exist in coordinator views.
6. Notifications for the coordinator (in-app examples): receipt, changes requested, offer awaiting response, confirmation.

## Non-Goals

Real offline storage/service workers, background sync, encryption, device management, real invitations/messages, coordinator team management.

## Architecture / Design Constraints

- Connectivity and failure are demo settings, not real network detection.
- Delivery assigns the council reference and `receivedAt`; before that, council selectors cannot see the item (Feature 02 invariant).
- Retry and repeated sync are idempotent; delivered items cannot be re-sent.
- Relayed actions always record `via` coordinator and are shown as such in every timeline.

## Dependencies

Features 01, 02, 04 (assisted mode of intake). Feature 06 for council-side effects in end-to-end runs (unit/e2e can dispatch council actions directly until then).

## Edge Cases

- Toggle offline mid-"Sending…" → item returns to waiting (not lost, not duplicated).
- Retry while still offline → explanation, no state change.
- Two corrections queued for the same record → combined into one pending item (PROPOSED) or the second replaces the first; never two deliveries.
- Coordinator switches persona to council and back → queue state unchanged.
- Invitation attempt while offline → "Requires a connection" message.
- Person without device: follow-up arrangement coordinator-mediated; no personal contact displayed anywhere public.

## Testing / Verification

Playwright main-story segment: offline intake → queued (council queue count unchanged) → fail-next-send → sync → failed → retry → received (council queue +1, reference shown in both F01 and M01). Conflict fixture resolution path. Boundary checks for the Site B record. Unit tests for any queue helpers. 360 px layout and keyboard operation of queue actions; axe on F01/F02 states.

## Acceptance Criteria

- [ ] An offline assisted submission shows "Queued on this device — the council has not received it" and does not appear in any council view or count.
- [ ] With "Next send fails" on, sync shows a failed item with a working Retry; retry delivers exactly one application (counts increase by one, not two).
- [ ] After delivery, F01, C01 (if the person has an account), and M01 all show the same reference and "Received by the council".
- [ ] The conflict fixture can be resolved by resubmitting the same record; record and application counts are unchanged.
- [ ] Relayed accept/decline is recorded with the coordinator as `via` and appears so in C03, F02, and M05 timelines.
- [ ] Site B coordinator cannot see Site A records in lists or via direct URL, and no coordinator view offers approve/decline.
- [ ] A sent invitation can be claimed in A01, linking to the same record.
- [ ] Queue actions are keyboard operable, status changes are announced, and layouts work at 320/360 px.

## Open Questions

Real device, connectivity, and site conditions are unknown (council OPEN #8, #11); the simulation must not imply tested production offline capability.
