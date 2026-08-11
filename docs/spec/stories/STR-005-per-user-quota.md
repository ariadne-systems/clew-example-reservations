**Title**
Per-user fair-use quota

**Status**: done

**Business Value**
No single user can monopolise the items: a per-user quota bounds how much anyone may hold and reserve at once, so
the pool stays fairly shared across users.

**Problem / Context**
As the operator of the engine, I want each user's active item claims bounded by a quota, so that no single user
can monopolize the items.
A user's active count is the number of active item claims they hold — held items (from active, unexpired holds)
plus reserved items (from confirmed reservations) — deliberately **not** the number of `Hold` plus `Reservation`
objects.
Stating the invariant in item terms keeps it correct however a claim is shaped.

**Solution Approach**
Placing a hold or confirming a reservation that would take the user's active item count over quota is rejected.
Expiry, release, and cancellation reduce the active item count and can bring a user back under quota.
The active item count is computed from holds and reservations — no second source of truth — consistent with
ADR-0003.

This increment revises **ENT-003**, introduced in STR-002: the User now carries the quota that bounds its active
claims.
Record the change in ENT-003's `## Changes` section, stating when and why.

**Acceptance Criteria**
- Placing a hold or confirming a reservation that would exceed the user's quota (counted in item claims) is rejected.
- Expiry, release, and cancellation reduce the active item count and can bring a user back under quota.
- The active item count is computed from holds and reservations, with no second source of truth (ADR-0003).
- Tests cover the boundary at exactly quota and one over quota.
- ENT-003 is extended to carry the quota, with a `## Changes` entry.

**Out of scope**
- Bookings that span more than one item at once.

## Relations

**Realizes**

- [CON-003](../specs/CON-003-quota-bound.md)
- [SW-004](../specs/SW-004-quota-service.md)

**Related**

- [ENT-003](../specs/ENT-003-user.md) — revised by this increment to carry the quota
- [STR-003](STR-003-tentative-holds-with-expiry.md)
- [STR-004](STR-004-owner-cancellation-and-release.md)
