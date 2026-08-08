**Title**
Quota-service rejects a hold or confirmation that would exceed the user's active item quota

**Lens**: SW

**Status**: planned

**Description**
Before a hold is placed or a reservation confirmed, the service counts the user's active item claims — held items
plus reserved items — and rejects the operation when it would take the user over quota; expiry, release, and
cancellation lower the count and can bring the user back under quota.

**Rationale**
The quota bounds items, so the service counts the user's held and reserved items; computing the count from the
holds and reservations (ADR-0003) avoids a second source of truth that could drift.

**Verification Description**
A test drives the count to exactly quota and one over, asserting the boundary is enforced, and asserts that release
or expiry brings a user back under quota.

## Relations

**Realizes**

- [CON-003](CON-003-quota-bound.md)

**Related**

- [ENT-003](ENT-003-user.md)
