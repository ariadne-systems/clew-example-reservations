# Testing Contract — reservations

This contract is self-contained: everything the project's tests must obey is stated here.

---

## 1. Approach — the skills this project follows

This project does not define its own development method.
Load these installed skills with the Skill tool and follow them:

- `superpowers:test-driven-development` — before writing any implementation code.
- `superpowers:systematic-debugging` — on any bug, test failure, or unexpected behaviour, before proposing a fix.
- `superpowers:verification-before-completion` — before claiming an increment complete, and before committing.

The skills govern the method. The sections below state only this project’s own conventions.

---

## 2. Test levels

Three levels, each with its own job and its own lenses.

### UNIT

A single service or entity in isolation, its collaborators mocked with Mockito.

Verifies **SW**, **ENT** and **CON** specs.
Lives beside the package under test — `src/test/java/io/example/reservations/<package>/`.

### APPLICATION

The `ReservationEngine` facade driven end-to-end through its public API.

- The real object graph, assembled at the composition root, with an injected test clock.
- **No mocks.**
- Asserts observable behaviour only — what a caller of the facade can see. Never an internal call, never a store internal.
- Named for the scenario it plays out, not for a method.

Verifies **STK** and **SYS** specs.

### ARCHITECTURE

ArchUnit rules over the compiled classes, run as ordinary tests in `mvn verify`.

Verifies **ARCH** specs.
Lives in `src/test/java/io/example/reservations/architecture/`.

---

## 3. Stack and conventions

- JUnit 5 (Jupiter) + Mockito + AssertJ.
- `@ExtendWith(MockitoExtension.class)` for unit tests that need mocks; declare `@Mock` fields rather than building mocks in a lifecycle method.
- `@Mock` fields end in `Mock` (`reservationStoreMock`), `@Spy` fields in `Spy`, `@Captor` fields in `Captor`.
- No `@DisplayName` — the class and method names carry the description.
- No `Mockito.lenient()`; mock only what the test actually needs.
- Lifecycle methods are named after their annotation: `@BeforeEach` → `beforeEach`, `@AfterEach` → `afterEach`, `@BeforeAll` → `beforeAll`, `@AfterAll` → `afterAll`.
- With `assertThatThrownBy`, the lambda contains only the call under test; hoist anything else that could throw into a field or local.

---

## 4. Anchoring

A test that exercises a **spec** carries a `@Verifies` anchor to that spec.

Tests for code that no spec covers — helpers, extra edge cases, plumbing, defensive paths — are **ordinary tests with no anchor**.
That is the normal case, not a gap.

Never force a `@Verifies` where there is no spec that the test actually exercises.
A forced anchor is a false claim, not coverage: it tells the next reader that a requirement is checked when nothing of the kind was written down.

Do not overreach in the other direction either.
Anchor the test that genuinely exercises the spec; do not sprinkle the same spec across every test that happens to touch the code.

---

## 5. Coverage — two independent gates

The suite runs with `mvn -B verify`.

**Gate one — spec coverage.**
Every `active` spec is **Covered**: it has production code anchored `@Realizes` and a test anchored `@Verifies`.
This is the spec → test direction: it asks whether each requirement has a check, and is reported by `clew coverage`.

**Gate two — line coverage.**
LINE coverage of `io.example.reservations` is **at least 80%**, measured by JaCoCo and enforced in `verify`.
Excluded from the measurement: the clew traceables, `package-info` classes, and the `@MutatesState` marker annotation — generated or declarative code with no behaviour to exercise.
This gate is reached by the spec-anchored tests **and** the ordinary tests together.

The two gates are independent.
Neither implies the other, and passing one is not an argument for skipping work on the other.

---

## 6. Determinism

Time is read only from the injected clock (ADR-0004).
No test — and no production class — calls `Instant.now()` or any other wall-clock source.
A test that depends on time advances the injected clock and asserts; it never sleeps and never races.

Tests are independent of one another and of execution order.
