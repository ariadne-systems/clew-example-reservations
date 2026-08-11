**Title**
Confirm-service computes availability then hands one atomic change to the store

**Lens**: SW

**Status**: planned

**Description**
The reservation service computes availability, and if the item is free for the window, hands a single atomic state
change to the store that records the reservation.
The service owns the decision; the store owns applying the change.

**Rationale**
Placing the decision in the service and the mutation in the store (ADR-0002) keeps atomicity and contention
reasoned about in one place instead of at every call site, and keeps the service free of persistence mechanics.

**Verification Description**
A test drives the service against a free schedule and asserts the store received exactly one atomic change; against
an occupied schedule it asserts no change is handed to the store.

## Relations

**Realizes**

- [SYS-TMP-001](SYS-TMP-001-confirm-reservation.md)

**Related**

- [CON-TMP-001](CON-TMP-001-no-double-booking.md)
- [CON-TMP-002](CON-TMP-002-atomic-confirmation.md)
- [ENT-TMP-004](ENT-TMP-004-reservation.md)
- [ARCH-TMP-001](ARCH-TMP-001-state-change-through-store.md)
