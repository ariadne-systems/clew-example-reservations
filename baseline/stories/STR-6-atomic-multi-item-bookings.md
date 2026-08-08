**Title**
Atomic multi-item bookings

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
- `mvn verify` is green.

**Out of scope**
- Bookings whose items span more than one time window.
- Automatically choosing or placing the holds for the user — the holds already exist.

## How to run this increment

- **Run it in a clean session.** Start from the built single-item system with no context carried in from other
increments and no notes about what this increment is "supposed" to do — only this story and the code as it stands.
- **Keep a running record as you go.** Note what you do at each step; what the existing code told you when you worked
out what had to change, and where you had to infer intent that the code did not state. Keep the record alongside your
work so it can be read afterwards.
