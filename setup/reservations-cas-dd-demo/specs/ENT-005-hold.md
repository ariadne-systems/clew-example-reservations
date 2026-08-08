**Title**
A Hold is a tentative, expiring claim on an item for a window

**Lens**: ENT

**Status**: planned

**Description**
A Hold is a tentative claim placed by a user on an item for a time window, carrying an expiry instant.
A hold is active until it expires, is confirmed into a reservation, or is released.
Expiry is half-open, like the time window: a hold is active strictly *before* its expiry instant and expired *at and
after* it.
Expiry is evaluated against the injected clock, never against wall-clock time read directly.

**Rationale**
A tentative hold lets a user reserve provisionally without committing; making expiry an instant evaluated against
the injected clock (ADR-0004) keeps the active/expired decision deterministic and testable rather than dependent on
real elapsed time.

**Verification Description**
A test constructs a Hold with an expiry instant and asserts it is active with the clock strictly before that instant,
and expired with the clock set exactly at, and after, the instant.

## Relations

**Related**

- [ENT-001](ENT-001-item.md)
- [ENT-002](ENT-002-time-window.md)
- [ENT-003](ENT-003-user.md)
- [ENT-004](ENT-004-reservation.md)
- [NF-001](NF-001-deterministic-expiry.md)
