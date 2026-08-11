**Title**
Items are never double-booked

**Lens**: STK

**Status**: active

**Description**
No item is ever booked to two parties for overlapping time.
This is the promise the engine exists to keep; a double-booking is a broken promise to a customer.

**Rationale**
Stating the promise at the stakeholder level, above any service or store mechanism, is what lets every lower
spec (system, software, constraint) trace back to a single reason the behaviour must hold.

**Verification Description**
An end-to-end acceptance test drives the public engine to book an item, then asserts a second overlapping
booking of that item is refused.

## Relations

**Related**

- [SYS-001](SYS-001-confirm-reservation.md)
- [CON-001](CON-001-no-double-booking.md)

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
