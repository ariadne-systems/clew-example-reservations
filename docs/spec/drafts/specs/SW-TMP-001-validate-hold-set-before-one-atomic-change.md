**Title**
Hold-service checks the whole hold set before handing the store one atomic change

**Lens**: SW

**Status**: planned

**Description**
The hold service confirms a set of holds only after checking the entire set: it is non-empty, every hold is still
recorded in the store, every hold is active at the current instant of the injected clock, all holds carry one user,
all holds carry one window, and no item appears twice.
Every check runs before any change is handed to the store, so a rejection needs no compensation.
Each rejection reason throws its own dedicated exception — a malformed set, an expired hold, and an unknown hold are
distinguished, never collapsed into one.
On success the service hands the store exactly one change that consumes every hold in the set and records one
reservation covering all their items for their window.
Confirming a single hold is the one-element case of this path, not a second path.

**Rationale**
Checking the whole set first is what makes all-or-nothing a property of the decision rather than of clean-up: there
is no window in which part of the set has been consumed and a later check fails.
Handing the result to the store as a single change (ADR-0002) keeps atomicity where every other mutation already
lives, so the service needs no transaction of its own.
The service does not re-check quota: the held items become the reserved items, so the user's active item count is
unchanged and the quota invariant is untouched.
Keeping the single-hold confirmation as the one-element case avoids two implementations of the same decision
drifting apart.

**Verification Description**
Unit tests drive the service with a mocked store and an injected clock: for each rejection reason the test asserts
its own exception type and that no change reached the store; for a valid set the test asserts exactly one store
change that names every hold of the set and one reservation carrying all their items; and a single-hold
confirmation is asserted to take the same path.

## Relations

**Realizes**

- [SYS-TMP-001](SYS-TMP-001-confirm-hold-set-into-one-reservation.md) — the engine capability

**Related**

- [SW-002](SW-002-hold-service.md) — the hold lifecycle this extends
- [CON-002](CON-002-atomic-confirmation.md) — the all-or-nothing invariant it must keep
- [CON-003](CON-003-quota-bound.md) — unchanged by a confirmation, which is why no quota check is made
- [CON-TMP-001](CON-TMP-001-multi-item-confirmation-never-deadlocks.md) — the contention rule for the change it hands over
- [ENT-004](ENT-004-reservation.md) — the reservation it records
- [ENT-005](ENT-005-hold.md) — the holds it consumes
- [ARCH-001](ARCH-001-state-change-through-store.md) — the store owns the change
