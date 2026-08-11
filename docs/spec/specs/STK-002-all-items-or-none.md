**Title**
A group of items is booked all together or not at all

**Lens**: STK

**Status**: active

**Description**
When a user needs several items for the same window, the booking is a single unit: the user gets every item or no
item at all.
A booking that would leave the user with some of the group and not the rest is refused outright, and leaves the
user exactly the claims they had before they asked.

**Rationale**
Groups of items are wanted because they only work together — a room without its projector is not half a meeting.
A partial booking is worse than a refusal: it consumes the user's quota and blocks items for a purpose that can no
longer be served, and only the user knows what to do about it.
Stating the promise at the stakeholder level is what lets the system, service, and constraint specs below trace to a
single reason the behaviour must hold.

**Verification Description**
An end-to-end acceptance test drives the public engine to book a group of items in one go and asserts every item of
the group is claimed by the resulting booking; a request that fails a check is refused and asserted to leave every
one of the user's prior claims exactly as it was, with nothing booked.

## Relations

**Related**

- [STK-001](STK-001-no-double-booking.md) — the promise a multi-item booking must not break
- [SYS-005](SYS-005-confirm-hold-set-into-one-reservation.md) — the engine capability that keeps this promise
- [CON-002](CON-002-atomic-confirmation.md) — the invariant that makes all-or-nothing observable

## Changes

- **2026-08-11** — Set active: work on STR-006 (atomic multi-item bookings) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
