# reservations — a Code-Anchored Spec-Driven Development seed

This repository is the **authored design surface** for a worked example of **Code-Anchored Spec-Driven Development (CAS-DD)** built with **clew**.
It is a *seed*, not a finished, runnable demo: it contains the architecture, domain model, ADRs, stories, and a seed set of specs, but no implementation yet.
An agent (or a developer) builds the Java and tests from this surface, story by story.

The domain — an equipment reservation engine — is deliberately ordinary.
The point is not the reservation logic; it is what the specifications and their anchors do to the code as it grows.

- The method: **Code-Anchored Spec-Driven Development** (link to essay)
- The tool: **clew** — the CLI that generates the traceables and reads coverage (link to clew)
- This is a constructed example, not a production system.

## Seed vs. finished demo — read this first

This is one of two products, and they should not be confused:

- **This seed** — the design surface an agent implements. `clew generate` / `mvn verify` / `clew coverage` do **not** produce green output here yet, because there is no anchored code.
- **The finished demo** — what the seed becomes once implemented: a repo you clone, build green, and study. Turning this seed into that demo is the "Demo-hardening checklist" at the bottom.

The commands in the "For the agent" section describe how to *build toward* green, not a state that already exists.

## What CAS-DD demonstrates here

**Specifications are compiler-checked claims, not comments.**
Each spec (`SW-001`, `CON-001`, `ENT-001`, …) becomes a generated, typed symbol.
Production code anchors to it with `@Realizes`; tests with `@Verifies`.
Delete a spec — or change its generated identity — and code that still references its old traceable no longer compiles.

**Coverage is a reverse scan.**
`clew coverage` reads the anchors back and reports, for every spec, whether it is covered, realized only, verified only, or unanchored.
The rule is uniform: every active spec is Done when both realized and verified — what differs by lens is the *altitude* of the anchor, not the rule (see `specs/README.md`).

## The stories

| Story | What it adds |
|-------|--------------|
| STR-1 | Set up the workspace |
| STR-2 | Reserve a single item for a time window |
| STR-3 | Tentative holds with expiry |
| STR-4 | Owner-initiated cancellation and release |
| STR-5 | Per-user fair-use quota |

Each story binds to the corpus id matching its number: STR-1 (setup) → `STR-001`, STR-2 → `STR-002`, and so on — no
offset. The multi-item redesign (STR-6) is applied as its own step, not part of this single-item seed.

## Repo layout

```
README.md            this file
architecture.md      narrative shape; the ARCH/CON specs are the checked truth
domain-model.md      the ENT entities
specs/               one small spec per file (flat); each declares its lens; coverage policy is stated here
adr/                 architecture decision records — few and earned
stories/             the driving stories
src/main/java/       the reservation engine — anchored with @Realizes (created at setup)
src/test/java/       tests — anchored with @Verifies; ArchUnit boundary tests (created at setup)
pom.xml              JDK 25, JUnit 5, Mockito, AssertJ, ArchUnit, JSpecify (nullness); clew traceables as generated sources (created at setup)
```

An ADR records a decision and its reasoning — the durable *why*.
The ARCH and CON specs derived from it are the atomic, enforced *what* the code anchors to.

## Reading path (for the finished demo)

So a first-time reader does not have to absorb the stories, the lenses, the ADRs, ArchUnit, quotas, holds, and clocks before seeing the core mechanism:

- **Five-minute path** — one spec, its generated traceable, one `@Realizes`, one `@Verifies`, and the coverage line for it. Nothing else.

## Running the demo — and how it deliberately differs from normal CAS-DD

This seed is the **script** for the demo. It lives under `setup/` on purpose: it is not part of the built project, it is the source the agent pulls each increment from.

**How a normal CAS-DD increment works.** The human says what to build next; the agent builds context from the anchors already in the code, then *derives* the story's specifications itself, through the lenses that apply. Nothing is pre-written.

**How this demo differs — and why.** Here the story *and its specifications are pre-authored and fixed* in this seed. A demo has to be reproducible: if every run derived its own specs, no two runs — and no two readers — would see the same corpus. So the specs are given, once, in **base form**, and the agent's job at each increment is to reproduce and anchor them rather than invent them. This is the one deliberate deviation from the method; everything else — promote, implement, anchor, coverage — is the real loop.

**The `ENT` lens is already configured — it is not one of clew's defaults.** This seed describes the system through seven lenses (`specs/README.md`), and `ENT` is one of them: the domain shapes (`ENT-001` Item, `ENT-002` TimeWindow, …) are authored as specs like any other lens, and the code types anchor to them. Because a scaffolded clew project does not come with `ENT`, this seed's baseline **already** declares it in the two places it must live, so `ENT` specs mint and validate out of the box — no ENT configuration step is needed during the run:

- `.clewrc.json` — an entry in `lenses`: `{ "id": "ENT", "description": "Entity spec — a domain shape: its purpose and attributes with types." }`.
- `docs/spec/schemas/spec.schema.yaml` — `ENT` in the `Lens` field's `enum`.

**The loop, per increment (STR-1 first):**

1. **Draft** — point the agent at the increment's story in `stories/STR-N-…`. The agent drafts that story and the specs it needs, deriving them *against the fixed specs in this seed* (`specs/`), with temporary ids.
2. **Promote** — bind real ids and move the drafts into the built corpus.
3. **Implement & anchor** — set each spec `active`, write the code and tests, anchor production code with the generator's `@Realizes` marker and tests with `@Verifies`, and confirm each spec reports `Covered`.
4. **Check** — run `clew coverage` / `clew check` over the whole corpus.

```
clew spec        # emit the typed traceables from the corpus
mvn verify       # compile, run tests, run the architecture tests
clew coverage    # every spec: covered / realized-only / verified-only / none
```

**Keep a newly-minted spec's id out of the story's prose — the Relations list carries it.** `clew promote` binds a temporary id to its real number in the order the id is **first encountered scanning the story top to bottom, prose included** — not the order of the `## Relations` list alone. So if a story's Problem/Context or Solution Approach names a spec it mints (for example "the single-item shape (ENT-004)"), that spec is discovered first and grabs the lowest free number in its lens, and the built corpus comes out renumbered against this seed's fixed ids. Refer to a to-be-minted spec by name in the prose ("the Reservation shape"), never by id, and list the specs in the `## Relations` block in the intended id order. Referencing an **already-promoted** spec by id in prose is fine (it is not being minted). This is why STR-2's prose names no ids while its Relations list fixes ENT-001…ENT-004 and CON-001/CON-002.

**Specs are held once, in base form; the agent revises them.** Each spec is authored in the form it has when the increment that introduces it runs — forward-reference-free at that point. Where a later increment changes a spec, that is the agent's work during that increment, driven by an explicit instruction in the story (for example STR-3 extends `SYS-002` and `CON-001` to include holds; STR-5 extends `ENT-003` to carry the quota). Each such change records a `## Changes` entry on the spec, so the corpus stays honest as it grows — exactly as in the real method.

**Reproduce the relation links exactly as written here — do not "fix" them to resolve from the drafts folder.** These specs link siblings by bare filename (`[ENT-004](ENT-004-reservation.md)`) and stories link specs as `[SYS-002](../specs/SYS-002-…md)` — the form the link has *in the spec tree*, which is where it ends up. While a reproduced spec sits in the drafts folder, a link to an already-promoted spec will not resolve — that is expected, and the drafts folder is exempt from `clew check`. Do **not** add a `../../specs/` (or similar) prefix to make it resolve from the draft: `clew promote` moves the file into the spec tree but does **not** rewrite link paths, so a prefix that resolved from the draft breaks once promoted. Copy the link form verbatim from this seed.

**The stories carry the narrative time.** STR-1…STR-5 are written *as of their own increment*: none refers to a later story.

## Constructed history

The git history is part of the demonstration. The single-item increments are tagged `res-1 … res-5` (each green).

## Demo-hardening checklist (seed to public demo)

- [ ] Implement STR-1…STR-5 to green.
- [ ] Pin the exact clew version and add `.clewrc.json` (including the lens coverage policy).
- [ ] Replace the `pom.xml` TODO with the one real clew annotation/generated-source integration.
- [ ] Add the Maven Wrapper (`./mvnw`).
- [ ] Add CI (generate to compile to test to clew check to coverage) with expected coverage output pasted into this README.
- [ ] Add an Apache-2.0 `LICENSE`.
