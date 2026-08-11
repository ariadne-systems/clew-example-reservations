**Title**
A Reservation binds one user and one window to a non-empty set of items

**Lens**: ENT

**Status**: active

**Description**
A Reservation is a confirmed claim binding one user to one or more items for one time window.
Its items are a set: never empty, never containing the same item twice, and fixed once the reservation exists.
A reservation of a single item is the one-element case of that set, not a separate shape.

**Rationale**
Fixing the one-user-one-window shape in the entity is what lets the confirm service, the availability computation,
and the double-booking check all be written against a single, definite structure rather than each guarding against
a shape the entity does not constrain.
Carrying the items as a set — rather than adding a second, parallel multi-item booking type — is what makes an
all-or-nothing group booking one recorded claim: there is no partial state to observe, because the items live or
die with the single record that holds them.
The set is non-empty because a claim on nothing is not a claim, and duplicate-free because a repeated item would
double-count against the user's quota and against availability.

**Verification Description**
A test constructs a Reservation over several items and asserts it exposes exactly one user, one window, and
exactly those items; a construction with no items is asserted to be rejected; a single-item construction is
asserted to yield the one-element set.

## Relations

**Related**

- [ENT-001](ENT-001-item.md)
- [ENT-002](ENT-002-time-window.md)
- [ENT-003](ENT-003-user.md)
- [SW-001](SW-001-confirm-service.md)
- [SW-005](SW-005-validate-hold-set-before-one-atomic-change.md)

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
- **2026-08-11** — Widened from exactly one item to a non-empty set of items (STR-006, atomic multi-item bookings).
A group of items booked together must be one confirmed claim, or a failed group booking could leave part of the
group recorded; keeping the items inside the single reservation record is what makes "all or nothing" a property of
the shape rather than of clean-up.
The single-item case is unchanged in meaning — it is now the one-element set — so no existing behaviour is relaxed.
