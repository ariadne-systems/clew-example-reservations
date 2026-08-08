# Agent context

Load the governance contract before working, in order:

@.claude/.ai-project-context/000-agent-instructions.md
@.claude/.ai-project-context/001-charta.md
@.claude/.ai-project-context/002-architecture.md
@.claude/.ai-project-context/003-developer-guidelines.md
@.claude/.ai-project-context/004-technology-contract.md
@.claude/.ai-project-context/005-testing-contract.md

The design surface for this system is under `baseline/`:

- `baseline/architecture.md` — the module shape, the layering and nullness rules, atomicity, and how rejections are signalled.
- `baseline/domain-model.md` — the entities and their shape.
- `baseline/adr/` — the standing design decisions. Read the one a story cites.
- `baseline/stories/` — the work items, one per increment.

Implement only the story you were given, against the design surface and the governance above.
