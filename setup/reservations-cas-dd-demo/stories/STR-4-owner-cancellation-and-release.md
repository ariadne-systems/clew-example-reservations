**Title**
Owner-initiated cancellation and release

**Status**: planned

**Business Value**
A user who no longer needs an item can hand it back: cancelling a reservation or releasing a hold makes the item
available to others again.
Without this, items stay locked up past their real need and utilisation suffers.

**Problem / Context**
As the user who owns a hold or reservation, I want to cancel it and release the item, so that the item becomes
available again for others.
This covers cancellation of a confirmed reservation and release of an active hold, restricted to the owning user.

**Solution Approach**
The owning user can cancel their reservation or release their active hold; either makes the item available for
that window again.
A user who does not own the hold or reservation cannot cancel or release it.
Cancellation and release go through the store and are atomic (ADR-0002).

**Acceptance Criteria**
- The owning user can cancel their reservation; the item then becomes available for that window again.
- The owning user can release their active hold, with the same effect.
- A user who does not own the hold or reservation cannot cancel or release it.
- Cancellation and release pass through the store and are atomic (ADR-0002).
- Tests cover a non-owner being rejected and availability being restored after cancellation.

**Out of scope**
- Per-user quota.
- Bookings that span more than one item at once.

## Relations

**Realizes**

- [SYS-004](../specs/SYS-004-cancel-release.md)
- [SW-003](../specs/SW-003-cancel-release-service.md)

**Related**

- [ARCH-001](../specs/ARCH-001-state-change-through-store.md)
- [SYS-002](../specs/SYS-002-availability-query.md)
- [STR-3](STR-3-tentative-holds-with-expiry.md)
