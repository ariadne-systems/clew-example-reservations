# Technology Contract — reservations

The stack the reservation engine is built on.
This contract states the runtime and the libraries; the architecture is stated in `baseline/architecture.md`.
Exact versions are pinned in the build (`pom.xml`) — this document names what is approved, not the digits.

## 1. Runtime

- Language: **Java, JDK 25** (`maven.compiler.release=25`).
- Build tool: **Maven** (a wrapper, `mvnw`, is committed so the build is reproducible without a local Maven install).
- The project is a single Java library; there is no application server and no framework.

## 2. Approved libraries

- **JUnit 5 (Jupiter)** — the test runner, via the JUnit BOM.
- **Mockito** (with `mockito-junit-jupiter`) — isolation of collaborators in unit tests.
- **AssertJ** — assertions.
- **ArchUnit** (`archunit-junit5`) — the architecture boundary rules run as tests (ADR-0005).
- **JSpecify** — `@NullMarked` / `@Nullable`, so nullness is stated in the type system rather than by convention.
- **JaCoCo** (`jacoco-maven-plugin`) — line-coverage measurement and the coverage gate the testing contract (`005`) defines.

## 3. Requires justification

- Introducing any dependency, framework, or build plugin not listed above.
- Wrapping a stable platform facility behind an interface of our own. The one deliberate exception is the `clock` port (ADR-0004), which is justified because it genuinely varies between production and test.
- Changing the Java release or the build tool.
