**Title**
An Item is an identity-only bookable unit

**Lens**: ENT

**Status**: active

**Description**
An Item is a bookable unit with a stable identity and no engine-decided state of its own.
Items are not created or destroyed by the engine; they exist, and two Items are the same exactly when their
identities are equal.

**Rationale**
Keeping all booking state (reservations and computed availability) off the Item means the entity carries no decision
and cannot drift; everything the engine decides lives in the services and the store, not in the thing being booked.

**Verification Description**
A test constructs Items with distinct identities and asserts identity-based equality semantics.

## Relations

**Related**

- [ENT-004](ENT-004-reservation.md)

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
