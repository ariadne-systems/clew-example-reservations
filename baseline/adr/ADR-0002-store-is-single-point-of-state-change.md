# ADR-0002 — The store is the single point of state change

## Status
Accepted

## Context
Holds, confirmations, and cancellations all mutate persisted state.
If several components could mutate state directly, atomicity and the "no double-booking" invariant would have to be re-argued at every call site.

## Decision
All persisted state changes go through `store`.
The store serializes each change and guarantees it is atomic.
No component outside `store` mutates persisted state; services compute decisions and hand the change to the store to apply.

## Consequences
Atomicity and contention are reasoned about in exactly one place.
This is the basis for the ArchUnit boundary rule that nothing outside `store` writes state (ADR-0005).
