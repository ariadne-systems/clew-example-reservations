# ADR-0004 — A single injected clock is the only time source

## Status
Accepted

## Context
Holds expire.
Any component that reads wall-clock time directly is untestable at the boundary that matters — expiry — and makes tests time-dependent and flaky.

## Decision
Time is obtained only from an injected `clock`.
The `clock` is a narrow **domain port** in the `clock` package — an interface exposing the current instant — not `java.time.Clock` used directly.
This is the one platform facility the engine deliberately wraps, and the wrap is justified rather than speculative (002): the clock genuinely varies — a system-backed clock in production, a mutable clock in tests — and NF-001 requires that variation be controllable for deterministic expiry.
No component reads system time (`Instant.now()`) directly; hold expiry, and any other time-dependent decision, is evaluated against this clock.

## Consequences
Expiry behaviour (STR-3) is deterministic and testable: a test advances the clock and asserts.
The clock is a construction-time dependency injected into services and the store, not a runtime actor the engine negotiates with.
