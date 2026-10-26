# Project Agent Instructions

This repository builds **Creative Connect Zamboanga**, a one-week, browser-only clickable prototype (fictional data, simulated access/offline/decisions). It uses the project context under `context/`.

Before substantial work, read the task-relevant project context.

Canonical files:

- `context/project-overview.md`
  Product scope, users, requirements, business rules, constraints, and non-goals.

- `context/architecture-context.md`
  Approved architecture, domain state model, and technical boundaries.

- `context/ui-context.md`
  Screen map, navigation, status vocabulary, design tokens, and accessibility.

- `context/code-standards.md`
  Project-specific engineering conventions and verification commands.

- `context/ai-workflow-rules.md`
  Agent scope, parallel-work, and verification rules.

- `context/progress-tracker.md`
  Current implementation state.

For non-trivial implementation, also read the assigned specification under:

`context/feature-specs/`

Rules:

- committed project context is more authoritative than old chat history
- do not silently broaden requirements
- do not silently change approved architecture
- surface material ambiguity
- preserve unrelated work
- verify implementation before reporting completion
- do not independently merge unless authorized by the orchestration layer
- never add real people, organizations' branding, contact details, credentials, or personal data; all demo data is fictional and labeled

The external orchestration system owns:

- task decomposition
- model/agent selection
- worker spawning
- concurrency
- worktree lifecycle
- integration ordering
- review routing
- merge authority
