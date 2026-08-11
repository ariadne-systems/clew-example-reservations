**Title**
The engine places a tentative hold that blocks availability until it expires or is confirmed

**Lens**: SYS

**Status**: planned

**Description**
The engine places a tentative hold on an available item for a window; while active the hold makes the item
unavailable for overlapping windows, and it stops bearing on availability once it expires (evaluated against the
injected clock) or is confirmed into a reservation.

**Rationale**
A tentative hold is the externally-observable capability that lets a user claim an item provisionally; expressing
expiry and confirmation as observable transitions keeps the hold lifecycle something a client can drive,
independent of how the service and store implement it.

**Verification Description**
A system-level test places a hold and asserts the item is unavailable for an overlapping window; advancing the
clock past the expiry instant restores availability; a separate test confirms an active hold into a reservation.

## Relations

**Realizes**

- [STK-001](STK-001-no-double-booking.md)

**Related**

- [SYS-002](SYS-002-availability-query.md)
- [ENT-TMP-001](ENT-TMP-001-hold.md)
- [NF-TMP-001](NF-TMP-001-deterministic-expiry.md)
- [SW-TMP-001](SW-TMP-001-hold-service.md)
