**Title**
A confirmation takes the store's serialization point once, so concurrent confirmations never wait on each other

**Lens**: CON

**Status**: planned

**Description**
A confirmation covering several items applies its whole change in one store operation, taking the store's single
serialization point exactly once.
No operation ever holds the claim on one item while waiting for the claim on another.
Two confirmations whose item sets overlap therefore cannot deadlock, whatever the interleaving and whatever order
each names its items in.

**Rationale**
Once a confirmation touches more than one item, the classic failure is a cycle: one operation holds item A and
waits for B while another holds B and waits for A.
Per-item locking would make the guarantee depend on every present and future operation honouring one total
acquisition order — a rule nothing in the build can check.
Taking a single serialization point once makes a cycle impossible by construction (ADR-0006); the cost is coarser
contention, which this engine's workload does not feel and which can be refined later without changing this
constraint, only how it is met.

**Verification Description**
A test runs two multi-item confirmations whose item sets overlap concurrently, repeated enough times to interleave,
and asserts both complete within a bounded time rather than hanging — a deadlock shows up as the bound expiring,
never as a wrong result.

## Relations

**Related**

- [CON-002](CON-002-atomic-confirmation.md) — the same single change is what makes it atomic
- [ARCH-001](ARCH-001-state-change-through-store.md) — the store is that serialization point
- [SW-TMP-001](SW-TMP-001-validate-hold-set-before-one-atomic-change.md) — the service that hands over the change
