**Title**
Per-user fair-use quota

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

The `User` now carries the quota that bounds its active claims.
Its identity semantics do not change: two users are equal exactly when their ids are equal.

**Acceptance Criteria**
- Placing a hold or confirming a reservation that would exceed the user's quota (counted in item claims) is rejected.
- Expiry, release, and cancellation reduce the active item count and can bring a user back under quota.
- The active item count is computed from holds and reservations, with no second source of truth (ADR-0003).
- Tests cover the boundary at exactly quota and one over quota.
- The `User` carries the quota, and two users are still equal exactly when their ids are equal.

**Out of scope**
- Bookings that span more than one item at once.
