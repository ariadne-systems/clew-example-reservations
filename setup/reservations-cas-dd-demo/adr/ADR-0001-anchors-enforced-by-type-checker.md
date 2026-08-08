# ADR-0001 — Anchors are enforced by the Java type-checker

## Status
Accepted

## Context
Traceability from code to specification is only worth anything if a dangling reference is impossible to miss.
A comment-based `@req SW-001` link rots silently: the spec can be renamed or deleted and the comment stays, now lying.

## Decision
Each specification becomes a generated, typed symbol emitted by clew.
Production code anchors to the spec it realizes, and tests to the spec they verify, through the trace markers clew generates for this project.
Their exact form is documented in the generated traceables README, which `clew spec` keeps current; this decision points at that single source rather than restating a syntax that would drift when the generator changes.
Because each anchor names a real generated symbol, an anchor to a spec that no longer exists is a symbol that no longer compiles.
The engine borrows the Java type-checker for anchor existence rather than implementing a check of its own.

## Consequences
Renaming or deleting a spec breaks the build at every anchor that still claims it — the drift is caught by the type-checker, not by a review that might miss it.
The guarantee is structural only: the type-checker proves the link is sound, not that the code or test at either end is correct.
That residual risk is caught by human or agent review, not by the compiler.
