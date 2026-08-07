# Run metrics

Collectors that turn an autonomous agent run into hard numbers.
Nothing here asks an agent what it thinks it spent: the token and time figures are read out of the raw agent transcripts, and the artefact figures are read out of git.

They answer two questions about any run — where did the tokens and the time actually go, and what did the run produce for them — and, when you have run the same work two ways, let you set one against the other.

## The tools

| script | reads | writes |
| --- | --- | --- |
| `collect-run-metrics.mjs` | the run's agent transcripts under `~/.claude/projects/.../subagents/workflows/<run>/` | `run-metrics-<label>.{json,md}` |
| `collect-repo-metrics.mjs` | git history and trees | `repo-metrics-<label>.{json,md}` |
| `compare-runs.mjs` | one run and one repo file from each of two runs | `comparison.md` |
| `aggregate-runs.mjs` | every run under `experiments/`, grouped by arm | `experiments/aggregate.{json,md}` |
| `new-run.mjs` | — | an isolated worktree, branch and results directory for one run |

```bash
node .claude/workflows/metrics/collect-run-metrics.mjs  --label alpha
node .claude/workflows/metrics/collect-repo-metrics.mjs --label alpha
```

`collect-run-metrics.mjs` resolves the transcript directory itself: the most recently written workflow run whose agents recorded this repository as their working directory.
Pass `--dir <path>` to measure an older run.

`collect-repo-metrics.mjs` defaults to the range from the parent of the earliest `(STR-n)` commit reachable from `HEAD`.
Pass `--head <rev>` when the run's tip is not checked out, and `--rev <rev>` to override the start.

## What is measured

**Tokens** are kept in the four classes the API bills separately — uncached input, cache write, cache read, output — and never summed into a single "input" figure, because they are not the same price.

**Time** is split into the model generating (first to last record of one response) and everything in between (tool execution and the wait it imposes).
Both are attributed to the work that caused them, so a slow `mvn verify` lands on verification rather than disappearing into a total.

**Requests and tool calls** are counted once per settled message.
A streaming response is written to the transcript twice, so a naive count over the raw records overstates both — for the first full run it reported 669 tool calls against an actual 501.

### Activity — the comparable axis

Every request is attributed whole to the highest-priority bucket among the tools it called.
A request's tokens bought its most consequential action; splitting them across its tool calls would invent precision the usage record does not have.

| bucket | what lands here |
| --- | --- |
| `reporting` | the structured result, or writing a report document |
| `specification` | specs/stories/ADRs under `docs/spec`, and `clew mint` / `clew promote` |
| `traceability` | anchor markers, `clew spec` / `coverage` / `check` — the spec↔code link itself |
| `implementation` | production code under `src/main` |
| `test-authoring` | test code under `src/test` |
| `workspace` | build and tool config (`pom.xml`, `.clewrc.json`, `.claude/`) |
| `verification` | running the build and the suite |
| `version-control` | git |
| `orientation` | reading and searching |
| `deliberation` | a turn that called no tool |

An anchor written inside a brand-new file counts as authoring that file; an anchor added to code that already exists counts as traceability.
That distinction is the difference between "the anchor rode along" and "the anchor was the work".

This axis is deliberately method-agnostic — it classifies what a request **did**, not which tool or skill was active — so a run that keeps no specifications produces the same rows as one that does, and the two can be set against each other.

### Stage — the method axis

Requests are also grouped by the skill in play (`skill:clew-draft`, `skill:clew-implement`, …), or by an explicit `RUN-STAGE:<name>` marker in a shell command.
A run that invokes no skills reports a single stage.
This axis describes the method, so it is reported beside the activity axis and never in place of it.

### Method-specific spend

`specification` + `traceability`.
This is what the run spent on recording and checking intent rather than on the code itself — the part a run driven straight from a work item would not spend at all.
On a run that keeps no specifications it comes out at or near zero, which is the point: the same definition applied to both gives you the difference.

Review tasks are **not** counted here, whatever the run's method.
A review is a phase of the work, not part of the method, and comparing a reviewed run against an unreviewed one measures the review rather than the method.
Give both runs a review, and charge neither of them for it.

## Task attribution

Every agent prompt in the workflow opens with `RUN-TASK-ID: <id>`, and the collector reads it back out of the transcript.
Without it the numbers come back keyed by an opaque agent hash and nothing lines up task-for-task between two runs.
For runs recorded before the tag existed, the collector falls back to recognising the prompt itself; only the tag is authoritative.

## Cost

Optional, and off by default — no price list is baked in, because a stale one is worse than none.

```bash
node .claude/workflows/metrics/collect-run-metrics.mjs --label alpha --rates my-rates.json
```

```json
{
  "claude-opus-5": { "input": 0, "output": 0, "cacheWrite": 0, "cacheRead": 0 },
  "default":       { "input": 0, "output": 0, "cacheWrite": 0, "cacheRead": 0 }
}
```

Rates are per million tokens; fill them from the current price list before trusting the column.

## Repeating a run

One run of an agent is a sample, not a measurement. The same prompt over the same repository produces a different number of reads, a different number of build attempts, and a different total every time — so a single run per arm cannot tell a difference between methods from the ordinary spread of one method against itself.

`new-run.mjs` prepares one repeat in isolation: a fresh git worktree at a fixed base commit, its own branch, and its own results directory in the main repo.
Nothing of the previous run's tree, branch or state is visible to it.

```bash
node .claude/workflows/metrics/new-run.mjs --arm alpha --base alpha-setup
node .claude/workflows/metrics/new-run.mjs --arm beta  --base beta-setup
```

It picks the next free index for the arm (`alpha-01`, `alpha-02`, …), resolves the base ref to a commit hash and prints it — a moving tag would silently make two runs incomparable, and the recorded hash is what proves they were not.
It then prints the exact launch command:

```
Workflow({ name: "reservations-alpha-full-run",
           args: { runLabel: "alpha-02", resultsDir: "…/experiments/alpha/alpha-02", baseRev: "9c1f4ab" } })
```

Run that with the working directory set to the worktree.
The workflow files every artefact under that label, so run N never overwrites run N−1, and writes an `outcome-<label>.json` beside the metrics recording what the run achieved — increments green, final tests, specs covered, confirmed review findings.

```
experiments/
  alpha/
    alpha-01/  run-metrics-… repo-metrics-… outcome-…
    alpha-02/  …
  beta/
    beta-01/   …
```

Then:

```bash
node .claude/workflows/metrics/aggregate-runs.mjs --dir experiments
```

The aggregate reports **mean ± sample standard deviation** and the range for every token partition, per arm, per task — plus the coefficient of variation, so a difference between arms smaller than either arm's own spread is visible as not yet a result.
There are no significance tests: with a handful of runs per arm, a p-value would dress up three samples as a finding.

### Keeping repeats comparable

Each run records its own provenance — branch, head, base commit, the models and efforts that actually served its requests, and whether the working tree was dirty — so a repeat that was not in fact comparable can be spotted afterwards rather than averaged in.
Hold constant: the base commit, the model, the effort, the workflow script, and the input set.
Change one thing at a time, or the arms stop being arms.

## Comparing two runs

Measure each run under its own label, then compare:

```bash
node .claude/workflows/metrics/compare-runs.mjs \
  --a docs/metrics/run-metrics-alpha.json --repo-a docs/metrics/repo-metrics-alpha.json \
  --b docs/metrics/run-metrics-beta.json  --repo-b docs/metrics/repo-metrics-beta.json
```

For a comparison to mean anything the two runs have to differ in one thing and nothing else — same work items, same model, same effort, same starting point, and each branched from its own base rather than one continuing from the other's result.
A dash in the output means the run never entered that bucket, not that it spent zero there.

You do not need this script to compare two runs.
Each run's own `run-metrics-<label>.md` is self-contained — cost by kind of task, by activity, by roll-up and per task — so opening two of them side by side is a legitimate way to read the result, and often a clearer one.

Lines produced is a size measure, not a quality one.
It says what the tokens bought in bulk and nothing about whether the result is correct; the suites, the coverage gate, and the anchoring-review findings are what speak to that.
