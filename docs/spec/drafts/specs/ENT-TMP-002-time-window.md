**Title**
A TimeWindow is a half-open interval whose only relation is overlap

**Lens**: ENT

**Status**: planned

**Description**
A TimeWindow is a half-open interval `[start, end)` on the injected clock's timeline; `end` must be strictly
after `start`.
The only relation the engine asks of two windows is whether they overlap; adjacent (touching) windows such as
`[10:00, 11:00)` and `[11:00, 12:00)` do not overlap.

**Rationale**
Half-open intervals make adjacency unambiguous — a window ending exactly when another begins does not conflict —
so the double-booking check has one clear rule and no off-by-one at the boundary; rejecting `end <= start` removes
degenerate windows before they reach any decision.

**Verification Description**
A test asserts overlap for partially-overlapping and nested windows, non-overlap for adjacent windows such as
`[10:00, 11:00)` and `[11:00, 12:00)`, and rejection of a window with `end <= start`.

## Relations

**Related**

- [CON-TMP-001](CON-TMP-001-no-double-booking.md)
- [ENT-TMP-004](ENT-TMP-004-reservation.md)
