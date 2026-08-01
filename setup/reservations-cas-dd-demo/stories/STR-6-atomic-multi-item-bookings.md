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
Because a confirmation now touches more than one item at once, the items it locks must be acquired in a stable order
so that two concurrent confirmations on overlapping items cannot deadlock.

**Acceptance Criteria**
- Confirming a set of holds for one user, one window, and distinct items produces a single reservation covering exactly those items.
- The confirmation is rejected unless the set is non-empty, every hold is still active and unexpired against the injected clock, all holds share one user and one window, and every hold refers to a distinct item.
- On any failure, no hold is consumed or modified and no reservation is created; on success, every hold is consumed and exactly one reservation is created.
- Confirming holds a user already holds consumes no additional quota (the held items become the reserved items).
- Two confirmations whose item sets overlap do not deadlock.
- `mvn verify` is green and `clew coverage` shows every active spec covered.

**Out of scope**
- Bookings whose items span more than one time window.
- Automatically choosing or placing the holds for the user — the holds already exist.

## Relations

**Related**

- [STR-3](STR-3-tentative-holds-with-expiry.md)
- [STR-5](STR-5-per-user-quota.md)

## How to run this increment

- **Run it in a clean session.** Start from the built single-item system with no context carried in from other
increments and no notes about what this increment is "supposed" to do — only this story and the code as it stands.
- **Keep a running record as you go.** Note what you do at each step; what the anchored context — the specs and
anchors already in the code — tells you when you build context for the change; and whether that context helped,
misled, or made no difference. Keep the record alongside your work so it can be read afterwards.
