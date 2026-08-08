**Title**
Every package is @NullMarked, so absence is stated in the type

**Lens**: ARCH

**Status**: planned

**Description**
Every package in the engine ships a `package-info.java` annotated `@NullMarked` (JSpecify).
A reference is therefore non-null by default, and anything that may be absent is marked `@Nullable` exactly where it
occurs; absence is never left to convention, documentation, or a reader's memory.

**Rationale**
Making non-null the package-level default means the common case costs nothing to state and the absent case becomes a
deliberate, visible decision at the declaration that has it — the opposite of annotating nullability case by case,
where silence is ambiguous.
Like the other structural rules this is enforced mechanically rather than reviewed (ADR-0005); unlike them it is a
declaration rule about every package rather than a dependency direction, so it earns its own spec instead of widening
the layering one.

**Verification Description**
An ArchUnit test asserts that every class in the engine resides in a package whose `package-info.java` is annotated
`@NullMarked`, and fails for a package that is missing one.

## Relations

**Related**

- [ARCH-001](ARCH-001-state-change-through-store.md)
- [ARCH-002](ARCH-002-layering.md)
