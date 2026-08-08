**Title**
Set up the reservations workspace

**Business Value**
A working, checkable skeleton is the ground every later increment builds on: the build compiles, the tests run, and the
architecture boundaries are enforced — so each domain story can be implemented against a green build instead of first
fighting the toolchain.

**Problem / Context**
As the developer bootstrapping this engine, I want the workspace stood up to the technology contract and the
architecture overview, so that the first domain increment can be implemented against a green build.
There is no source, no build, and no architecture tests yet — only the design surface (the architecture overview and
the testing notes).

**Solution Approach**
Stand up the build and the module skeleton to the technology contract and the architecture: the package structure the
architecture names, each package null-marked; the single state-change marker owned by the store; and the
architecture-boundary rules as mechanically checkable tests — all compiling green.

**Acceptance Criteria**
- The project builds and `mvn verify` is green.
- The module/package structure matches the architecture overview, and every package carries a `@NullMarked` `package-info`.
- The architecture-boundary rules are present as tests: entities depend on nothing above them; the api may not access the store; `@MutatesState` methods are declared only in the store; every package carries a `@NullMarked` `package-info`.

**Out of scope**
- Any domain behaviour — reserving, holds, cancellation, quota, multi-item bookings. Those are the domain increments.
