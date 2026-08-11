**Title**
No item is bound by two active claims over overlapping windows

**Lens**: CON

**Status**: active

**Description**
At no point may an item be bound by two active claims over overlapping windows.
An active claim is a confirmed reservation or a hold that has not yet reached its expiry instant, evaluated against
the injected clock; an expired hold is not a claim and blocks nothing.
The invariant holds across every sequence of operations — placing a hold, confirming it, confirming directly —
not only at the moment of a single confirmation.

**Rationale**
Stating the rule as a standing invariant — rather than as a check buried in the confirm path — makes it
independently verifiable and keeps it true no matter which operation is added later; it derives directly from the
stakeholder promise (STK-001) that items are never double-booked.

**Verification Description**
A test attempts an overlapping reservation after a first is established and asserts rejection, and asserts the
invariant holds across a sequence of operations.
The sequence includes a hold: an overlapping hold and an overlapping confirmation are both rejected while the hold
is active, confirming the hold leaves exactly one claim on the window, and an overlapping claim is admitted only
once the hold has expired.

## Relations

**Realizes**

- [SYS-001](SYS-001-confirm-reservation.md)

**Related**

- [STK-001](STK-001-no-double-booking.md)
- [ENT-002](ENT-002-time-window.md)
- [ENT-005](ENT-005-hold.md)
- [SYS-003](SYS-003-place-hold.md)

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
- **2026-08-11** — Widened the invariant from reservations to active claims, so an active hold counts as a claim
that blocks overlapping windows (STR-003, tentative holds with expiry).
A hold binds the item just as a reservation does while it lasts, so an invariant phrased over reservations alone
would leave the hold path free to double-book.
Naming expiry as the boundary of a claim is what keeps the invariant true without freezing an expired hold's window
forever.
