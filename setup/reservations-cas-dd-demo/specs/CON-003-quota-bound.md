**Title**
A user's active item claims never exceed its quota

**Lens**: CON

**Status**: planned

**Description**
At no point may a user's active item claims — held items from active holds plus reserved items from confirmed
reservations — exceed the quota carried by that user.
The invariant holds across every sequence of place, confirm, expire, release, and cancel.

**Rationale**
The quota is a fair-use bound on the items one user can tie up at once, so it is stated and counted in items —
the items held via active holds plus the items reserved. The count derives from the holds and reservations
themselves (ADR-0003), never from a stored counter.

**Verification Description**
A test drives a user to exactly quota and asserts one further claim is rejected, and asserts that release or expiry
restores headroom — across a sequence of operations, not only at a single step.

## Relations

**Related**

- [ENT-003](ENT-003-user.md)
- [SW-004](SW-004-quota-service.md)
