**Title**
Time-dependent behaviour is deterministic under the injected clock

**Lens**: NF

**Status**: active

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

- [ENT-005](ENT-005-hold.md)
- [SYS-002](SYS-002-availability-query.md)

## Changes

- **2026-08-11** — Set active: work on STR-003 (tentative holds with expiry) began.
The spec is being built now, so it must generate a traceable for the implementation and its test to anchor against.
