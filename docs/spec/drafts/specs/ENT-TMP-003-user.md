**Title**
A User is identified by identity

**Lens**: ENT

**Status**: planned

**Description**
A User is the party that reserves — the one a reservation is bound to — identified by a stable identity.
Two Users are the same exactly when their identities are equal, and the engine decides nothing else about a User on
the single-item reservation path.

**Rationale**
A reservation binds exactly one user, so the engine needs a definite identity to attribute a reservation to; keeping
the User identity-only here means a later usage bound can extend this same entity rather than reshaping it.

**Verification Description**
A test constructs Users with distinct identities and asserts identity-based equality semantics.

## Relations

**Related**

- [ENT-TMP-004](ENT-TMP-004-reservation.md)
