# Progress Tracker

Last updated: 2026-10-26.

## Current Phase

Implementation, feature by feature. Features 01 and 02 are built and verified locally, and are in review. Nothing beyond the planning baseline is committed yet.

## Current Goal

Finish review of Features 01 and 02 and commit them. Then start Feature 03 (public discovery, guidance, and simulated access). Feature 03 builds on the store and selectors that now exist.

## Milestones

| # | Milestone / feature spec | Status | Notes |
|---|---|---|---|
| 0 | Planning and project context (`AGENTS.md`, `context/`) | DONE | Committed on `feature/foundation-and-domain` as the baseline. The user approved proceeding on 2026-10-26. |
| 01 | Foundation and demo shell | REVIEW (committed to feature/foundation-and-domain) | Scripts, shell, routes, role gates, demo controls, persistence. 12 browser tests pass. Reviewed once (Opus); findings fixed; re-review pending. |
| 02 | Domain state, permissions, and fixtures | REVIEW (committed to feature/foundation-and-domain) | Rules, permissions, fixtures, selectors, account links, and guidance fixtures are built. 116 unit tests pass. Reviewed once (Opus); findings fixed; re-review pending. Deferred to Feature 03 and Feature 08: sign-up duplicate flag, access recovery, notifications view, funnel view. |
| 03 | Public discovery, guidance, and simulated access | NOT STARTED | Next. |
| 04 | Shared intake, privacy choices, and application status | NOT STARTED | Domain for intake exists. Screens do not. |
| 05 | Coordinator workspace and offline simulation | NOT STARTED | Queue rules exist. Screens do not. |
| 06 | Council review, corrections, and profile maintenance | NOT STARTED | Review rules exist. Screens do not. |
| 07 | Opportunities, referrals, and outcomes | NOT STARTED | Rules exist. Screens do not. |
| 08 | Council overview, synthetic reporting, and notifications | NOT STARTED | Selectors exist. Screens do not. |
| 09 | Verification, demo script, and packaging | NOT STARTED | |

Dependency order: 01 → 02 → {03, 04, 07} in parallel → {05, 06} → 08 → 09.

## Completed

- Source review of the client brief, the transcript, the synthesized notes, the concept and journey document, the MVP flows, and the project bootstrap (in the research workspace, outside this repository).
- Team decisions recorded 2026-10-23: Vite + React + TypeScript, an in-memory store mirrored to localStorage with Reset, and context kept in this repository.
- Feature 01: project scaffold (pinned dependencies, scripts), design tokens, shell, 20 view routes with role gates, demo controls, versioned persistence with fallback, reset with confirmation.
- Feature 02: domain layer (see `architecture-context.md` → Implementation Decisions), fixtures, personas, guidance examples, selectors, and a permission representation.
- First Opus review (2026-10-26): CHANGES NEEDED. One blocker and about a dozen major or minor findings. Fixed: account links, update review path, duplicate linked handling, closed-opportunity rule, one record per creative, source derived from the actor, sync-failure consumption, review order, duplicate contact-label check, conflict baseline, status vocabulary wording, the dialog focus trap, and the network test.

## In Progress

- Opus re-review of Features 01 and 02 after the fixes above.

## Blocked

None.

## Known gaps accepted for now

- Navigation lacks the "Follow-ups" (coordinator) and "Creative records" (council) destinations. They arrive with Features 05 and 08. Adding them now would point at placeholder pages.
- No `EmptyState` or `LinkButton` components. Add them when a view needs them.
- Store `run` has no unit test. It is covered indirectly by the browser tests.
- The shell has no separate "menu button" below 640 px. Navigation wraps instead.
- The demo does not yet have the "Next send fails" end-to-end journey. That arrives with Feature 05.
- Feature 02 was implemented before its tests were written. Feature 03 onward is test-first.
- Minor, from the final Opus check: (1) any creative edit clears updateReason, even one that changes nothing the council reviews, such as interests. (2) If a creative edits a pending update back to the approved content, updatePending stays true, so a council review item remains after the listing is back. (3) Tests not yet covering: refusal of a non-confirmed referral in recordInstructions, and updateReason clearing on approval.

## Next

1. Opus re-review of the fixes. Address any remaining blocker or major finding.
2. Commit Features 01 and 02 on `feature/foundation-and-domain`, with the Haiku co-author line.
3. Feature 03 (Haiku implements; Opus reviews before commit).

## Integration State

Nothing merged. The branch `feature/foundation-and-domain` holds the context baseline commit. Features 01 and 02 are uncommitted in the working tree.

## Verification State

- Last verified commit: `8f6aa3c` (context baseline; no application code).
- Current working tree, verified in this session on 2026-10-26:
  - `npm run typecheck`: exit 0
  - `npm run lint`: exit 0
  - `npm test`: 116 passed (14 files)
  - `npm run build`: exit 0, about 88 KB gzipped JS
  - `npm run test:e2e`: 12 passed (Chromium)
- Not yet checked: `npm ci` from a clean clone; manual screen-reader pass; 200% zoom; keyboard-only pass of every view; `npm run dev`.

## Open Questions

Full list in `project-overview.md` → Open Questions. The most time-sensitive:

- Event date, demo length, and organizer requirements. These set the calendar for the remaining days.
- Team size, skills, and feature ownership.
- How judges will open the demo (needed by Day 7; a local fallback is required regardless).
- Whether guidance cards may name or link real government offices. Current cards use source labels only.
- Whether a deck or video is also required. Not added automatically.

Decisions made while building that need the team's OK are listed under "Implementation Decisions Recorded" in `architecture-context.md`.

## Next Recommended Action

Finish the Opus re-review, then commit Features 01 and 02 and start Feature 03.
