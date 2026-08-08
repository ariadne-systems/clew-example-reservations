# ADR-0005 — Architectural boundaries are enforced by ArchUnit

## Status
Accepted

## Context
The layering — services over entities, state changes only in the store, the api as a thin facade — is only real if it is checked.
Prose architecture drifts; the code slowly violates it and no one notices.
ArchUnit enforces package dependencies, access restrictions, annotations, and structural boundaries; it cannot reliably judge whether a method body contains "business logic", because a branch in bytecode is not necessarily a decision and a decision need not contain a branch.
The rules are therefore stated structurally.

## Decision
Boundaries are enforced by ArchUnit tests that run in `mvn verify`, expressed only as mechanically checkable rules:
- api classes may depend only on service interfaces and DTOs, and may not access store classes;
- services may depend on entities, and entities may not depend on service, api, or store packages;
- only store classes may call declared state-mutating methods (marked by a `@MutatesState` annotation or confined to the store package).

## Consequences
A boundary violation fails the build, not a review.
These rules are ARCH-spec-anchored with `@Verifies`, so the architecture is covered like any other spec.
The intent "the api holds no decision logic" is expressed as the enforceable proxy "the api may depend only on service interfaces and DTOs" — the demo does not claim ArchUnit inspects method bodies for logic.
