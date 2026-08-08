# ADR-0003 — Availability is computed, not stored

## Status
Accepted

## Context
Availability of an item for a window could be maintained as stored state, updated on every hold and confirmation.
Stored availability is a second source of truth that can drift from the holds and reservations it is supposed to summarize, and it must be kept in sync on every change that bears on it.

## Decision
Availability is not stored.
For a given item and window it is computed on demand from the active holds and confirmed reservations that bear on that window.

## Consequences
There is one source of truth: the holds and reservations themselves.
The cost is recomputation on query; acceptable for an example, and revisitable behind the same interface if it ever mattered.
