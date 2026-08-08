**Title**
The engine lets the owning user cancel a reservation or release a hold, restoring availability

**Lens**: SYS

**Status**: planned

**Description**
The owning user can cancel their confirmed reservation or release their active hold; either makes the item
available again for that window.
A user who does not own the claim cannot cancel or release it.

**Rationale**
Cancellation and release are the externally-observable capability that returns an item to the pool before its claim
would otherwise end; restricting them to the owning user is the observable rule a client can rely on.

**Verification Description**
A system-level test cancels a reservation and asserts availability is restored for that window; a non-owner attempt
is rejected; releasing an active hold has the same effect.

## Relations

**Related**

- [ENT-004](ENT-004-reservation.md)
- [ENT-005](ENT-005-hold.md)
- [SW-003](SW-003-cancel-release-service.md)
