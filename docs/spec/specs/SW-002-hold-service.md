**Title**
Hold-service places and expires holds through the store against the injected clock

**Lens**: SW

**Status**: active

**Description**
The hold service places a hold on an item for a window by handing one atomic change to the store, and treats a hold
as active only until its expiry instant, evaluated against the injected clock; an expired hold is neither
confirmable nor counted toward availability.

**Rationale**
Placing the decision in the service and the mutation in the store (ADR-0002) keeps the hold lifecycle in one place;
reading expiry from the injected clock (ADR-0004) makes the active/expired decision deterministic and testable.

**Verification Description**
A test places a hold and asserts exactly one atomic change reached the store; advancing the clock past the expiry
instant asserts the hold is inactive, with no reliance on real elapsed time.

## Relations

**Realizes**

- [SYS-003](SYS-003-place-hold.md)

**Related**

- [ENT-005](ENT-005-hold.md)
- [NF-001](NF-001-deterministic-expiry.md)
- [ARCH-001](ARCH-001-state-change-through-store.md)

## Changes

- **2026-08-11** — Set active: work on STR-003 (tentative holds with expiry) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
