**Title**
The engine reports availability computed from active holds and reservations, never from stored state

**Lens**: SYS

**Status**: active

**Description**
The engine reports whether an item is available for a window, computed from the claims that bear on that window —
the confirmed reservations and the holds still active against the injected clock — rather than from any stored
availability state.
A hold that has passed its expiry instant is not an active claim and does not bear on availability.

**Rationale**
A stored availability flag would be a second source of truth that can drift from the claims it summarizes and
would have to be kept in sync on every change; deriving it on demand keeps the reservations and holds the
single source of truth (ADR-0003).
Computing it on demand is also what lets an expiring hold stop blocking without any state change: the answer follows
the clock rather than a stored flag someone would have to clear.

**Verification Description**
A test asserts an item is available for a window until a confirmed reservation covers an overlapping window, then
unavailable — availability computed on demand, with no availability state persisted.
A further test asserts an active hold over an overlapping window makes the item unavailable, and that advancing the
clock past that hold's expiry instant restores availability with no state change in between.

## Relations

**Realizes**

- [STK-001](STK-001-no-double-booking.md)

**Related**

- [ENT-002](ENT-002-time-window.md)
- [ENT-005](ENT-005-hold.md)
- [NF-001](NF-001-deterministic-expiry.md)
- [SYS-003](SYS-003-place-hold.md)

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
- **2026-08-11** — Widened availability to be computed from active holds as well as confirmed reservations
(STR-003, tentative holds with expiry).
A hold is a second kind of claim on an item, so an availability answer derived from reservations alone would report
a held item as free and let the engine double-book it.
Stating that expiry is evaluated against the injected clock keeps the answer deterministic and is what makes an
expired hold stop blocking without any state change.
