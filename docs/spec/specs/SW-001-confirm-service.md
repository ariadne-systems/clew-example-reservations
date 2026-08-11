**Title**
Confirm-service computes availability then hands one atomic change to the store

**Lens**: SW

**Status**: active

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

- [SYS-001](SYS-001-confirm-reservation.md)

**Related**

- [CON-001](CON-001-no-double-booking.md)
- [CON-002](CON-002-atomic-confirmation.md)
- [ENT-004](ENT-004-reservation.md)
- [ARCH-001](ARCH-001-state-change-through-store.md)

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
