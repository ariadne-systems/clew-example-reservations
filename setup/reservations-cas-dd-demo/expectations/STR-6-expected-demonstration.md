# STR-6 — expected demonstration (author's answer key)

> **Do not give this file to the agent implementing STR-6.**
> It describes what the increment is *expected* to demonstrate. The whole point of
> STR-6 is to observe whether an unspoiled agent, working only from the plain
> requirement in `stories/STR-6-atomic-multi-item-bookings.md`, hits these
> mechanisms — and, above all, whether it notices the stale verifier on its own.
> If the agent has read this file, that observation is worthless.

## Why STR-6 is run clean-session, with a journal

Three of the four mechanisms below are mechanical: they happen because of what the
compiler and `clew` do, so foreknowledge does not fake them. The fourth is different —
its entire claim is that *no tool* catches it and only a reviewer might. That is only
demonstrated if the reviewer was **not told in advance**. So STR-6 must be run by an
agent with a clean session, working from the plain requirement, keeping a running record
of what it does, what the anchored context tells it at each step, and whether that helped —
so the "did it catch the stale verifier?" moment is a genuine observation, not a script
being followed. Compare the agent's journal against this file afterwards.

## The redesign, and the specs it is expected to produce

The single-item system binds one item per reservation. STR-6 makes a booking span a set
of items, atomically. An unspoiled agent is expected to derive, during the increment:

- a multi-item Reservation entity (single item → non-empty set of distinct items),
  **replacing** the single-item reservation entity `ENT-004`;
- a constraint that multi-item confirmation is atomic (all holds consumed + one
  reservation, or nothing);
- a constraint that item locks are acquired in a stable total order (deadlock-free), with
  an ADR recording the lock-ordering decision — the seam `architecture.md` left open.

## The four distinct mechanisms — do not conflate them

The redesign is convincing precisely because each catches a *different* class of problem.
CAS-DD is responsible for two of the four; the demo must not claim otherwise.

1. **Java compilation — not CAS-DD.** Changing the reservation's shape
   (`Reservation.item()` → `Reservation.items()`) breaks every call site written against
   the old model. Ordinary Java type errors; they happen with or without clew.
2. **Specification lifecycle — CAS-DD.** *Deprecate* the single-item entity (its symbol
   remains, so existing anchors still compile while you migrate); *add* the multi-item
   entity (reports `none` until anchored); *migrate* anchors; *delete* the old entity once
   no anchor names it — regenerating then removes the symbol, and any stale anchor fails to
   compile. Deletion is the final mechanical check.
3. **Coverage — CAS-DD.** The new and revised specs report `none` until code and tests
   re-anchor. `clew coverage` is the checklist for closing them.
4. **Review — the honest edge, no tool catches it.** The no-double-booking constraint
   (`CON-001`) stays valid and its `@Verifies` test stays green — yet after the redesign it
   only exercises single-item input, so it no longer demonstrates the invariant across the
   new multi-item path. Spec valid, anchor valid, test green — and nonetheless insufficient.
   **Only a human or agent review catches this.** *This is the observation STR-6 exists to
   make.* Whether the unspoiled agent notices it — or misses it — is the result to report,
   honestly, either way.

## Suggested constructed history (git tags)

```
res-5                single-item system, all green
res-6-spec-change    deprecate old entity; add multi-item entity + the two constraints + ADR;
                     new specs report none; old anchors still compile but are deprecated
res-6-broken         Reservation.item() -> items(); Java call sites fail to compile
res-6-migrated       move anchors to the multi-item entity; coverage closes;
                     review catches the stale CON-001 verifier and extends it to multi-item
res-6-complete       delete the old entity; regenerate + compile to prove no obsolete anchor remains
```
