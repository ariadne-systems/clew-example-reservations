# ADR-0006 — A multi-item change takes the store's serialization point once, instead of per-item locks

## Status
Accepted

## Context
Until now every state change touched exactly one item, so "an operation serializes on the item it touches" and
"an operation serializes on the store" were the same statement, and the store's single monitor satisfied both.

Confirming a set of holds into one reservation breaks that equivalence: the change consumes several holds on
several items and records one reservation over all of them.
Two shapes are available for the atomicity that needs.

1. **Per-item locks.** Each confirmation acquires the lock of every item it touches.
   Correct only while every operation acquires them in one total order — sort by item id, say — and only while
   every operation *added later* keeps doing so.
   Nothing in the build can check that; a future operation that locks two items in the order it happens to read
   them reintroduces the cycle, and the failure shows up as a hang under concurrency, not as a test failure.

2. **One serialization point.** The whole multi-item change is handed to the store as a *single* operation, applied
   under the store's existing single monitor.

## Decision
**D1.** A change that touches several items is expressed as **one** store operation, never as a sequence of
single-item store calls made by a service.
Services compute the whole decision first and hand the store one call that applies all of it.

**D2.** The store applies that call under its single serialization point, taken once.
No operation holds the claim on one item while waiting for the claim on another, so there is no cycle to enter and
no acquisition order to maintain.

**D3.** Per-item locking is rejected for now — not as wrong, but as a guarantee that would rest on a convention
the build cannot enforce.
The constraint it would serve is stated as CON-004, over the property (concurrent confirmations never wait on each
other), so a future move to finer-grained locking changes only how the constraint is met.

## Consequences
Deadlock-freedom becomes structural rather than procedural: it holds by construction for every operation the store
has and every operation it gains, with no ordering rule for a future author to remember.
Atomicity of a multi-item change needs no transaction, undo path, or compensation in the service — it is the same
mechanism every other mutation already uses (ADR-0002).

The cost is contention: unrelated operations on unrelated items serialize against each other.
For a single-process, in-memory engine that is not felt; for a store with real latency inside the critical section
it would be, and that is when this decision should be revisited.

The decision is reversible.
Because CON-004 is stated over the property and not over the mechanism, moving to per-item locks with a total
acquisition order would leave the constraint, its test, and every service unchanged, and touch only the store.
D1 is what makes that possible, and is the part to preserve: a service that made several single-item store calls
would have spread the atomicity decision back out across the services.
