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

Three levels, each with its own job.

### UNIT

A single service or entity in isolation, its collaborators mocked with Mockito.

Lives beside the package under test — `src/test/java/io/example/reservations/<package>/`.

### APPLICATION

The `ReservationEngine` facade driven end-to-end through its public API.

- The real object graph, assembled at the composition root, with an injected test clock.
- **No mocks.**
- Asserts observable behaviour only — what a caller of the facade can see. Never an internal call, never a store internal.
- Named for the scenario it plays out, not for a method.


### ARCHITECTURE

ArchUnit rules over the compiled classes, run as ordinary tests in `mvn verify`.

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

## 4. Coverage

The suite runs with `mvn -B verify`.

LINE coverage of `io.example.reservations` is **at least 80%**, measured by JaCoCo and enforced in `verify`.
Excluded from the measurement: `package-info` classes, and the `@MutatesState` marker annotation — generated or declarative code with no behaviour to exercise.
This gate is reached by the tests together.

---

## 5. Determinism

Time is read only from the injected clock (ADR-0004).
No test — and no production class — calls `Instant.now()` or any other wall-clock source.
A test that depends on time advances the injected clock and asserts; it never sleeps and never races.

Tests are independent of one another and of execution order.
