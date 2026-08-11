**Title**
No item is bound by two active reservations over overlapping windows

**Lens**: CON

**Status**: planned

**Description**
At no point may an item be bound by two active reservations over overlapping windows.
The invariant holds across every sequence of operations, not only at the moment of a single confirmation.

**Rationale**
Stating the rule as a standing invariant — rather than as a check buried in the confirm path — makes it
independently verifiable and keeps it true no matter which operation is added later; it derives directly from the
stakeholder promise (STK-TMP-001) that items are never double-booked.

**Verification Description**
A test attempts an overlapping reservation after a first is established and asserts rejection, and asserts the
invariant holds across a sequence of operations.

## Relations

**Realizes**

- [SYS-TMP-001](SYS-TMP-001-confirm-reservation.md)

**Related**

- [STK-TMP-001](STK-TMP-001-no-double-booking.md)
- [ENT-TMP-002](ENT-TMP-002-time-window.md)
