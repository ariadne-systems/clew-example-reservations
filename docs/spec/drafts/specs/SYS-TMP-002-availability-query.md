**Title**
The engine reports availability computed from reservations, never from stored state

**Lens**: SYS

**Status**: planned

**Description**
The engine reports whether an item is available for a window, computed from the confirmed reservations that bear on
that window rather than from any stored availability state.

**Rationale**
A stored availability flag would be a second source of truth that can drift from the reservations it summarizes and
would have to be kept in sync on every change; deriving it on demand keeps the reservations the
single source of truth (ADR-0003).

**Verification Description**
A test asserts an item is available for a window until a confirmed reservation covers an overlapping window, then
unavailable — availability computed on demand, with no availability state persisted.

## Relations

**Realizes**

- [STK-TMP-001](STK-TMP-001-no-double-booking.md)

**Related**

- [ENT-TMP-002](ENT-TMP-002-time-window.md)
