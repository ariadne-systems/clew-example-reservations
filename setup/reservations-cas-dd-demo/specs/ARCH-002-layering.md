**Title**
Layering is enforced by dependency and access rules

**Lens**: ARCH

**Status**: planned

**Description**
The layering holds as mechanically checkable dependency and access rules:
api classes may depend only on service interfaces and DTOs and may not access store classes;
services may depend on entities but entities may not depend on service, api, or store packages;
only store classes may call declared state-mutating methods.

**Rationale**
Prose layering drifts and no one notices (ADR-0005); expressed as structural rules ArchUnit can check, a
violation fails the build instead of a review.
The dependency restriction is the enforceable proxy for the intent "the api holds no decision logic" — ArchUnit
does not inspect method bodies to judge that.

**Verification Description**
ArchUnit tests assert each dependency-direction and access rule above; none inspects method bodies for
"decision logic".

## Relations

**Related**

- [ARCH-001](ARCH-001-state-change-through-store.md)
- [ARCH-003](ARCH-003-every-package-is-null-marked.md)
