**Title**
Tentative holds with expiry

**Business Value**
A user can reserve provisionally without blocking an item forever: a tentative hold gives them time to decide,
and it releases itself if they do not confirm.
This is what makes the engine usable for real booking flows rather than only final commitments.

**Problem / Context**
As a user, I want to place a tentative hold on an item that expires if I do not confirm it, so that I can reserve
provisionally without blocking the item forever.
This introduces a `Hold` as a tentative claim with an expiry instant, and the transitions between hold,
confirmation, and expiry — the first place the injected clock (ADR-0004) drives a decision.

**Solution Approach**
Placing a hold on an available item for a window produces an active `Hold` that makes the item unavailable for
overlapping windows while it lasts.
Expiry is evaluated against the injected clock (ADR-0004): once past its expiry instant a hold is no longer active
and no longer bears on availability.
Confirming an active hold turns it into a `Reservation`; confirming an expired hold is rejected.

A hold is now a second kind of active claim, so two rules established in the previous increment widen here:
availability is computed from active holds as well as confirmed reservations, and an active hold counts as a claim
that blocks overlapping windows.
Both widened rules need their tests widened with them — a test that still only exercises reservations no longer
covers the rule it is named for.

**Acceptance Criteria**
- Placing a hold on an available item for a window succeeds and produces an active `Hold`.
- An active hold makes the item unavailable for overlapping windows while it lasts.
- Once past its expiry instant (evaluated against the injected clock) a hold no longer bears on availability.
- Confirming an active hold produces a `Reservation`; confirming an expired hold is rejected.
- A test advances the clock across the expiry instant and asserts the availability change, with no reliance on real elapsed time.
- The availability computation and the no-double-booking invariant both account for active holds, and their tests exercise holds and not only reservations.

**Out of scope**
- Owner-initiated cancellation and release.
- Per-user quota.
- Bookings that span more than one item at once.
