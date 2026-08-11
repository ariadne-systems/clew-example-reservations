**Title**
A Reservation binds exactly one user, item, and window

**Lens**: ENT

**Status**: planned

**Description**
A Reservation is a confirmed claim binding one user to one item for one time window.

**Rationale**
Fixing the one-user-one-item-one-window shape in the entity is what lets the confirm service, the availability
computation, and the double-booking check all be written against a single, definite structure rather than each
guarding against a shape the entity does not constrain.

**Verification Description**
A test constructs a Reservation and asserts it exposes exactly one user, one item, and one window.

## Relations

**Related**

- [ENT-TMP-001](ENT-TMP-001-item.md)
- [ENT-TMP-002](ENT-TMP-002-time-window.md)
- [ENT-TMP-003](ENT-TMP-003-user.md)
- [SW-TMP-001](SW-TMP-001-confirm-service.md)
