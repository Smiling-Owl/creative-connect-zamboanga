# Feature 04 — Shared Intake, Privacy Choices, and Application Status

## Goal

Build the one intake workflow (R01 → R02) used in self-service and coordinator-assisted modes, with drafts, privacy choices, and truthful submission results, plus the creative's home/status view (C01) including the correction and human-review loops.

## Context

FR 3, 4, 5, 7 (creative side) in `project-overview.md`; application state machine and idempotency in `architecture-context.md`; screen contents and status vocabulary in `ui-context.md`. Mobile-first (design at 360 px). Day 2–3.

## Requirements

1. **R01 Intake** (stepper, each step saved to the store as a draft):
   - About you: name, display name (defaults to name), follow-up arrangement — own channel (fictional label) **or** coordinator-mediated (records responsible coordinator).
   - Practice (revised by the team, 2026-10-27): creative domain (nine RA 11904 domains) plus required free-text specific creative practice; skills (free tags), general location (existing fictional broad-area list, never street address), support interests. Detailed sub-sectors remain pending council input; do not invent a fixed approved list.
   - Work evidence: add one or more items — link (text), sample description, or assisted description by coordinator; per item, "OK to show publicly if I choose a public listing". Copy states a polished portfolio or business permit is not required.
   - Assisted mode (from coordinator workspace): intake source, site, coordinator, date captured automatically and shown read-only; a reminder that the creative makes their own choices.
2. **R02 Review and submit:** readback with "Edit" links to each step; information-use explanation in plain language (what is collected, why, who sees it, how to correct/withdraw — demo wording, labeled pending council approval); required acknowledgment; **separate** public-listing choice, off by default, with live public preview (P03 component via projection) and the note that declining does not affect support; Save draft; Submit.
3. **Submission results:** online → "Received by the council" with council reference, what happens next, and (if started from an opportunity) a link back to it; offline (assisted) → "Queued on this device — the council has not received it" with device reference (queue handling in Feature 05). Self-service while offline → explain that submission needs a connection and the draft is saved (the device queue exists only on coordinator devices; see architecture).
4. **C01 Home / status:** next-action card (finish draft, await review, correct information, respond to referral, refresh profile), status badge + sentence, reference, status timeline from audit events, review reason when changes requested/declined, "Correct and resubmit" (returns to R01 on the same record, then R02 → received), "Request a human review" when declined, "Get assistance" (shows coordinator route), in-app notifications list labeled as examples.
5. Back navigation, step changes, and persona switches preserve the draft. Validation: field-level messages and an error summary linking to fields.

## Non-Goals

File uploads (evidence is text only), document scanning, government ID collection, translations, real messaging. Coordinator queue/sync UI (Feature 05). Council-side review (Feature 06). Profile editing after verification (Feature 06, C02).

## Architecture / Design Constraints

- One set of intake components for both modes; mode only adds attribution/site context.
- All state changes through store actions → domain functions; status text from the label map.
- Required fields exactly as in `code-standards.md` → Validation.

## Dependencies

Features 01, 02. Feature 03 for the register-from-opportunity entry (can be stubbed by route parameter until 03 lands).

## Edge Cases

- Double-clicking Submit → one application, same reference shown.
- Leaving intake midway and returning → draft restored at the last step.
- Submitting without acknowledgment → specific error, focus moves to the summary.
- Evidence-only-by-description (no link) → accepted.
- Coordinator-mediated follow-up chosen → no personal contact field required.
- Correction resubmission keeps the same reference and appends history; it does not create a new application.
- Opt-in chosen at submission → status shows "Listing pending review" until verified and approved.

## Testing / Verification

Unit tests for any view-model helpers; Playwright: self-service draft → leave → resume → submit (received); validation errors by keyboard only; correction loop (requires Feature 06 action or a test helper dispatching council actions via the store); double-submit idempotency; 320/360 px layout; axe on R01 steps, R02, C01 states.

## Acceptance Criteria

- [ ] A self-service creative can save a draft, leave, return to the same step, and submit to receive a council reference.
- [ ] Assisted-mode submission shows coordinator, site, and source in R02 and in the resulting record; self-service shows none.
- [ ] Public listing is off by default; the preview shows only projection fields; the copy states that declining does not affect support.
- [ ] Submitting twice yields one application and one reference.
- [ ] After the council requests changes, C01 shows the exact reason and a correct-and-resubmit path that returns the same record to "Received by the council".
- [ ] After a decline, C01 shows the reason and a working "Request a human review" action that creates a council case.
- [ ] Intake can be completed with keyboard only; errors are announced and focus moves to the error summary.
- [ ] No horizontal overflow or clipped controls at 320 px and 360 px; targets ≥ 44 px.

## Open Questions

Final practice taxonomy, eligibility evidence, and information-use wording require council approval (council OPEN #9, #14). Demo wording is labeled as such.
