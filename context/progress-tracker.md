# Progress Tracker

Last updated: 2026-10-23 (planning handoff).

## Current Phase

Planning complete; context system created; implementation not started.

## Current Goal

Start Feature 01 (foundation and demo shell), then Feature 02 (domain state and fixtures), which unblock all view features.

## Milestones

| # | Milestone / feature spec | Schedule day | Status |
|---|---|---|---|
| 0 | Planning and project context (`AGENTS.md`, `context/`) | 1 | REVIEW — written, awaiting team review and first commit |
| 01 | Foundation and demo shell | 1–2 | NOT STARTED |
| 02 | Domain state, permissions, and fixtures | 1–2 | NOT STARTED |
| 03 | Public discovery, guidance, and simulated access | 2, 5 | NOT STARTED |
| 04 | Shared intake, privacy choices, and application status | 2–3 | NOT STARTED |
| 05 | Coordinator workspace and offline simulation | 4 | NOT STARTED |
| 06 | Council review, corrections, and profile maintenance | 3, 5 | NOT STARTED |
| 07 | Opportunities, referrals, and outcomes | 5 | NOT STARTED |
| 08 | Council overview, synthetic reporting, and notifications | 5–6 | NOT STARTED |
| 09 | Verification, demo script, and packaging | 6–7 | NOT STARTED |

Dependency order: 01 → 02 → {03, 04, 07} in parallel → {05, 06} → 08 → 09. If capacity is short, reduce depth in 03 (guidance/access/recovery) and 08 before cutting the core journey (04–07).

## Completed

- Source review of the client brief, transcript, synthesized notes, concept/journey, MVP flows, and project bootstrap (research workspace, outside this repo).
- Team decisions recorded 2026-10-23: Vite + React + TypeScript; in-memory store mirrored to `localStorage` with Reset; context lives in this folder with a fresh Git repository.
- `git init` (branch `main`); no commits yet.

## In Progress

None.

## Blocked

None. Publishing is blocked only on a hosting decision (team OPEN #3), which does not block building.

## Next

1. Team reviews `context/` (especially PROPOSED rules in `project-overview.md` → Business Rules and the PROPOSED rows in `architecture-context.md` → Approved Stack).
2. Make the initial commit of `AGENTS.md` and `context/`.
3. Orchestrator assigns Feature 01.

## Integration State

Nothing integrated. Repository contains only `AGENTS.md` and `context/` (uncommitted). No application code, `package.json`, or tests exist.

## Verification State

- Last verified commit: none (no commits).
- Tests: not applicable (no code).
- Lint: not available.
- Typecheck: not available.
- Build: not available.

Verification commands become available with Feature 01 and must be recorded in `code-standards.md` once verified.

## Open Questions

Full list in `project-overview.md` → Open Questions. Most time-sensitive for the team:

- Event date, demo duration, organizer requirements (sets the real calendar for Days 1–7).
- Team size/skills and feature ownership (sets parallelism).
- Hosting/access method for judges (needed by Day 7; local fallback required regardless).
- Whether guidance cards may name/link real public authorities.
- Whether a deck/video is required (not added automatically).

Council questions (verification definition, taxonomy, sites, providers, age eligibility, languages, privacy authority) do not block the prototype; fictional, labeled assumptions are used.

## Next Recommended Action

Review and approve the context, commit it, then begin Feature 01 in an isolated worktree.
