**Title**
The engine confirms a set of holds into one reservation covering all their items, or changes nothing

**Lens**: SYS

**Status**: planned

**Description**
The engine accepts a set of the user's existing holds and confirms them, in one operation, into a single
reservation that covers exactly the items those holds bind for their shared window.
It refuses the operation unless the set is non-empty, every hold is still recorded and unexpired against the
injected clock, all holds name one user and one window, and every hold names a distinct item.
A refused operation consumes no hold and creates no reservation; the client observes the same claims it had before.
The resulting reservation blocks every one of its items for that window, and cancelling it frees all of them.

**Rationale**
Confirming holds a user already owns — rather than taking items directly — is what makes the group atomic without a
new reservation path: the holds have already secured the items, so the group operation only has to be all-or-nothing
over claims the user already has.
Expressing the refusal conditions as observable behaviour at the system level is what lets a client rely on them
independently of which service checks them.

**Verification Description**
A system-level test drives the public engine: it places holds on several items for one window, confirms them as a
set, and asserts one reservation covering exactly those items and that each item is now unavailable for that
window; it then asserts that each refusal condition — an empty set, an expired hold, a hold already consumed, two
users, two windows, a repeated item — is rejected and leaves every hold still confirmable afterwards.

## Relations

**Realizes**

- [STK-TMP-001](STK-TMP-001-all-items-or-none.md) — the all-or-nothing promise

**Related**

- [SYS-001](SYS-001-confirm-reservation.md) — the single-item confirmation this sits beside
- [SYS-003](SYS-003-place-hold.md) — the holds this capability consumes
- [SYS-004](SYS-004-cancel-release.md) — cancelling the resulting reservation frees all its items
- [ENT-004](ENT-004-reservation.md) — the reservation shape that covers one or more items
- [SW-TMP-001](SW-TMP-001-validate-hold-set-before-one-atomic-change.md) — the service that decides it
