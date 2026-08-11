**Title**
Atomic multi-item bookings

**Status**: planned

**Business Value**
A user can reserve several items together for one window as a single atomic booking — either all of them or none,
never a partial booking.
Groups that only make sense together (a room and its projector, a camera and its lenses) can be booked as one unit.

**Problem / Context**
As a user, I want to reserve several items together for one window as a single atomic booking, so that I either get
all of them or none.
Today the engine binds a single item per reservation; there is no way to take several items as one all-or-nothing
unit, so a user can end up with some of what they needed and not the rest.

**Solution Approach**
An atomic multi-item booking confirms a set of existing single-item holds into one reservation covering all their
items for the shared window.
Holds stay single-item; the atomicity lives at confirmation: either every hold in the set is consumed and one
reservation is recorded, or nothing changes at all.
A reservation therefore stops binding exactly one item and starts binding one or more; the confirmed-claim entity is
widened rather than a second, parallel booking type introduced.
Because a confirmation now touches more than one item at once, the whole change is applied as one store operation
that takes the store's single serialization point once, so a confirmation never waits on a second lock and two
concurrent confirmations over overlapping items cannot deadlock.

**Acceptance Criteria**
- Confirming a set of holds for one user, one window, and distinct items produces a single reservation covering exactly those items.
- The confirmation is rejected unless the set is non-empty, every hold is still recorded and unexpired against the injected clock, all holds share one user and one window, and every hold refers to a distinct item.
- On any failure, no hold is consumed or modified and no reservation is created; on success, every hold is consumed and exactly one reservation is created.
- Confirming holds a user already holds consumes no additional quota (the held items become the reserved items).
- Two confirmations whose item sets overlap do not deadlock.
- A multi-item reservation blocks each of its items for its window, and cancelling it frees all of them.
- `mvn verify` is green and `clew coverage` shows every active spec covered.

**Out of scope**
- Bookings whose items span more than one time window.
- Automatically choosing or placing the holds for the user — the holds already exist.
- Partial cancellation — giving back some items of a multi-item reservation while keeping the rest.

## Relations

**Realizes**

- [STK-TMP-001](../specs/STK-TMP-001-all-items-or-none.md) — the all-or-nothing promise this story delivers
- [SYS-TMP-001](../specs/SYS-TMP-001-confirm-hold-set-into-one-reservation.md) — the engine capability
- [SW-TMP-001](../specs/SW-TMP-001-validate-hold-set-before-one-atomic-change.md) — the service behaviour
- [CON-TMP-001](../specs/CON-TMP-001-multi-item-confirmation-never-deadlocks.md) — the contention invariant

**Related**

- [STR-003](STR-003-tentative-holds-with-expiry.md) — the holds this story confirms as a set
- [STR-005](STR-005-per-user-quota.md) — the quota the held-to-reserved transition must leave unchanged
- [ENT-004](../specs/ENT-004-reservation.md) — widened here from one item to one or more
- [CON-002](../specs/CON-002-atomic-confirmation.md) — widened here to the whole hold set
- [CON-003](../specs/CON-003-quota-bound.md) — counted in items, so a confirmation stays quota-neutral
