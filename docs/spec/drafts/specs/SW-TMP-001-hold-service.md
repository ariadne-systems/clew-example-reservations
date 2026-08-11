**Title**
Hold-service places and expires holds through the store against the injected clock

**Lens**: SW

**Status**: planned

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

- [SYS-TMP-001](SYS-TMP-001-place-hold.md)

**Related**

- [ENT-TMP-001](ENT-TMP-001-hold.md)
- [NF-TMP-001](NF-TMP-001-deterministic-expiry.md)
- [ARCH-001](ARCH-001-state-change-through-store.md)
