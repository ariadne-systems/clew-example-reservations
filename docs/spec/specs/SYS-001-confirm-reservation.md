**Title**
The engine confirms an available reservation and rejects an overlapping one

**Lens**: SYS

**Status**: active

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

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
