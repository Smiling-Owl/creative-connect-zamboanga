# AI Workflow Rules

## Before Implementation

Before substantial work:

1. Read AGENTS.md.
2. Read project-overview.md.
3. Read architecture-context.md.
4. Read code-standards.md.
5. Read ui-context.md when the task affects UI.
6. Read progress-tracker.md.
7. Read the assigned feature specification when one exists.

Load only task-relevant context when possible.

## Scope

- Implement only the assigned task/specification.
- Do not silently broaden scope.
- Do not silently change approved architecture.
- Do not invent missing product requirements.
- Surface material ambiguity to the orchestration layer.
- Preserve unrelated work.
- Business rules belong in `src/domain/`. If a needed transition or rule is missing, add it there with tests; if adding it would change a rule stated in `project-overview.md` or `architecture-context.md`, stop and escalate instead.
- Never add real people, contact details, credentials, partner names, council branding, or claims of endorsement, paid work, or certification. All data stays fictional and labeled.
- Do not publish, deploy, or create hosting resources; publishing requires an explicit team decision.

## Parallel Work

- Concurrent editing work should use isolated worktrees or equivalent isolation.
- One actively editing worker per isolated checkout.
- Do not overwrite unrelated concurrent work.
- Do not independently merge unless authorized.
- Shared hot spots — `src/domain/types.ts`, `src/state/store.tsx`, `src/fixtures/baseline.ts`, `src/styles/tokens.css`, and the router in `src/App.tsx` — should receive small, additive changes; report every change to them so the orchestrator can sequence integration.

## Verification

Before reporting implementation complete:

- satisfy acceptance criteria
- run relevant tests
- run lint when available
- run type checking when available
- run build verification when applicable
- report failed checks honestly
- report unresolved risks or assumptions

For UI work, also check the affected views at 320 px and desktop width, operate them by keyboard, and run the accessibility scan when the e2e suite exists. State which checks were not possible.

## Architecture Changes

Material architecture changes require escalation and approval.

After approval, reconcile architecture-context.md with reality.

## Progress

Parallel workers should normally report results to the supervisor/orchestrator.

The supervisor/orchestrator owns final synchronization of
progress-tracker.md.

Avoid multiple workers editing progress-tracker.md concurrently.
