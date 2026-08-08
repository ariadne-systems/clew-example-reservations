# Specs

One small spec per file, all in this single folder.
Each spec declares its **lens** in a `**Lens**` field (not a subfolder).
clew reads this tree and emits one generated, typed symbol per spec.
Code anchors to those symbols: production code with `@Realizes`, tests with `@Verifies`.

## Lenses and ID space

| Lens | ID prefix | What it captures |
|------|-----------|------------------|
| Stakeholder | `STK-` | Why anyone wants this at all |
| System | `SYS-` | Externally observable behaviour of the engine |
| Software | `SW-` | How a service realizes a system behaviour |
| Entity | `ENT-` | The shape of domain data |
| Architecture | `ARCH-` | Structural rules (layering, state ownership) |
| Non-functional | `NF-` | Qualities (determinism, testability) |
| Constraint | `CON-` | Invariants that must always hold |

## Coverage: one uniform rule

Every active specification is **Done when it is both realized and verified** — a `@Realizes` anchor in production
code and a `@Verifies` anchor in a test.
This is uniform across all lenses; the demo does not use lens-specific coverage exceptions.

What differs by lens is the *altitude* of the anchor, not the rule:

- `STK-001` is realized at the public system boundary (the engine / module entry point `@Realizes` it) and
  verified by an end-to-end acceptance test.
- `SYS` specs are realized by the application service and verified by a system-level test.
- `SW` specs are realized by a concrete implementation and verified by focused unit tests.
- `CON` / `NF` / `ENT` / `ARCH` specs are realized and verified at the level that owns them.

Lower-level specs may declare conceptual `Realizes` relationships upward (SW realizes SYS realizes STK), but those
spec-to-spec relationships describe structure; they do not substitute for a code realization and a test.
Each spec earns its own coverage.

## Lifecycle: deprecation is not deletion

IDs are stable and never reused.
A spec is not repurposed by rewriting its prose in place — the compiler cannot see a meaning change behind an
unchanged symbol.
Instead there are two distinct operations:

- **Deprecate** — the generated symbol *remains*, existing anchors still compile, but the spec is flagged
  deprecated and separated from active coverage. This lets you keep building while you migrate anchors to a
  replacement.
- **Delete** — the symbol is removed. Any anchor that still refers to it then fails to compile. Deletion is the
  final mechanical check that nothing stale remains.

When an increment retires a spec, use both in order: deprecate while anchors migrate to the replacement, then delete
once no anchor names it and regenerate to prove the migration is complete.

## Spec shape

The field template and its validation are canonical in the schema folder — do not re-document them here:
`docs/spec/schemas/spec.example.md` is the field template, `spec.schema.yaml` its validation.
In order, the fields are `**Title**` (the decision the spec pins), `**Lens**`, `**Status**`, `**Description**`,
`**Rationale**`, `**Verification Description**`, followed by a `## Relations` section.

Two conventions specific to this seed:

- The ADR a spec derives from is named in `**Rationale**` — there is no `Source` field. In the built project the
  ADRs live in `docs/spec/adr/` (reproduced from this seed's `adr/` during setup); that is also where any new ADR an
  increment writes goes.
- Relations are markdown links to sibling spec files by bare filename (all specs share this one folder), never bare
  ids: `Realizes` links a spec upward to the spec it serves, `Related` links siblings it touches.

Keep statements atomic: one checkable claim per spec.

## Seed vs. authored

The specs here describe the reservation engine as it stands.
They contain no forward references to work that has not happened — the system's evolution lives in the git
history, not in omniscient notes.
The agent completes the tree story by story, deriving the missing specs each story needs, then anchors code and
tests and closes coverage under the uniform rule above.

**These files are the specs' BASE FORM — `**Status**: planned`, forward-reference-free.** Each seed spec shows the
spec as of the increment that introduces it, *without* any revision a later increment makes to it — for example
`ENT-003` here does **not** yet carry the quota (STR-5 adds that), and `SYS-002` computes availability from
reservations only (STR-3 adds holds). Reproduce a spec verbatim into your draft; it stays `**Status**: planned`, and
the implement step flips it to `active`. Where a later increment revises a spec, the **story** for that increment is
the single source of truth (STR-3's story extends SYS-002 and CON-001 to include holds; STR-5's extends ENT-003 to
carry the quota) — apply the revision and its `## Changes` entry then, following the story.
