**Title**
Items are never double-booked

**Lens**: STK

**Status**: planned

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

- [SYS-TMP-001](SYS-TMP-001-confirm-reservation.md)
- [CON-TMP-001](CON-TMP-001-no-double-booking.md)
