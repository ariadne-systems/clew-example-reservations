**Title**
A User is identified by identity

**Lens**: ENT

**Status**: active

**Description**
A User is the party that reserves — the one a reservation is bound to — identified by a stable identity, and
carrying the quota that bounds its active item claims.
Two Users are the same exactly when their identities are equal: the quota is a property of the User, never part of
its identity, so two Users with the same identity and different quotas are the same User.
A User may be unbounded — carrying no effective bound — and the engine decides nothing else about a User.

**Rationale**
A reservation binds exactly one user, so the engine needs a definite identity to attribute a reservation to.
The quota lives on the User because it bounds that one party's claims and nothing else, and keeping it out of
identity means changing a user's quota never turns them into a different user — the reservations and holds already
attributed to them stay theirs.

**Verification Description**
A test constructs Users with distinct identities and asserts identity-based equality semantics, including that two
Users with the same identity but different quotas are equal and hash alike.

## Relations

**Related**

- [ENT-004](ENT-004-reservation.md)
- [CON-003](CON-003-quota-bound.md)

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
- **2026-08-11** — The User now carries the quota that bounds its active item claims (STR-005).
The fair-use bound applies per user, so the User is the one place the bound can live without introducing a second
source of truth; the original spec anticipated this ("a later usage bound can extend this same entity").
Identity semantics are deliberately unchanged — the quota is stated explicitly as outside identity, so that
changing a user's quota does not detach the claims already attributed to them.
