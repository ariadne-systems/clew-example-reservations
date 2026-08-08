**Title**
State change only through the store

**Lens**: ARCH

**Status**: planned

**Description**
No component outside the store package mutates persisted state; every state change passes through the store,
which serializes it and applies it atomically.

**Rationale**
Routing every mutation through one component (ADR-0002) means atomicity and the no-double-booking guarantee are
reasoned about in exactly one place, rather than re-argued at each service that changes state — and it is the
basis for the ArchUnit rule that nothing outside the store writes state.

**Verification Description**
An ArchUnit test asserts that no write access to persisted state originates outside the store package.

## Relations

**Related**

- [SW-001](SW-001-confirm-service.md)
- [ARCH-002](ARCH-002-layering.md)
