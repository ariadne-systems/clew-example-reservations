**Title**
The engine confirms an available reservation and rejects an overlapping one

**Lens**: SYS

**Status**: planned

**Description**
The engine confirms a reservation of an available item for a window, and rejects a confirmation for an item
already reserved over an overlapping window.

**Rationale**
Confirmation is the engine's primary externally-observable capability; rejecting the overlapping case at this
level is how the stakeholder promise becomes behaviour a client can observe, independent of how the service and
store implement it.

**Verification Description**
A system-level test confirms into an empty schedule and succeeds; a second overlapping confirmation of the same
item is rejected.

## Relations

**Realizes**

- [STK-001](STK-001-no-double-booking.md)

**Related**

- [SW-001](SW-001-confirm-service.md)
- [CON-001](CON-001-no-double-booking.md)
