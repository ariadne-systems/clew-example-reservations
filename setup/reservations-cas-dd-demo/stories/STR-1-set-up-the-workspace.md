**Title**
Set up the reservations workspace

**Status**: planned

**Business Value**
A working, checkable skeleton is the ground every later increment builds on: the build compiles, the tests run, the
architecture boundaries are enforced, and clew can generate and check traceables — so each domain story can be
drafted, implemented and anchored against a green build instead of first fighting the toolchain.

**Problem / Context**
As the developer bootstrapping this engine, I want the workspace stood up to the technology contract and the
architecture overview, so that the first domain increment can be drafted, promoted, implemented and anchored against
a green build.
There is no source, no build, and no architecture tests yet — only the design surface (the technology contract, the
architecture overview, the ADRs, and the domain model).

**Solution Approach**
Stand up the build and the module skeleton to the technology contract and the architecture: the package structure the
architecture names, each package null-marked; the single state-change marker owned by the store; and the
architecture-boundary rules as mechanically checkable tests — all compiling green, with clew generating cleanly and
`clew check` passing.
The boundary tests are written now but stay unanchored until the ARCH specs that govern them are authored in the
first domain increment.

**Acceptance Criteria**
- The project builds and `mvn verify` is green.
- The module/package structure matches the architecture overview, and every package carries a `@NullMarked` `package-info`.
- The architecture-boundary rules are present as tests, unanchored for now — their ARCH specs arrive with the first domain increment.
- `clew` generates without error and `clew check` passes.

**Out of scope**
- Any domain behaviour — reserving, holds, cancellation, quota, multi-item bookings — and the specs that describe it. Those are the domain increments.

## Relations

This increment stands up the workspace and authors no specs of its own; the specs the code is checked against are
authored from the first domain increment on.
