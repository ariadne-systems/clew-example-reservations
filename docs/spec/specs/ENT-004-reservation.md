**Title**
A Reservation binds exactly one user, item, and window

**Lens**: ENT

**Status**: active

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

- [ENT-001](ENT-001-item.md)
- [ENT-002](ENT-002-time-window.md)
- [ENT-003](ENT-003-user.md)
- [SW-001](SW-001-confirm-service.md)

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
