**Title**
Time-dependent behaviour is deterministic under the injected clock

**Lens**: NF

**Status**: planned

**Description**
Every time-dependent decision is evaluated against the injected clock, so behaviour is fully determined by clock
state and never by wall-clock time.

**Rationale**
A component that reads wall-clock time directly is untestable at the boundary that matters — hold expiry — and
makes tests time-dependent and flaky; obtaining time only from the injected clock (ADR-0004) makes expiry
deterministic and testable.

**Verification Description**
A test advances the clock across a hold's expiry instant and asserts the resulting availability change, with no
reliance on real elapsed time.

## Relations

**Related**

- [ENT-TMP-001](ENT-TMP-001-hold.md)
- [SYS-002](SYS-002-availability-query.md)
