**Title**
A confirmation records completely or not at all

**Lens**: CON

**Status**: active

**Description**
A confirmation either records the reservation completely or leaves the store untouched; no partial reservation is
ever observable.
A confirmation that fails a check leaves no trace in the store.
"Completely" spans the whole confirmation, however many items and holds it covers: a confirmation over a set of
holds either consumes every hold in the set and records one reservation over all their items, or consumes no hold
and records nothing.
There is no intermediate state in which some of the holds are gone, and none is observable to a concurrent reader.

**Rationale**
Because every state change goes through the store, which serializes and applies it atomically (ADR-0002),
atomicity can be stated once as a standing invariant rather than re-argued at each confirmation; a partially
recorded reservation would let a later read observe a booking the engine never completed.
Stating the invariant over the whole set is what makes a group booking all-or-nothing without a compensating
undo path: a half-consumed set would strand the user's remaining holds against items they can no longer use.

**Verification Description**
A test asserts that a confirmation which fails a check leaves no trace in the store, and that a successful
confirmation records exactly one complete reservation.
For a set of holds, a test asserts that a confirmation failing any one of its checks consumes none of the holds and
records no reservation, and that a successful one hands the store a single change consuming every hold and
recording one reservation over all their items.

## Relations

**Related**

- [SW-001](SW-001-confirm-service.md)
- [ARCH-001](ARCH-001-state-change-through-store.md)
- [SW-005](SW-005-validate-hold-set-before-one-atomic-change.md)
- [CON-004](CON-004-multi-item-confirmation-never-deadlocks.md)

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
- **2026-08-11** — Widened from a single reservation to the whole confirmation, however many holds and items it
covers (STR-006, atomic multi-item bookings).
A confirmation now consumes a set of holds at once, so an invariant phrased over one record would leave the case
that actually needs it — a set half-consumed when a later check fails — unstated.
Naming the hold set as part of what "completely" spans is what keeps a group booking all-or-nothing without a
compensating undo path.
