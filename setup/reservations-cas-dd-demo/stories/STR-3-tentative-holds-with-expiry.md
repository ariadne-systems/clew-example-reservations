**Title**
Tentative holds with expiry

**Status**: planned

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

This increment revises two specs introduced in STR-2, because a hold is now a second kind of active claim:
- extend **SYS-002** so availability is computed from active holds as well as confirmed reservations;
- extend **CON-001** so an active hold counts as a claim that blocks overlapping windows.
Record each change in that spec's `## Changes` section, stating when and why.

**Acceptance Criteria**
- Placing a hold on an available item for a window succeeds and produces an active `Hold`.
- An active hold makes the item unavailable for overlapping windows while it lasts.
- Once past its expiry instant (evaluated against the injected clock) a hold no longer bears on availability.
- Confirming an active hold produces a `Reservation`; confirming an expired hold is rejected.
- A test advances the clock across the expiry instant and asserts the availability change, with no reliance on real elapsed time.
- SYS-002 and CON-001 are extended to include holds, each with a `## Changes` entry.

**Out of scope**
- Owner-initiated cancellation and release.
- Per-user quota.
- Bookings that span more than one item at once.

## Relations

**Realizes**

- [SYS-003](../specs/SYS-003-place-hold.md)
- [SW-002](../specs/SW-002-hold-service.md)
- [ENT-005](../specs/ENT-005-hold.md)
- [NF-001](../specs/NF-001-deterministic-expiry.md)

**Related**

- [SYS-002](../specs/SYS-002-availability-query.md) — revised by this increment to include holds
- [CON-001](../specs/CON-001-no-double-booking.md) — revised by this increment to include holds
- [STR-2](STR-2-reserve-single-item.md)
