# Baseline input set

The control arm of the CAS-DD experiment: the same six stories and the same architecture, with the method removed.

A run driven from `baseline/` builds the reservation engine without clew — no spec corpus, no traceables, no `@Realizes`/`@Verifies` anchors, no coverage gate over specs, no anchoring review.
Read story, implement, test, commit.

This document is deliberately **not** inside `baseline/`.
It names the thing being withheld, so an agent that read it would learn what the baseline is a baseline *of*.
Everything the run may see lives under `baseline/` and nothing else does.

## What the run receives

| File | Source | What changed |
| --- | --- | --- |
| `baseline/architecture.md` | `setup/reservations-cas-dd-demo/architecture.md` | Anchor, traceable, and ARCH/CON-spec sentences removed |
| `baseline/adr/ADR-0002..0005.md` | `setup/reservations-cas-dd-demo/adr/` | Anchoring consequences and spec-id references removed; the decisions themselves unchanged |
| `baseline/domain-model.md` | `setup/reservations-cas-dd-demo/domain-model.md` | The "each entity is an ENT spec … anchors with `@Realizes`" line removed and the `(ENT-00n)` ids dropped from the headings; entity descriptions unchanged |
| `baseline/governance/000..005` | `.claude/.ai-project-context/000..006` | 002 verbatim; 003 lost its anchor-based Comments section, 004 its traceables line; 000 and 001 lost their spec/anchor clauses; 006-spec-conventions dropped whole. Relocated to `.claude/.ai-project-context/` in the baseline kit |
| `baseline/stories/STR-1..5.md` | `setup/reservations-cas-dd-demo/stories/` | `## Relations` and `**Status**` removed; anchoring/coverage acceptance criteria removed; spec ids replaced by the behaviour they name |
| `baseline/reveal/STR-6-atomic-multi-item-bookings.md` | same | Same stripping. **Held back** — see below |

## The ADRs come across as ADRs

The CAS-DD arm receives five ADR documents and reasons from them; the baseline receives the same documents, in the same form, so the two arms differ in method and not in how their design rationale is packaged.
An earlier draft inlined them into `architecture.md` as prose — that preserved the content but changed its shape, and the architecture doc referencing `ADR-0003` while no such document existed was worse than either option.

**ADR-0001 has no baseline analogue.** It decides that specification links are compiler-enforced symbols — that decision *is* the method under test, so there is nothing to strip it down to.
The numbering therefore starts at 0002 with a deliberate gap; renumbering would break diffability against the source.

`ADR-0006` (stable lock ordering) is likewise absent from both arms: the CAS-DD run authored it *during* STR-6 as part of the redesign, so handing it over up front would give away the answer.

The architecture is the **seed** version, not the one the CAS-DD run finished with.
The finished one already describes multi-item reservations and a lock ordering, which is the answer to STR-6.
Starting the baseline from it would hand over the redesign before the run began.

## STR-6 is held back on purpose

`baseline/reveal/` must not be part of the commit the baseline run starts from.
The CAS-DD arm receives STR-6 by cherry-pick at the start of its final increment and runs the first five blind to it; the baseline arm has to be given it the same way, or the two arms are not answering the same question.

At reveal time the file moves to `baseline/stories/STR-6-atomic-multi-item-bookings.md` in a single commit — the baseline analogue of the `str6-requirement` tag.

## What was removed, and why it had to be

The stories are not method-neutral as written.
Each ends with a `## Relations` block naming the spec ids it realizes, and each carries an acceptance criterion of the form *"Every spec this story drives is anchored (`@Realizes` in production code, `@Verifies` in a test), and `clew coverage` shows each as covered."*
`architecture.md` devotes a section to anchors being enforced by the type-checker and to invariants being CON specs verified by anchored tests.

Handed over unedited, those files instruct the baseline to perform the method under test.
The comparison would then measure tooling, not method.

Nothing was added — the inputs differ from their sources by deletion and restatement only, never by a new requirement.
Every behavioural acceptance criterion, every out-of-scope note, and every design decision in the original survives; only the sentences that describe *how intent is recorded* are gone.
Diff any file against its source to check that.

Where a source acceptance criterion bundled a method clause with a real one — STR-2's *"…are anchored, `mvn verify` is green, and `clew coverage` shows each as covered"* — the real half is kept and the method half dropped.
Stories whose sources state no build criterion at all (STR-3, STR-4, STR-5) still state none here, even though every increment is required to reach a green build; that requirement belongs to the run harness, which applies it to both arms equally, and adding it to one arm's stories would be an edit in the wrong direction.

Two edits are worth calling out because they are judgement rather than deletion:

- **STR-3** and **STR-5** originally instructed the agent to revise named specs (`SYS-002`, `CON-001`, `ENT-003`) and record a `## Changes` entry.
  The behaviour behind those instructions is real and had to survive, so each is restated as what actually changes — availability and the no-double-booking rule now account for active holds; the `User` now carries the quota and keeps id-only equality — together with the requirement that the tests for the widened rules widen too.
  Dropping the paragraph outright would have removed a behavioural requirement, not just a method reference.
- **STR-6**'s closing instruction asked for a record of what the *anchored* context told the agent.
  It now asks for a record of what the existing code told it, and where it had to infer intent the code did not state.
  That keeps the qualitative half of the comparison answerable on both arms.

## What was deliberately kept

The behavioural criteria, the module shape, the layering and nullness rules, the store-is-the-only-writer rule, the injected clock, and the test levels.
These are properties of the system, not of the method, and removing them would make the baseline a worse-documented project rather than an unanchored one — a different experiment.

## The baseline branch

The two lines share only their first two commits, and diverge before either method appears.

| ref | what it is |
| --- | --- |
| `run-tooling` | the measurement collectors — identical for every arm, which is what makes their figures comparable |
| `common-base` | licence, attributes, ignore rules; the last commit the two lines have in common |
| `baseline-setup` / `baseline-main` | this arm's starting kit, a child of `common-base` |
| `baseline-str6-requirement` | one commit adding `baseline/stories/STR-6-…`, deliberately **not** on the branch; the workflow cherry-picks it when STR-6 begins |

Neither shared commit contains a specification, a story, or any part of the method, so the corpus is not reachable from this line even by reading back through the log — a single starting kit that merely *deleted* the corpus would leave it one `git show` away.

Relative to the spec-driven root, the baseline root drops `setup/` (the seed corpus), `package.json` and the pnpm files — which carry the clew dependency and the `pnpm run clew` script — the spec-driven workflow, `docs/`, and the clew-flavoured `CLAUDE.md`, `README.md` and `.gitignore`.
It gains a neutral `CLAUDE.md` and `README.md`, and the stripped governance relocated from `baseline/governance/` to its canonical `.claude/.ai-project-context/`.

Dropping `package.json` is the load-bearing one: with no clew dependency and no `clew` script there is no tool in the worktree to invoke, so the separation is structural rather than a matter of the agent behaving.

The neutral `README.md` and `CLAUDE.md` deliberately do not mention the comparison, the other arm, or the method being tested.
An agent told it is a control in an experiment is not a control any more.

### Known residue

The measurement collectors under `.claude/workflows/metrics/` are shipped identically to both arms — they must be, or the two arms are not measured the same way — and they name clew in their classification patterns and in the prose describing the activity buckets.
A baseline run has no reason to open them, but they are readable.

Closing this completely means keeping the collectors out of the measured tree and invoking them by absolute path from outside the worktree.
That also removes the need to rewrite the root every time a collector changes.

## Preparing a baseline run

```bash
node .claude/workflows/metrics/new-run.mjs --arm baseline --base <baseline base commit>
```

The base commit must:

- contain `baseline/architecture.md`, `baseline/domain-model.md`, `baseline/adr/`, the governance at `.claude/.ai-project-context/`, and `baseline/stories/STR-1..5.md`;
- **not** contain `baseline/reveal/`;
- **not** contain `setup/reservations-cas-dd-demo/specs/` or `setup/reservations-cas-dd-demo/stories/` — the pre-authored specs are the answer key for STR-2 through STR-5 in the same way `expectations/` is for STR-6, and the unstripped stories reintroduce everything removed above.
