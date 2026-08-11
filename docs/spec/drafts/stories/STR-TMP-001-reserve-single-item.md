**Title**
Reserve a single item for a time window

**Status**: planned

**Business Value**
This is the foundational booking capability and the promise the whole engine exists to keep: a user can reserve
an item for a window, and the same item is never booked to two parties for overlapping time.
It is the foundation the rest of the engine is built on.

**Problem / Context**
As a user, I want to reserve a single item for a time window, so that the item is held for me and cannot be
double-booked for an overlapping window.
This story delivers the foundational happy path and its core invariant on the single-item Reservation shape: one
item per reservation.

**Solution Approach**
A user confirms a reservation of one item for one window.
Availability for that item and window is computed from the confirmed reservations that bear on it (ADR-0003), not
looked up in stored state; a confirmation for an item already reserved over an overlapping window is rejected.
The confirmation records completely or not at all: a rejected confirmation leaves the store untouched.

**Acceptance Criteria**
- Confirming an available item for a window succeeds and produces a `Reservation`.
- Availability for that item and window is computed (ADR-0003), not read from stored state.
- A confirmation for an item already reserved over an overlapping window is rejected; adjacent (touching) windows do not overlap and are both allowed.
- A confirmation that fails a check leaves no trace in the store; a successful one records exactly one reservation.
- Every spec this story drives is anchored (`@Realizes` in production code, `@Verifies` in a test), `mvn verify` is green, and `clew coverage` shows each as covered.

**Out of scope**
- Tentative holds and their expiry.
- Owner-initiated cancellation and release.
- Per-user quota.
- Bookings that span more than one item at once.

## Relations

**Realizes**

- [STK-TMP-001](../specs/STK-TMP-001-no-double-booking.md)
- [SYS-TMP-001](../specs/SYS-TMP-001-confirm-reservation.md)
- [SYS-TMP-002](../specs/SYS-TMP-002-availability-query.md)
- [SW-TMP-001](../specs/SW-TMP-001-confirm-service.md)
- [CON-TMP-001](../specs/CON-TMP-001-no-double-booking.md)
- [CON-TMP-002](../specs/CON-TMP-002-atomic-confirmation.md)
- [ARCH-TMP-001](../specs/ARCH-TMP-001-state-change-through-store.md)
- [ARCH-TMP-002](../specs/ARCH-TMP-002-layering.md)
- [ARCH-TMP-003](../specs/ARCH-TMP-003-every-package-is-null-marked.md)
- [ENT-TMP-001](../specs/ENT-TMP-001-item.md)
- [ENT-TMP-002](../specs/ENT-TMP-002-time-window.md)
- [ENT-TMP-003](../specs/ENT-TMP-003-user.md)
- [ENT-TMP-004](../specs/ENT-TMP-004-reservation.md)
