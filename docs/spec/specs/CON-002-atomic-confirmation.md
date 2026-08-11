**Title**
A confirmation records completely or not at all

**Lens**: CON

**Status**: active

**Description**
A confirmation either records the reservation completely or leaves the store untouched; no partial reservation is
ever observable.
A confirmation that fails a check leaves no trace in the store.

**Rationale**
Because every state change goes through the store, which serializes and applies it atomically (ADR-0002),
atomicity can be stated once as a standing invariant rather than re-argued at each confirmation; a partially
recorded reservation would let a later read observe a booking the engine never completed.

**Verification Description**
A test asserts that a confirmation which fails a check leaves no trace in the store, and that a successful
confirmation records exactly one complete reservation.

## Relations

**Related**

- [SW-001](SW-001-confirm-service.md)
- [ARCH-001](ARCH-001-state-change-through-store.md)

## Changes

- **2026-08-11** — Set active: work on STR-002 (reserve a single item for a time window) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
