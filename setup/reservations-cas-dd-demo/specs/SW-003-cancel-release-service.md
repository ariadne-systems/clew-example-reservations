**Title**
Cancel/release service verifies ownership before handing the release to the store

**Lens**: SW

**Status**: planned

**Description**
The service permits a cancellation or release only when the requesting user owns the reservation or hold; on
success it hands one atomic release to the store, and on a non-owner request it rejects and changes nothing.

**Rationale**
Ownership is a decision, so it lives in the service; routing the state change through the store (ADR-0002) keeps
release atomic and consistent with every other mutation.

**Verification Description**
A test asserts a non-owner request is rejected and hands no change to the store; an owner request hands exactly one
atomic release and restores availability.

## Relations

**Realizes**

- [SYS-004](SYS-004-cancel-release.md)

**Related**

- [ENT-003](ENT-003-user.md)
- [ENT-004](ENT-004-reservation.md)
- [ENT-005](ENT-005-hold.md)
- [ARCH-001](ARCH-001-state-change-through-store.md)
