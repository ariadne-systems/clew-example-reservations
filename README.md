# reservations

A small Java library that reserves equipment: a user places a tentative **hold** on an item for a time window and confirms it into a **reservation**, or lets it expire.
The same item is never booked to two parties for overlapping time, a per-user quota bounds how much anyone may hold at once, and every state change is atomic.

The domain is deliberately ordinary.
It exists to be built increment by increment and read afterwards.

## Layout

```
baseline/
  architecture.md    the module shape, layering, nullness, atomicity, rejections
  domain-model.md    the entities and their shape
  adr/               the standing design decisions
  stories/           the work items, one per increment
.claude/
  .ai-project-context/   the governance an implementing agent works under (000-005)
  workflows/             the run that builds it, and the tooling that measures the run
src/                 the engine itself, once STR-1 has stood the workspace up
```

`baseline/` is the design surface: it is written before the code and does not change as the code grows, except where a story says a decision changed.

## Build

```
mvn -B verify
```

JDK 25 and Maven.
The build compiles, runs the suite, enforces the architecture boundaries as ArchUnit tests, and gates on JaCoCo line coverage.
Everything the build needs is pinned in `pom.xml`; there is nothing else to install.

## The stories

| Story | What it adds |
|-------|--------------|
| STR-1 | The workspace: build, package structure, boundary tests |
| STR-2 | Reserve a single item for a window, and never double-book it |
| STR-3 | Tentative holds that expire against an injected clock |
| STR-4 | Owner-initiated cancellation and release |
| STR-5 | A per-user fair-use quota |
| STR-6 | Atomic multi-item bookings |

Each is implemented in one increment, ending green, and reviewed against its acceptance criteria before the next begins.

## Reading it

Start with `baseline/architecture.md` for the shape, then `baseline/domain-model.md` for the entities.
`baseline/adr/` explains why the store is the only writer, why availability is computed rather than stored, and why time comes from an injected clock.
Then read `src/main/java/io/example/reservations/api/` — the facade is the narrowest way into the system.

## License

See `LICENSE`.
