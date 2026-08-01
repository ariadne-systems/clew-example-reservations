# STR-6 — the redesign step (director's notes)

This directory is the **author's material for the last increment, STR-6 — atomic multi-item bookings** — and it is
deliberately **not** part of the single-item seed. It is applied as its own commit, on top of a green STR-1…STR-5,
and it must never be on disk while the STR-6 agent works.

Two commits carry the last step, and the split is the point:

- **The requirement** — `stories/STR-6-atomic-multi-item-bookings.md`, a plain user story. Cherry-pick it after
STR-1…STR-5 are green; it is the **only** thing the implementing agent is given for this increment.
- **This directory** — the expected demonstration (`STR-6-expected-demonstration.md`) and these notes. It is the
**answer key**. Apply it only *after* the agent's work is done, to compare against — never before, and never during.

## Why STR-6 is the payoff

STR-1 through STR-5 build a coherent single-item system; STR-6 changes the domain shape underneath it — a reservation
binds *one* item today, and the redesign makes it bind a *set* of items as one all-or-nothing booking. That is where
the anchored specs earn their keep: the compiler breaks at every anchor tied to the old shape, coverage flips the
revised specs off until they are re-anchored, and — the subtle one — a test whose `@Verifies` still compiles green may
no longer exercise the intent its spec now carries, which only review, walking the anchor back to the spec, catches.

`ADR-0003` (availability is computed, not stored) is a large part of why the redesign stays cheap: there is no stored
availability state to migrate when the reservation shape changes.

## Run it blind

- **Start from the built single-item system**, STR-1…STR-5 green, with no context carried in from other increments
and no notes about what this increment is "supposed" to demonstrate — only the STR-6 story and the code as it stands.
- **Do not show the implementing agent anything in this directory.** The demonstration depends on the agent working
unspoiled: it must derive the spec changes from the plain requirement and the anchors already in the code, not from
this answer key.
- Unlike the earlier increments, STR-6's specs are **not** pre-authored — the agent derives and revises them itself.

## Constructed history

The single-item increments are tagged `res-1 … res-5` (each green). Build the redesign's history from the agent's own
work — the spec surgery it performs — then compare that against the expected demonstration here.
