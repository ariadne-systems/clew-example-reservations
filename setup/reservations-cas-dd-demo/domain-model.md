# Domain model

This document names the entities and their shape in the reservation engine.
Each entity is an ENT spec; the record or class that realizes it anchors with `@Realizes`.

## Item (ENT-001)

A bookable unit.
It has an identity and nothing else the engine decides on.
Items are not created or destroyed by the engine in this example; they exist.

## TimeWindow (ENT-002)

A half-open interval `[start, end)` on the injected clock's timeline.
Two windows either overlap or they do not; overlap is the only relation the engine asks about.
Adjacent (touching) windows such as `[10:00, 11:00)` and `[11:00, 12:00)` do not overlap.
A window with `end <= start` is not a valid window.

## User (ENT-003)

The party that holds and confirms.
It has an identity and a quota that bounds how much it may hold and reserve at once.
Time is read only from the injected clock (ADR-0004).

## Reservation (ENT-004)

A confirmed claim binding one user to one item for one time window.

## Hold (ENT-005)

A tentative claim on an item for a window, placed by a user, with an expiry instant.
A hold is active until it expires, is confirmed into a reservation, or is released.
Expiry is evaluated against the injected clock, never against wall-clock time read directly.

## Availability — not an entity

Availability is not stored and is therefore not an entity.
For a given item and window it is computed from the active holds and confirmed reservations that bear on that window (ADR-0003).
Because availability is derived, there is no stored availability state to keep in sync.
