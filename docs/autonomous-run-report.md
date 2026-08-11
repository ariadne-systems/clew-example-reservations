# Autonomous run report — CAS-DD arm

15 agent tasks ran 6 increments end to end, and all 6 finished green.

Each increment was drafted, promoted and implemented through the clew cycle, then reviewed by a separate agent that had not written the code.
This document is the run's record: the decisions each agent made on its own, what the documentation did and did not carry, the problems hit, and the measured cost.

---

## STR-1 — scaffold clew, install governance, and stand up the reservations workspace

**Green:** yes · **Tests passing:** 4 · **Specs covered:** 0 · **Window:** 12:35:06Z → 12:43:14Z

### Commits

- `c92f51e` chore: scaffold clew and draft set-up-the-workspace (STR-1)
- `6349fff` feat: stand up the reservations workspace (STR-1)

### Open questions the agent resolved itself

**Q.** The brief names the second ArchUnit rule "api may not access store", but the architecture overview states both "may not access store classes" and "The api holds no reference to store". accessClassesThat() covers only field accesses and calls; dependOnClassesThat() also covers declared types, parameters and return types.

**Chose.** dependOnClassesThat().resideInAPackage("..store..")

**Why.** It strictly subsumes access and enforces the stronger 'holds no reference' sentence the architecture actually commits to. A narrower accessClassesThat would leave an api field of a store type legal, which the overview plainly forbids. If STR-2's ARCH spec turns out to want the narrower reading, narrowing is a safe edit; widening later would be a behaviour change to an already-green rule.

**Q.** clew setup seeded docs/adr/ADR-template.md, while the increment brief says to establish the built-project ADR home at docs/spec/adr/. Two ADR locations would result.

**Chose.** Moved ADR-template.md into docs/spec/adr/ alongside ADR-0001..0005 and removed the now-empty docs/adr/.

**Why.** The brief's stated goal is 'one clear place for new ADRs'. Leaving the template in a second directory would defeat that on the very next ADR.

**Q.** The run brief mandates the clew-draft -> clew-promote -> clew-implement cycle, but the STR-1-specific instruction says to use clew-setup for the workspace-setup story.

**Chose.** Used clew-setup for the drafting step (it owns the setup-story procedure), then clew-promote and clew-implement as normal. clew-draft was not invoked.

**Why.** The STR-1-specific instruction is the more specific rule, and this increment authors no specs — clew-draft's whole subject (choosing lenses, temp-minting spec ids, writing spec drafts) is empty here. clew-setup step 5 covers exactly this draft, including the temp-mint and the bold-label form.

**Q.** The brief pins every library version except jacoco-maven-plugin's.

**Chose.** jacoco-maven-plugin 0.8.14.

**Why.** It is the first release with Java 25 class-file support; 0.8.13 tops out at Java 24 and would fail to instrument release-25 bytecode. Verified empirically — prepare-agent, report and check all execute cleanly against the compiled output.

**Q.** How to formulate the 'every package is @NullMarked' rule in ArchUnit, which has no packages() entry point.

**Chose.** classes().should(<custom ArchCondition resideInANullMarkedPackage>), which walks each class's JavaPackage for a package-info carrying @NullMarked.

**Why.** It expresses the architecture's own wording — every package *that contains classes* must be null-marked — and so automatically grants the grouping-package exception the overview names for `services`, with no exclusion list to maintain. Proven falsifiable in the red step.

**Q.** @AnalyzeClasses imports test classes by default, which would put the unmarked test package io.example.reservations.architecture in scope of the null-marked rule.

**Chose.** importOptions = ImportOption.DoNotIncludeTests.class.

**Why.** The architecture's nullness rule governs the engine's packages, not the test tree; 005 casts the test tree as the checker, not the checked. Excluding tests keeps the rule about production packages rather than forcing a package-info onto every future test package.

**Q.** The seed story file on disk is CRLF; .gitattributes declares eol=lf, so a literal byte-for-byte copy would commit content git immediately renormalizes.

**Chose.** Wrote the draft with LF and verified text-identity against the seed with `tr -d '\r'` rather than `cmp`.

**Why.** The repository's declared normal form is LF. Committing CRLF would have produced an immediate 'CRLF will be replaced by LF' rewrite. The story's text is character-for-character the seed's.

### Anchor findings (drift check)

None.

### Documentation — worked well

- The seed's docs/spec/architecture.md is precise enough to build from without guessing: the code-organization tree gave the exact eight packages, the nullness section explicitly carved out the grouping package (`services` holds only subpackages, so carries no package-info — which is why the count is eight and not nine), and the enforcement section named all four boundary rules and even warned that ArchUnit checks structural dependencies rather than inspecting method bodies.
- 005-testing-contract §4 states plainly that tests for code no spec covers are 'ordinary tests with no anchor — that is the normal case, not a gap', and that a forced @Verifies is a false claim. That is exactly the STR-1 situation and it removed all ambiguity about leaving the four ArchUnit rules bare.
- clew-implement repeats the same rule from the other side ('Do not place an anchor you are unsure is true', 'a guessed anchor is a false claim coverage will show as green'). Two independent documents agreeing made the call trivial.
- 006-spec-conventions §4 fully specifies the story lifecycle: planned -> active -> done, set by the workflow and never by the tool, and explicitly that a story carries no `## Changes` section. No inference needed.
- docs/spec/schemas/story.example.md leads with the trap it is guarding — 'A "#"/"##" heading is NOT a field: clew detects a field only as a bold label'. That is the single most likely promote-time failure and it is called out first.
- The `clew setup` command's terminal output ends with concrete next steps that name the clew-setup skill and what it does, so the handoff from command to skill needs no external instruction.
- `clew coverage` on an empty corpus prints an explanatory note ('the coverage universe is empty ... with none yet, this is the expected state') instead of a bare zero, which distinguishes 'nothing to cover' from 'nothing anchored'.

### Documentation — gaps

- clew-implement is written entirely for an increment that targets specs. For a spec-less increment (STR-1) its steps 1, 2, 4 and 5 — set active, read the spec's intent, anchor, verify Covered — are all no-ops, and the skill says nothing about that case. Everything I actually needed (flip the story to active, then to done) came from 006 §4 instead. A one-line 'a story that authors no specs' branch would close this.
- Adding a lens is a two-place edit — .clewrc.json's `lenses` array and docs/spec/schemas/spec.schema.yaml's `Lens` enum — and nothing in clew reconciles or warns about the two. Editing only .clewrc.json would mint ENT ids that then fail schema validation at promote time, surfacing an increment later than the mistake. The schema file's own header comment explains the Status enum's duplication but says nothing about the Lens one.
- There is no guidance on where ADRs live. `clew setup` seeds docs/adr/ADR-template.md, the architecture overview references ADR-0001..0005 by id with no path, and clew-setup's procedure never mentions ADRs at all. The location was mine to invent (the run brief supplied it here, but a real project would have no such instruction).
- The generated traceables README documents the marker *shape* (@Realizes<Set>, <Set>Traceables.MEMBER) but the concrete member names live in *Traceables.java files that do not exist until a spec is active. At STR-1 the anchor form therefore cannot be confirmed against anything real, only read — actual verification has to be deferred to STR-2. The README could say so.
- clew-setup step 3 tells you to run `clew setup --generator <name>` 'if clew config shows no generator configured', but the bootstrap in this run already set it via `--type claude --generator java`. The skill covers the already-wired case in half a clause ('a generator the bootstrap already set is kept'), which reads as if the command were still expected to run. It is easy to invoke a second, unnecessary setup.
- Neither the testing contract nor clew-implement addresses how TDD applies to purely structural work. Three of the four ArchUnit rules here cannot be made to fail at STR-1 because nothing matches them, which is precisely why archunit.properties needs failOnEmptyShould=false — a property whose documented purpose is to *permit* a rule that can never fail, i.e. the exact opposite of TDD's red step. That tension is real and undiscussed.

### Issues hit

- A stale .clew/coverage.json from an earlier run was present (gitignored, untracked) listing 25 specs as covered, none of which exist in this corpus. Left in place it would have made any coverage reading meaningless. Deleted it before running `clew setup`; the regenerated file now correctly reports an empty universe.
- The initial byte-for-byte comparison of my drafted story against the seed failed at byte 10. Diagnosed with `od -c`: the seed is checked out CRLF while .gitattributes declares `* text=auto eol=lf`. Confirmed with `diff <(tr -d '\r' seed) <(tr -d '\r' draft)` that the text is identical, and kept LF so git does not renormalize on commit. Same situation for the copied governance and ADR files — git emitted the CRLF-to-LF warning on add and normalized them.
- TDD on a scaffolding increment: with no domain code, three of the four ArchUnit rules match nothing and pass vacuously, so there was no honest red step for them. Resolved by driving the one genuinely falsifiable rule properly — created MutatesState and the test *before* any package-info, ran `mvn -B verify`, and observed the exact expected failure ('package io.example.reservations.store has no @NullMarked package-info', 4 tests / 1 failure), then added the eight package-infos for green. The other three are documented in the commit message as guards that start biting in STR-2.
- The JaCoCo check rule fails below 80% LINE, but after the mandated exclusions (clew/traceables/**, **/package-info.class, **/MutatesState.class) the bundle contains zero classes at STR-1. Confirmed from build output that JaCoCo analyses 'bundle reservations with 0 classes' and reports 'All coverage checks have been met' rather than dividing by zero or failing — the rule is genuinely dormant, not accidentally disabled, and applies as soon as domain classes land.
- @AnalyzeClasses imports test classes by default, which would have pulled the test's own io.example.reservations.architecture package into the null-marked rule and demanded a package-info on the test tree. Caught while writing the rule and fixed with ImportOption.DoNotIncludeTests before the first run.
- jacoco-maven-plugin had no version pinned by the brief. Selected 0.8.14 for Java 25 class-file support and verified empirically that prepare-agent, report and check all execute against release-25 bytecode without error.

### Notes (verbatim)

> Two commits, working tree clean at the end. Verification evidence, all run fresh from `mvn -B clean verify`: BUILD SUCCESS, exit 0, Tests run: 4 / Failures: 0 / Errors: 0; `clew check` OK, exit 0; `clew spec` generates without error (0 traceables in 0 spec sets — no specs exist yet, which is correct for this increment). Story STR-001 promoted from STR-TMP-001 and closed to `done`; `clew status` shows no story left active. specsCoveredTotal is 0 because STR-1 authors no specs — the ARCH specs that will govern the four boundary tests arrive in STR-2, and the tests are deliberately unanchored until then. The clew-review drift check ran over the increment's scope (no specs added, none given a new `## Changes` entry, one story) and raised no findings; a grep over src/ confirms no @Realizes/@Verifies/@Concerns marker exists anywhere outside the generated README's own examples. The ENT lens was added to both .clewrc.json and the spec schema's Lens enum as instructed. Governance (000-006), docs/spec/architecture.md and ADR-0001..0005 were verified byte-identical to the seed with `cmp` before commit 1. Key files: C:\develop\intellij-installations\clew-example-reservations2\pom.xml, src\test\java\io\example\reservations\architecture\ArchitectureBoundariesTest.java, src\main\java\io\example\reservations\store\MutatesState.java, docs\spec\stories\STR-001-set-up-the-workspace.md.

---

## STR-2 — reserve a single item for a time window

**Green:** yes · **Tests passing:** 26 · **Specs covered:** 13 · **Window:** 12:53:35Z → 13:10:39Z

### Commits

- `2b09e72` docs: draft reserve-single-item (STR-2)
- `2819736` feat: implement reserve-single-item (STR-2)

### Open questions the agent resolved itself

**Q.** Should the services the api facade depends on be Java interfaces, or concrete classes?

**Chose.** Java interfaces (AvailabilityService, ReservationConfirmationService) with implementations (ComputedAvailabilityService, CheckedReservationConfirmationService) in the same packages.

**Why.** ARCH-002 states 'api classes may depend only on service interfaces and DTOs'. ArchUnit cannot check interface-ness, so the only thing keeping that clause true is the code itself; concrete service types would have made ARCH-002's own text false at the anchor a reviewer reads. The cost is two small interfaces the architecture doc mandates, so it is not a speculative abstraction under 003 §1.

**Q.** What exception signals a rejected confirmation, and where does it live?

**Chose.** A dedicated unchecked ItemUnavailableException in io.example.reservations.services.reservation.

**Why.** architecture.md 'Rejections' requires one dedicated unchecked exception per rejection reason, never an in-band false/empty. Neither the seed nor the governance names the type or its package; the throwing service's own package keeps it reachable from api (api may depend on services) without inventing a new package.

**Q.** CON-001 is a CON spec and 005 §2 assigns CON specs to the UNIT level — but with a mocked AvailabilityService the overlap invariant is vacuous.

**Chose.** Verified CON-001 at the APPLICATION level (real graph through ReservationEngine) with a sequence: confirm, overlapping rejected, adjacent allowed, re-confirm of the taken adjacent window rejected.

**Why.** 005 §4 ('never force a @Verifies where the test does not actually exercise the spec') outranks the level table when they collide: a unit test whose availability decision is stubbed cannot falsify 'no item is bound by two reservations over overlapping windows'. CON-002 (atomicity) stayed at UNIT with a mocked store, where it is genuinely falsifiable.

**Q.** Should the clock port (ADR-0004) be introduced now, since 005 §2 describes application tests running 'with an injected test clock'?

**Chose.** No clock class this increment; the clock package keeps only its package-info.

**Why.** Nothing in the thirteen specs reads time — TimeWindow carries Instants passed in, and no expiry exists until the holds increment. A port nothing consumes would be the speculative indirection 002 §2 and 004 §4 forbid. Tests stay deterministic with fixed Instants.

**Q.** Where does the composition root live, given the api may not reference the store?

**Chose.** io.example.reservations.Reservations with a static newInMemoryReservationEngine(), plus a @NullMarked package-info for the root package.

**Why.** architecture.md requires the graph be wired outside the enforced packages; the root package is outside '..api..', '..services..', '..store..' and '..entities..', so the layering rules stay satisfiable and the new package-info keeps the @NullMarked rule green.

**Q.** How far should the store go toward 'an operation serializes on the item it touches'?

**Chose.** ReservationStore exposes reservationsFor(Item) plus a single @MutatesState record(Reservation); the in-memory implementation synchronizes both. No per-item lock API and no check-and-record combinator.

**Why.** SW-001 requires the service to own the decision, so folding the availability check into the store would violate it. No spec in this increment states a concurrency requirement, so the minimal serialization honouring ADR-0002 without widening the store's surface is the reversible choice (002 §6). A contended check-then-record race remains theoretically possible and is left for a spec that states it.

**Q.** How is a TimeWindow with end <= start rejected — dedicated exception or IllegalArgumentException?

**Chose.** IllegalArgumentException from the record's compact constructor.

**Why.** architecture.md's dedicated-exception rule governs rejected operations (unavailable item, expired hold, non-owner cancel), not constructor validation of a value type; ENT-002 only requires rejection, and fail-fast on invalid input (003 §2) is satisfied.

### Anchor findings (drift check)

**SW-001** — stale-verify · confirmed: yes · fixed: yes

SW-001's verifies anchor covered only the free-schedule half of its Verification Description; the occupied-schedule half was asserted only by a test anchored to CON-002.

SW-001 says 'A test drives the service against a free schedule and asserts the store received exactly one atomic change; against an occupied schedule it asserts no change is handed to the store.' Only availability_is_computed_before_the_single_change_is_handed_to_the_store carried @VerifiesSw, so had the service recorded on an unavailable item, no SW-001-anchored assertion would have failed. Fixed by adding @VerifiesSw(SW_001_CONFIRM_SERVICE) beside the existing @VerifiesCon on a_confirmation_that_fails_the_availability_check_leaves_no_trace_in_the_store in CheckedReservationConfirmationServiceTest; mvn -B verify re-run green (26 tests), SW-001 still Covered.

**ARCH-001** — misanchor · confirmed: no · fixed: no

Candidate: the ArchUnit rule anchored to ARCH-001 checks where @MutatesState methods are declared, while ARCH-001's Verification Description speaks of where write access originates.

Traced ARCH-001 -> state_mutating_methods_are_declared_only_in_the_store and asked whether a literal call-origin rule would be truer. It would not: CheckedReservationConfirmationService.confirm legitimately calls reservationStore.record, so 'no class outside ..store.. calls a @MutatesState method' would fail on the intended design. ARCH-001's claim is that the write itself is performed in the store, and the declaration rule is the enforceable proxy the architecture doc and ARCH-002's rationale endorse. Dismissed; no rule added (that would also reach outside this increment's scope, 002 §5).

**ARCH-002** — misanchor · confirmed: no · fixed: no

Candidate: ARCH-002's third clause ('only store classes may call declared state-mutating methods') has no test carrying @VerifiesArch(ARCH-002); the rule covering it is anchored to ARCH-001.

ARCH-002 enumerates three rules; the first two (entities_depend_on_nothing_above_them, api_does_not_reach_into_the_store) carry @VerifiesArch(ARCH_002_LAYERING), and the third is state_mutating_methods_are_declared_only_in_the_store, anchored to ARCH-001. Double-anchoring that one rule would state the same claim twice across two specs that already link each other in ## Relations, which 005 §4 warns against. The clause is verified — by the rule ARCH-001 owns — so this is overlap between two seed specs, not an unverified claim. Dismissed.

### Documentation — worked well

- The generated traceables README (src/main/java/clew/traceables/clew/README.md) settled the marker form with no guesswork — @Realizes<Set>/@Verifies<Set>, repeatable, {…} lists, applicable to package/type/method/field — which is what made anchoring package-info.java and static ArchRule fields obvious rather than a gamble. After `clew spec` it even rewrote its example to a real member of this project's corpus.
- clew-draft's warning that temporary numbering increments by scanning existing draft filenames — so minting one at a time before any draft file exists returns -TMP-001 repeatedly — is exactly the trap I would have walked into; minting per lens with a count avoided it.
- `clew promote` behaved precisely as clew-promote describes: it resolved the reference closure from the story alone, bound ids in the order the story's ## Relations list fixed, substituted temp ids inside link paths as well as prose, and moved the files. The thirteen promoted specs came out byte-identical to the seed originals.
- 006-spec-conventions is precise enough to apply mechanically: the Status value sets per artifact kind, planned generating no traceable, and the append-only ## Changes format with an absolute date — including the explicit statement that a story carries no ## Changes section.
- architecture.md's composition-root paragraph ('the object graph is assembled outside the enforced packages … that is how api-may-not-access-store stays satisfiable') pre-empted a real dead end — without it I would have put a factory in api and hit the ArchUnit rule.
- 005 §4 ('never force a @Verifies … tests for code no spec covers are ordinary tests, and that is the normal case, not a gap') gave a clear rule for leaving ComputedAvailabilityServiceTest and InMemoryReservationStoreTest unanchored while they still serve the line-coverage gate.

### Documentation — gaps

- clew-draft says to write every relation link in its post-promotion form and explicitly not to make links resolve from the drafts folder — but never says what the *filename* part of a link to a sibling draft should be. Writing the promoted slug beside a temp id would dangle if numbering shifted; writing the temp filename works only because clew substitutes temp ids inside paths too. I had to read node_modules/@ariadne-thread/clew/dist to confirm that (TEMPORARY_ID_IN_TEXT is applied globally to file content). One sentence in the skill would close this.
- 005-testing-contract §2 assigns CON specs to the UNIT level but gives no guidance for a constraint like CON-001, stated 'across every sequence of operations', which goes vacuous once the collaborator that makes the decision is mocked. §4's anchoring rule resolves it, but only if you read the two sections against each other.
- ARCH-002's 'api classes may depend only on service interfaces and DTOs' is ambiguous between Java interfaces and 'the services' public surface', and the spec itself admits ArchUnit cannot check the intent. Nothing in the corpus disambiguates, so the same spec reads as satisfied by either design.
- architecture.md mandates a dedicated unchecked exception per rejection reason but names neither the type nor its owning package. With api forbidden from reaching into store and entities forbidden from depending on services, that placement is a real architectural choice left wholly to the implementer.
- ARCH-001's Verification Description ('an ArchUnit test asserts that no write access to persisted state originates outside the store package') over-promises relative to what an ArchUnit rule can assert in a design where services must call into the store. The workspace's declaration-site rule is the right proxy, but ARCH-001 — unlike ARCH-002 — never says it is a proxy.
- clew-implement says to set the story done 'when the increment is accepted' by the user, while the run's cadence has the drift-check step close it. In an autonomous run there is no acceptor, so the skill's exit condition is unreachable as written; I closed the story after green plus clew-review with every finding dispositioned.
- Nothing in the skills or governance says whether @MutatesState belongs on the store interface method, the implementation override, or both — that choice decides what the ARCH-001 rule actually constrains, so it is not a free one.

### Issues hit

- ./mvnw failed with 'curl: Failed to fetch https://repo.maven.apache.org/maven2/.../apache-maven-3.9.5-bin.zip' — the wrapper could not download its distribution here. Resolved by using the system `mvn -B`, which reached the dependency repositories fine; no pom or wrapper change made.
- A single Bash call chaining a dozen heredocs died with 'unexpected EOF while looking for matching quote' after having written most files, leaving the last one (the root package-info.java) missing. Caught by listing src rather than trusting the exit code; wrote that file and all later production files with the Write tool.
- In a statically typed language the entity records must exist before any test compiles, so ItemTest/UserTest/ReservationTest passed on their first run rather than failing first — the TDD skill's red flag. The behaviour-bearing code did go through a genuine red: 17 tests failed against skeletons throwing UnsupportedOperationException (TimeWindow.overlaps and its validation, the store, both services) before anything was implemented.
- The first availability test static-imported List.of, which the project conventions name as the obvious exception to static importing; corrected before the first build.
- Returning the store's internal list would have let a caller mutate persisted state from outside the store — an ARCH-001 violation the declaration-site ArchUnit rule cannot see. Closed in code (reservationsFor returns List.copyOf) and pinned by an ordinary test asserting the returned list is unmodifiable.

### Notes (verbatim)

> Two commits as specified; working tree clean; .clew/state.json committed while .clew/coverage.json, .clew/locations.json and .claude/settings.local.json were left untouched. Verification evidence: `mvn -B verify` BUILD SUCCESS with 26/26 tests and 'All coverage checks have been met' (JaCoCo >= 80% line); `pnpm run clew coverage` = '13 covered, 0 realized, 0 verified, 0 none'; `pnpm run clew check` = OK; `pnpm run clew status` shows STR-001 done and STR-002 done. The thirteen promoted specs are byte-identical to the seed originals apart from the Status flip to active and the appended ## Changes entry dated 2026-08-11. Anchor map: STK-001 -> ReservationEngine (verified end-to-end); SYS-001/SYS-002 -> the facade's confirm/isAvailable, SYS-002 also on ComputedAvailabilityService.isAvailable where 'computed, not stored' actually lives; SW-001 + CON-001/CON-002 -> CheckedReservationConfirmationService.confirm; ARCH-001 -> ReservationStore and InMemoryReservationStore; ARCH-002 -> api/package-info; ARCH-003 -> entities/package-info; ENT-001..004 -> the four entity records. All four of STR-001's previously unanchored ArchUnit rules now carry @VerifiesArch, the every-package-@NullMarked rule included.

---

## STR-3 — tentative holds with expiry

**Green:** yes · **Tests passing:** 49 · **Specs covered:** 17 · **Window:** 13:26:04Z → 13:43:01Z

### Commits

- `4add9e9` docs: draft tentative-holds-with-expiry (STR-3)
- `5ba3acf` feat: implement tentative-holds-with-expiry (STR-3)

### Open questions the agent resolved itself

**Q.** Where does 'confirm an active hold into a reservation' belong — the hold service or the reservation service? docs/spec/architecture.md's code organization assigns 'place · release · expire' to services/hold and 'confirm · cancel' to services/reservation.

**Chose.** Put confirm(Hold) on HoldService (ExpiringHoldService.confirm).

**Why.** SW-002 explicitly makes 'an expired hold is neither confirmable nor counted toward availability' an obligation of the hold service. Putting it on the reservation service would force that service to know hold expiry and to take the clock, spreading the hold lifecycle over two services; the architecture doc's package listing is narrative, and SW-002 is the binding spec.

**Q.** Should the store keep holds, or should a separate HoldStore be introduced beside ReservationStore?

**Chose.** Extend the existing ReservationStore with holdsFor / record(Hold) / replaceHoldWithReservation.

**Why.** Confirming a hold must drop the hold and record the reservation as one atomic change (CON-002, ADR-0002); split across two stores that change could not be atomic. A second store would also be a structural change (002 §3) the story does not require. The cost is that the name ReservationStore is now slightly narrow for what it holds; renaming it was rejected as churn outside the increment's scope.

**Q.** How is a hold's expiry expressed at the API — an absolute Instant, or a Duration the service adds to clock.now()?

**Chose.** An absolute Instant (placeHold(user, item, window, expiresAt)).

**Why.** ENT-005 speaks only of 'an expiry instant'; deriving one from a duration would invent a policy no spec states (charter I). The absolute instant is also the explicit, deterministic form (charter V).

**Q.** Placing a hold whose expiry instant is already at or before the current instant — accept it as an instantly-dead hold, or reject it?

**Chose.** Reject with IllegalArgumentException, before touching availability or the store.

**Why.** 003 §2 requires failing fast on invalid input, and TimeWindow already sets the precedent of constructor-style validation with IllegalArgumentException. Accepting it would record a claim that blocks nothing, which is silently useless.

**Q.** Confirming a Hold value the store never recorded (a caller can construct the public record directly) — guard, or trust the caller?

**Chose.** Guard: ExpiringHoldService.confirm rejects an unknown hold with a dedicated UnknownHoldException.

**Why.** Without the guard a fabricated Hold over an already-reserved window would confirm into a second overlapping reservation, breaking CON-001, which is stated as a standing invariant across every sequence of operations. The dedicated unchecked exception follows the architecture's 'one exception type per rejection reason' rule.

**Q.** Which exception signals 'item not available' when placing a hold — reuse services.reservation.ItemUnavailableException, or mint a hold-specific one?

**Chose.** Reuse ItemUnavailableException across both services.

**Why.** The architecture states one exception type per rejection reason; 'unavailable item' is one reason whether the caller was confirming or holding. Two types for one reason would make a caller catch both. The cost is a services.hold -> services.reservation import, which no boundary rule forbids.

**Q.** The story says to extend SYS-002 and CON-001. clew-promote wants confirmed integration edits to existing specs applied at promotion; the run task assigns the extension to the implement step.

**Chose.** Applied both extensions during implement, immediately before writing the code and the widened tests.

**Why.** The run task is explicit, and keeping the spec widening in the same step as the test widening is what made the stale-verify risk visible: I rewrote each widened spec's verify test right after rewriting its text, then proved both fail against the old narrow behaviour.

**Q.** SYS-002 and CON-001 titles no longer matched their widened text ('computed from reservations', 'two active reservations').

**Chose.** Retitled to 'computed from active holds and reservations' and 'two active claims', keeping both filename slugs unchanged.

**Why.** 006 §2 requires the title to state the decision the spec pins. Changing the slugs would rename the generated traceable members and break every existing anchor for no benefit, so slug stability won over slug/title symmetry.

### Anchor findings (drift check)

**NF-001** — misanchor · confirmed: yes · fixed: yes

SystemClock carried @RealizesNf(NF_001_DETERMINISTIC_EXPIRY) while being the one class that reads wall-clock time.

Traced NF-001's realizes anchors: Clock.java:7, SystemClock.java:7, ExpiringHoldService.confirm, ComputedAvailabilityService.isAvailable. NF-001's text is 'Every time-dependent decision is evaluated against the injected clock, so behaviour is fully determined by clock state and never by wall-clock time.' SystemClock.now() returns Instant.now() — it is the sanctioned wall-clock reader (ADR-0004), not a realization of determinism; a reader meeting the anchor there would read the opposite claim into it. What realizes NF-001 is the port (Clock) plus the decision sites that consult it. Removed the anchor from SystemClock; NF-001 stays Covered via Clock and the two decision sites, mvn verify green and clew coverage NF-001 still reports covered.

**SW-002** — drifted-realize · confirmed: no · fixed: no

SW-002's clause 'an expired hold is ... [not] counted toward availability' is implemented in ComputedAvailabilityService, which carries no SW-002 anchor.

SW-002 sentence: 'The hold service places a hold ... and treats a hold as active only until its expiry instant ...; an expired hold is neither confirmable nor counted toward availability.' The 'not confirmable' half is realized and verified in ExpiringHoldService.confirm (anchored @RealizesSw at line 52) and its unit test. The 'not counted toward availability' half is realized in ComputedAvailabilityService.claimedWindowsOf's isActiveAt filter, anchored to SYS-002 and NF-001 only. Dismissed: the grammatical subject of that clause is the hold, not the hold service — it states the system-level consequence of the service's active/expired treatment, and this increment's widening of SYS-002 explicitly assigned availability-from-active-holds there, where it is realized and verified (ComputedAvailabilityServiceTest and the SYS-002 acceptance test, both proven falsifying). Anchoring SW-002 onto the availability service would claim the availability service is the hold service. Reported rather than silently absorbed because the clause does straddle two components.

**ENT-005** — drifted-realize · confirmed: no · fixed: no

ENT-005 says a hold is active 'until it expires, is confirmed into a reservation, or is released', but Hold.isActiveAt models only expiry.

Traced ENT-005 to Hold.java (record with isActiveAt(Instant) -> instant.isBefore(expiresAt)) and to HoldTest.a_hold_is_active_strictly_before_its_expiry_instant_and_expired_at_and_after_it. The half-open rule and the clock-derived-value rule are honoured exactly. Dismissed: the other two terminations are not knowable to the record — confirmation is modelled by consumption (replaceHoldWithReservation drops the hold, and re-confirming the same hold throws UnknownHoldException, asserted in the SYS-003 acceptance test), and release is explicitly out of this story's scope (STR-4). An entity that depends on nothing above it (ARCH-002) cannot observe store lifecycle state, so realizing those clauses inside Hold would violate a higher-priority constraint.

### Documentation — worked well

- clew-implement's warning that a widened spec keeps its stale test while staying Covered was the single most useful sentence in the run — it is exactly what would have happened to SYS-002 and CON-001, whose old tests compile and pass unchanged against hold-blind availability. Acting on it, I proved falsifiability by reverting the hold-awareness line and watching 6 tests fail, then restoring.
- clew-implement's note that a type reshape surfaces its consumers through the type system rather than the anchor walk matched reality precisely: adding the Clock parameter to ComputedAvailabilityService broke exactly one unanchored consumer (ComputedAvailabilityServiceTest), and the compiler named it.
- The seed spec bodies for ENT-005/SW-002/SYS-003/NF-001 are unusually precise about the half-open expiry boundary ('active strictly before ... expired at and after'), which made the entity test's three assertions write themselves.
- docs/spec/architecture.md pre-answered the hardest design question: 'Entities may hold plain values — including a Hold's expiry Instant — but never read the clock ... so clock is a peer, not a layer above them'. Without that sentence the entities-depend-on-nothing ArchUnit rule and the clock port would have looked like a conflict.
- ADR-0004 explicitly sanctions the one wrapped platform facility and says why, so introducing the Clock port needed no justification of its own against 004's 'requires justification' list.
- clew-draft's instruction to write relation links in post-promotion form, and its warning not to 'fix' links that do not resolve from the drafts folder, prevented a mistake I was about to make; clew promote then bound STR-003/SYS-003/SW-002/ENT-005/NF-001 exactly as the seed numbers them.
- clew coverage's per-spec form (clew coverage SYS-003 SW-002 ...) is the right granularity for closing an increment — no need to read the whole-corpus report or coverage.json.

### Documentation — gaps

- The story instructs 'extend SYS-002 and CON-001' but nothing in the seed or the skills says whether a widened spec may be retitled, and 006 §2 (title states the decision) pulls against anchor stability (the slug becomes the traceable member). I kept the slugs and changed the titles; a sentence in 006 saying a slug is stable once anchored, and that title/slug symmetry is judged at authoring time only, would remove the guesswork.
- SW-002's last clause ('an expired hold is neither confirmable nor counted toward availability') states an obligation whose realization lives in a different component than the spec's subject. Neither the spec conventions nor clew-anchor says what to do when one spec sentence is realized across a module boundary — anchor both sites, or let the sibling spec carry it. This was the one genuinely ambiguous anchoring call in the increment.
- docs/spec/architecture.md's code-organization listing assigns 'place · release · expire' to services/hold and 'confirm · cancel' to services/reservation, which conflicts with SW-002 making confirmability a hold-service obligation. The doc calls itself narrative and the C3 diagram 'a view, not the checked truth', but a reader still has to decide which wins; an explicit note that the listing is illustrative would help.
- The C3 diagram shows 'store --> clock', which the implementation does not need (only the two services read the clock). Because the diagram is declared a view this is not a violation, but it is an unflagged inaccuracy a later increment may be tempted to satisfy by injecting a clock the store has no use for.
- clew-promote's step 3 says to apply confirmed integration edits to affected existing specs at promotion time, while clew-implement's step 3 says to re-open every widened spec's verify test during implement. For an increment that widens a spec these overlap and neither references the other; the extension text and the test rewrite belong together, and the skills do not say so.
- clew-implement requires the clew-review drift check as its final step, but nothing says what to do with a finding you dismiss — whether a dismissed finding should be recorded anywhere durable or evaporate with the session. I recorded all three here, but the repo carries no trace of the reasoning.
- Neither the testing contract nor the skills say where a test-only fake of a production port belongs (I put MutableClock in src/test/java/io/example/reservations/clock/). The ARCH-003 null-marked rule excludes tests, so the choice is unconstrained but also unguided.

### Issues hit

- ./mvnw failed immediately: 'curl: Failed to fetch https://repo.maven.apache.org/maven2/.../apache-maven-3.9.5-bin.zip' — the wrapper could not download its own distribution. Resolved by using the locally installed Maven 3.9.5 (C:/develop/tools/Maven/apache-maven-3.9.5); all builds in this increment ran through `mvn -B`, not `./mvnw`.
- No python on PATH (the Windows Store alias stub answers instead), so a scripted multi-file status flip failed with exit 49. Redone with a bash for-loop over sed plus printf appends.
- Surefire rejects the '+' multi-test separator ('No tests matching pattern ...'); the working form is -Dtest=A,B quoted for PowerShell/Git Bash.
- The initial RED run for the hold service reported an odd 'Hold cannot be converted to Reservation' error at the InOrder verification line — this was overload resolution picking the existing record(Reservation) because record(Hold) did not exist yet, not a test bug; it resolved when the overload was added.
- TDD deviation, stated rather than hidden: the ReservationEngine facade methods (placeHold/confirmHold, both three-line delegations) and the Reservations composition-root overload were written before their acceptance tests, driven instead by the hold-service unit tests that came first. Everything with behaviour — Hold, the clock port, ExpiringHoldService, the widened availability computation — followed a watched RED. To close the honesty gap on the widened specs I ran an explicit falsification pass: reverted ComputedAvailabilityService to ignore holds and confirmed the SYS-002 verify test, both CON-001 verify tests, the NF-001 test and two SYS-003 tests fail (6 failures), then restored and re-verified green.
- A CON-001 hole found while designing rather than by a test: Hold is a public record, so a caller can fabricate one over a window someone else has reserved and confirm it into a second overlapping reservation. Closed by having ExpiringHoldService.confirm reject holds the store does not carry (UnknownHoldException), covered by both a unit test and the SYS-003 acceptance test that re-confirms a consumed hold.

### Notes (verbatim)

> Final state: mvn -B verify BUILD SUCCESS, 49 tests, 0 failures, JaCoCo line gate met; clew check OK; clew coverage 17 covered / 0 realized / 0 verified / 0 none (17 specs), with SYS-003, SW-002, ENT-005, NF-001 and the two widened specs SYS-002 and CON-001 all reporting Covered. STR-003 closed to done after the clew-review drift check, so no story is left active. Working tree clean; .clew/coverage.json, .clew/locations.json and .claude/settings.local.json were never staged. Key files: C:\develop\intellij-installations\clew-example-reservations2\src\main\java\io\example\reservations\clock\Clock.java, ...\entities\Hold.java, ...\services\hold\ExpiringHoldService.java, ...\services\availability\ComputedAvailabilityService.java, ...\src\test\java\io\example\reservations\clock\MutableClock.java, ...\src\test\java\io\example\reservations\api\ReservationEngineAcceptanceTest.java.

---

## STR-4 — owner-initiated cancellation and release

**Green:** yes · **Tests passing:** 58 · **Specs covered:** 19 · **Window:** 13:55:43Z → 14:04:39Z

### Commits

- `6d59bba` docs: draft owner-cancellation-and-release (STR-4)
- `14b27a3` feat: implement owner-cancellation-and-release (STR-4)

### Open questions the agent resolved itself

**Q.** Where does cancel live, given the reservation service interface is named ReservationConfirmationService?

**Chose.** Added a second interface + impl (ReservationCancellationService / OwnerCheckedReservationCancellationService) in the same services/reservation package, rather than widening ReservationConfirmationService with a cancel method.

**Why.** The architecture code-org puts confirm and cancel in one package (which this respects — no new package), but an interface named for confirmation carrying cancellation would misname itself; the api layer needs a service *interface* to depend on anyway (ArchUnit rule), and the split keeps each interface to one responsibility. Release went onto HoldService directly, whose name is already generic.

**Q.** Release is described for an *active* hold — should releasing an already-expired hold be rejected?

**Chose.** No expiry check on release: ownership plus presence in the store is the whole precondition.

**Why.** The spec's positive claim is about the active case; rejecting an expired release would be unspecified behaviour, and an expired hold already bears on nothing, so removing it is harmless (and lets a user clean up). Adding a rejection reason not in the spec would be inventing product behaviour.

**Q.** Ownership check or existence check first?

**Chose.** Ownership first, existence second.

**Why.** SW-003 makes ownership the service's decision and says a non-owner request 'changes nothing'; checking it first means a non-owner request does not touch the store at all, which is a sharper falsifying assertion (verifyNoInteractions). It is also safe against a fabricated claim: a Reservation/Hold naming the requester as owner will not equal the stored record, so the existence check still rejects it.

**Q.** Which exception types, and in which package, for the new rejections?

**Chose.** NotClaimOwnerException (shared by both services) and UnknownReservationException, both in services/reservation; release reuses the existing UnknownHoldException.

**Why.** The architecture demands one dedicated unchecked exception per rejection reason; 'requester is not the owner' is one reason across both operations, so one type. Placing the shared type in services/reservation follows the existing precedent of ItemUnavailableException, which services/hold already imports.

**Q.** Should the SYS-004 acceptance tests also carry a @VerifiesSw(SW-003) anchor, since SW-003's verification description mentions availability being restored?

**Chose.** No — SW-003 is verified only at UNIT level.

**Why.** The testing contract maps SW specs to UNIT tests and STK/SYS to APPLICATION tests; sprinkling SW-003 over the acceptance tests would break that mapping and overreach the anchoring rule (§4). The end-to-end availability restoration is asserted by the SYS-004 acceptance tests, which SW-003 realizes.

### Anchor findings (drift check)

**SW-003** — stale-verify · confirmed: no · fixed: no

SW-003's Verification Description asks the owner path to show 'exactly one atomic release and restores availability', but the two anchored UNIT tests assert only the store interaction — availability restoration is asserted nowhere under a SW-003 anchor.

Traced: SW-003 Verification Description -> @VerifiesSw anchors at OwnerCheckedReservationCancellationServiceTest:46 and ExpiringHoldServiceTest:110. Both mock ReservationStore, so they can assert the single remove(...) call and the non-owner no-interaction case, but cannot observe availability. Dismissed as not real drift: the spec's normative Description is ownership + one atomic release + no change on rejection, and the code and both tests honour exactly that with falsifying assertions (drop the ownership check and both fail). The 'restores availability' clause is the end-to-end consequence, which the SYS-004 acceptance tests (ReservationEngineAcceptanceTest:189, :205) assert against the real object graph — SW-003 realizes SYS-004, so the chain is covered at the level the testing contract assigns it. No change made.

### Documentation — worked well

- The seed's spec bodies for SYS-004 and SW-003 were directly reproducible: the relation lists named exactly the promoted specs that exist (ENT-003/004/005, ARCH-001), so the draft needed no invention and no forward-reference stripping — this increment is genuinely forward-reference-free.
- docs/spec/architecture.md carried the whole implementation shape without ambiguity: the code-org block already listed 'reservation confirm · cancel' and 'hold place · release', the Rejections section prescribed one dedicated unchecked exception per reason (which settled the exception design), and the Atomicity section settled that removal goes through the store.
- clew-implement's step on setting Status active + a ## Changes entry, and the story planned->active->done lifecycle in 006 §4, matched exactly what the previous increments had done in the repo — the precedent (STR-003 set done in the implement commit) was visible in git and consistent with the skill text.
- The generated traceables README pinned the marker form precisely enough that no guessing was needed; existing anchored code in the same packages made the placement (method-level @Realizes on the implementation, @Verifies on the test) unambiguous.
- clew promote reported the temp->bound mapping (STR-TMP-001 -> STR-004, SYS-TMP-001 -> SYS-004, SW-TMP-001 -> SW-003) exactly as expected, and substituted the intra-set relation links, so no hand editing of ids or paths was needed.
- clew coverage accepting explicit ids (clew coverage SYS-004 SW-003) made the increment's own gate a one-line confirmation instead of reading a whole-corpus report.

### Documentation — gaps

- clew-implement says to set the story done 'when the increment is accepted', but the orchestrating workflow's review step runs after the implement commit — the skill gives no guidance for an autonomous run where nobody is present to accept. I followed the repo's own precedent (STR-003 was set done in its implement commit) rather than the literal skill text; this fork deserves an explicit rule.
- The testing contract maps SW specs to UNIT tests with mocked collaborators, yet the seed's SW-003 Verification Description asks for a behaviour ('restores availability') that no mocked unit test can observe. Neither the contract nor clew-review says how to disposition a verification description whose last clause is only checkable one level up — this is exactly the finding clew-review surfaced, and the skills leave the resolution entirely to judgement.
- clew-draft says relation links must be written in post-promotion form and warns that links to already-promoted specs will not resolve from the drafts folder — but it does not say whether a *story* draft should link a promoted sibling story by its bound id and current slug (STR-003-...) versus the seed's own label (STR-3). I inferred the bound-id form from the STR-003 draft in git history; the rule should be stated.
- Nothing in the skills addresses widening a service *interface* that the composition root and the api facade both consume: adding release(User, Hold) to HoldService and a second service to the ReservationEngine constructor is a public-surface change, but the guidance on 'type reshape' in clew-implement is framed around data types and find-references, not around interfaces whose only implementations are in-repo.
- clew-review's categories (drifted-realize / stale-verify / misanchor) have no slot for 'the spec's verification description is broader than the level its lens is tested at' — I had to file it as stale-verify with confirmed:false, which understates that the finding is about spec/test-level alignment rather than drift.

### Issues hit

- ./mvnw failed in this environment: 'curl: Failed to fetch https://repo.maven.apache.org/.../apache-maven-3.9.5-bin.zip' — the wrapper could not download its distribution from the sandboxed shell. Resolved by using the system Maven already on PATH (C:/develop/tools/Maven/apache-maven-3.9.5), which is the same version the wrapper pins, so the build is equivalent.
- A scripted multi-file edit via `python - <<EOF` failed: Python is not installed (Windows reported the Microsoft Store alias stub). Resolved by doing the Status/## Changes edits with the Edit tool instead — five small edits rather than one script.
- Maven's compiler output is localised to German ('Symbol nicht gefunden'), so the RED evidence had to be read from the error locations and the trailing 'Symbol: Klasse NotClaimOwnerException' lines rather than from a grep for the usual English text. No workaround needed beyond widening the grep to the ERROR block.
- The TDD red step for new Java symbols is a compile failure, not an assertion failure, so 'watch it fail for the right reason' had to be verified by reading which symbols were missing (NotClaimOwnerException, cancel, release, remove) rather than by a failing assertion. I checked the falsifiability of each anchored test by reasoning about which production line's removal breaks it (drop the ownership check -> both @VerifiesSw tests and both @VerifiesSys tests fail).
- InMemoryReservationStore.reservationsFor/holdsFor return List.copyOf, so removal had to operate on the stored ArrayList; getOrDefault(item, new ArrayList<>()) mirrors the existing replaceHoldWithReservation idiom and makes removing an unrecorded claim a no-op — covered by an ordinary (unanchored) store test.

### Notes (verbatim)

> Purely additive as briefed: no existing spec needed a ## Changes entry, because availability is computed from the claims that bear on a window (ADR-0003), so removing a claim restores availability with no change to SYS-002 or CON-001. ENT-005 already said a hold is active until it 'expires, is confirmed into a reservation, or is released', so the release path needed no entity edit either. Production: ReservationCancellationService + OwnerCheckedReservationCancellationService (new, services/reservation), HoldService.release + ExpiringHoldService.release, ReservationStore.remove(Reservation)/remove(Hold) with @MutatesState, ReservationEngine.cancel/release, and the composition root wiring. Anchors: @RealizesSw(SW-003) on both service methods, @RealizesSys(SYS-004) on both engine methods, @VerifiesSw(SW-003) on one unit test per service, @VerifiesSys(SYS-004) on two acceptance tests. Evidence: mvn -B verify -> 58 tests, 0 failures, BUILD SUCCESS (includes the JaCoCo 80% line gate and the six ArchUnit rules, notably only_the_store_calls_state_mutating_methods over the two new removals); pnpm run clew check -> OK; pnpm run clew coverage SYS-004 SW-003 -> both covered; whole corpus 19 covered / 0 gaps.

---

## STR-5 — per-user fair-use quota

**Green:** yes · **Tests passing:** 72 · **Specs covered:** 21 · **Window:** 14:11:02Z → 14:27:30Z

### Commits

- `67a346d` docs: draft per-user-quota (STR-5)
- `75d4329` feat: implement per-user-quota (STR-5)

### Open questions the agent resolved itself

**Q.** Should confirming an existing hold into a reservation (confirmHold) also be gated on quota?

**Chose.** No — only place and direct confirm are gated; confirmHold is deliberately ungated.

**Why.** Confirming an active hold converts a held item into a reserved item, so the active item count is unchanged. Gating it would make a user sitting at exactly quota permanently unable to convert their own hold — the quota would silently become a hold-conversion block rather than a claim bound. The brief said 'gate BOTH placeHold and confirm before creating a claim'; confirmHold creates no new claim. I pinned the decision with an assertion in the CON-003 acceptance test so a future gate there fails the build.

**Q.** Where should the quota gate sit relative to the availability check at each gate point?

**Chose.** After the availability decision, immediately before creating the claim and handing it to the store.

**Why.** Keeps the pre-existing rejection ordering (and the existing InOrder assertions) unchanged, and still satisfies CON-002: the gate runs before any store mutation, so a refused claim leaves the store untouched. Which of two rejection reasons a caller sees when both apply is unspecified by any spec, so I chose the ordering with the smallest behavioural delta.

**Q.** How does the quota service reach a user's claims when the store is keyed by item?

**Chose.** Added user-keyed read methods reservationsOwnedBy(User) / holdsOwnedBy(User) to ReservationStore.

**Why.** The alternative — exposing allReservations()/allHolds() and filtering in the service — widens the store's surface more and pushes a query concern outward. ARCH-001 governs state *change* through the store, so adding reads does not touch it, and no spec covers query shape. Named 'OwnedBy' rather than overloading reservationsFor(Item) so the two lookups do not blur at call sites.

**Q.** Should QuotaService expose the computed count, or only the gate?

**Chose.** Only the gate, requireHeadroomFor(User); the count stays a private detail.

**Why.** 003 §1 forbids speculative abstraction and 005 §3 prefers asserting observable behaviour. The count is not observable to any caller today, and the boundary rejection is fully falsifiable without it. If a later increment needs the number it can be promoted then.

**Q.** Should the User reject a negative quota?

**Chose.** Yes — a compact constructor throws IllegalArgumentException, with a test.

**Why.** 003 §2 requires failing fast on invalid input, and a negative bound is meaningless (0 is meaningful: no claims allowed). This slightly exceeds the spec text, which is a tension with Charta IV (minimize scope); I judged three lines of explicit validation the smaller risk against silently accepting a nonsense value.

**Q.** Which test level verifies CON-003, given that 005 §2 assigns CON specs to the UNIT level?

**Chose.** APPLICATION — the ReservationEngine acceptance test.

**Why.** CON-001, the sibling constraint, is already verified at the application level in this repo, and CON-003's own verification description demands a sequence of place/confirm/expire/release/cancel that only the facade can drive. I followed the in-repo precedent over the contract's lens-to-level table and logged the disagreement as a documentation weakness.

**Q.** Should the two gate points also carry @RealizesSw(SW-004), not only @RealizesCon(CON-003)?

**Chose.** No — SW-004 is anchored only on the quota service, CON-003 on both gate points.

**Why.** This is what the increment brief specified, and SW-004's Relations already state that it realizes CON-003, so a reader at a gate point is one documented hop from the service spec. Anchoring SW-004 at three sites would also broaden its reverse fan-out enough to degrade clew-context's lateral scan.

### Anchor findings (drift check)

**CON-003** — stale-verify · confirmed: yes · fixed: yes

The CON-003 verify test drove place, direct confirm, release, cancel and expiry, but never the hold-to-reservation confirmation — the one transition in the sequence where a claim changes shape, which an invariant stated in item terms most needs pinned.

Traced from the anchor: @VerifiesCon(CON_003_QUOTA_BOUND) on ReservationEngineAcceptanceTest sits over a sequence, while the spec sentence reads 'The invariant holds across every sequence of place, confirm, expire, release, and cancel.' Two 'confirm' operations exist on the facade — confirm(user,item,window) and confirmHold(hold) — and only the first was exercised. The realizes anchors (@RealizesCon on ExpiringHoldService.place and CheckedReservationConfirmationService.confirm) deliberately exclude ExpiringHoldService.confirm, so nothing asserted that converting a held item into a reserved one keeps the count level: a future gate added there would wrongly refuse a user at exactly quota their own confirmation, and a miscount there would let one over — coverage staying green either way. Fixed by extending the acceptance sequence — at exactly quota the user's own active hold still confirms, and the next claim is still refused straight after — then release restores headroom, and finally expiry does. Verified falsifying: injecting quotaService.requireHeadroomFor(hold.user()) into ExpiringHoldService.confirm makes exactly that test error (72 tests, 1 error); reverting restores green.

### Documentation — worked well

- The seed story pinned the counting unit itself — 'held items plus reserved items, deliberately not the number of Hold plus Reservation objects' — which removed the one modelling decision that would otherwise have been guesswork, and CON-003/SW-004 repeat it consistently so the code shape followed directly.
- docs/spec/architecture.md had already reserved the target shape: services/quota appears in the package layout and in the C3 diagram with the exact edges svcRes -> svcQuota and svcHold -> svcQuota, and an empty @NullMarked services/quota/package-info.java was already on disk. No structural decision was left to make.
- The architecture doc's 'Rejections' section prescribes one dedicated unchecked exception per rejection reason and names 'an over-quota claim' among them, so QuotaExceededException needed no invention or justification.
- src/main/java/clew/traceables/clew/README.md is the single authority on marker spelling (@Realizes<Set> referencing <Set>Traceables.MEMBER, repeatable, {…} lists) — enough to anchor correctly without reading anything else, exactly as 004 §3 promises.
- 006-spec-conventions §1 and §4 were precise enough to apply mechanically: the ## Changes format with an absolute ISO date and a reason, the planned->active transition at the moment work begins, and the explicit statement that a story carries no ## Changes section.
- clew-implement's instruction to re-open the verify test of every widened spec — plus its warning that the build cannot see this by design — is what produced the one real finding this increment, and it predicted the failure mode exactly: the test kept compiling, kept passing, and kept the spec Covered.
- clew-context's 'an anchor is a claim, not a proof' framing and its type-reshape exception (read all verify anchors of related specs, do not sample) matched the actual work — the User reshape broke 15 unanchored construction sites that no id scan would have found.

### Documentation — gaps

- 005-testing-contract §2 assigns CON specs to the UNIT level, but the corpus verifies CON-001 at the APPLICATION level and CON-003's own verification description ('across a sequence of operations, not only at a single step') is only satisfiable there. The lens-to-level table and the specs' verification descriptions contradict each other and nothing says which wins; I followed the in-repo precedent.
- clew-context names `clew anchors <id>` as the primary way to find what anchors a spec, but it needs .clew/locations.json, which this project git-ignores and which no command in the documented flow writes (the brief states there is no separate `clew scan` any more). It failed with E_NO_INDEX on a clean tree, so the grep fallback is effectively the only path — the skill should say so plainly instead of presenting the index as the default.
- clew-draft warns that temp minting 'one-by-one before any draft file exists returns the same -TMP-001 every time' without stating that numbering is per lens. Minting STR/CON/SW separately correctly yielded three distinct ids, but the warning reads as a cross-lens collision risk and cost a re-read to resolve.
- Nothing in the guidance says whether adding a *query* to a port (here, user-keyed reads on ReservationStore) counts as a structural change needing justification. ARCH-001 and 002 §3 speak of state change and of new modules/integrations, and 002 §6 says prefer extension — I inferred a read addition is ordinary, but one sentence distinguishing read from write surface would remove the doubt.
- clew-implement requires dispositioning every clew-review finding but names no place to record the disposition. There is no ## Changes-like slot for 'a drift finding was raised against this spec and this is what happened', so the record lives only in the commit message and this report — invisible to anyone reading the corpus later.
- The spec conventions say a story's status is 'set by the workflow, never by the tool', and clew-implement sets it done only 'when the increment is accepted'. In an autonomous run there is no acceptance event, so the moment to flip to done is underdetermined; I closed it after the review pass and a green verify.

### Issues hit

- ./mvnw could not bootstrap: 'curl: Failed to fetch .../apache-maven-3.9.5-bin.zip'. The wrapper distribution is not resolvable from this sandbox. Resolved by using the locally installed Maven 3.9.5 (mvn -B verify) as the increment brief specifies; the wrapper was left untouched.
- `pnpm run clew anchors …` returned error E_NO_INDEX ('No locations index at .clew/locations.json') during the context build. Resolved with the fallback clew-context documents — grepping the traceable enum members across src — which sufficed because the source tree is small.
- No python on PATH (the launcher offered the Microsoft Store stub and exited 49), so a scripted pass over the spec files to flip Status and append ## Changes entries failed. Resolved by doing the five edits with the Edit tool, which was also safer against clobbering.
- Java TDD cannot produce an assertion-level RED for a brand-new type: the tests failed to compile until User gained its quota component and the quota package existed. I treated the compile failure as the RED (checking it named exactly the missing symbols and the missing User constructor, not typos), then after green ran two explicit mutation checks to prove the anchored tests can fail — loosening the boundary from '>= quota' to '> quota' broke 5 tests including both anchored ones, and injecting a quota gate into confirmHold broke the CON-003 test. Both mutations were reverted and re-verified green.
- A sed used for the second mutation check matched two call sites (ExpiringHoldService.confirm and release) rather than the intended one. Caught immediately in the diff review; the revert deleted both injected lines, and git diff --stat plus a full verify confirmed the file was back to the intended state with only the one legitimate requireHeadroomFor call remaining.

### Notes (verbatim)

> Final evidence, all run fresh before committing: mvn -B verify -> BUILD SUCCESS, 72 tests, 0 failures, 0 errors, JaCoCo line gate passed; pnpm run clew coverage CON-003 SW-004 ENT-003 -> all three covered; pnpm run clew coverage -> 21 covered, 0 realized, 0 verified, 0 none (21 specs); pnpm run clew check -> OK, no integrity violations; pnpm run clew status -> STR-001..004 done, STR-005 done after the review pass closed it.
>
> Shape of the change: User became a record of (id, quota) with UNBOUNDED_QUOTA = Integer.MAX_VALUE and a single-argument convenience constructor, so all 15 existing construction sites kept compiling unchanged; equals/hashCode are overridden to the id alone (with @Nullable on the equals parameter for the @NullMarked package), which is what keeps ENT-003's identity claim true now that the record carries a second component. ClaimCountingQuotaService counts in item terms by streaming reservationsOwnedBy(user) and the still-active holdsOwnedBy(user) to their items and counting, so nothing stores a counter (ADR-0003), and refuses when the count already equals the quota. Both gate points call requireHeadroomFor after the availability decision and before any store write, so a refused claim leaves the store untouched (CON-002). Expiry, release and cancellation lower the count by construction, since the count is derived rather than maintained.
>
> Covered is the link's proof, not the code's correctness: this increment went through the clew-review conformance pass (one finding, fixed) but no separate correctness code review.

---

## STR-6 — atomic multi-item bookings (the blind redesign)

**Green:** yes · **Tests passing:** 88 · **Specs covered:** 25 · **Window:** 14:40:42Z → 15:04:52Z

### Commits

- `3dcd88b` docs: draft atomic-multi-item-bookings (STR-6)
- `70b5067` feat: implement atomic-multi-item-bookings (STR-6)

### Open questions the agent resolved itself

**Q.** The story's Solution Approach says the items a confirmation locks 'must be acquired in a stable order so that two concurrent confirmations cannot deadlock'. Implement per-item locks with a total acquisition order, or keep the store's existing single monitor and hand it the whole multi-item change as one call?

**Chose.** One serialization point: the service computes the whole decision, then makes exactly ONE store call (replaceHoldsWithReservation) applied under the store's existing single monitor. Per-item locking rejected; recorded as ADR-0006 and constrained as CON-004, which is stated over the property (never wait on each other) rather than the mechanism.

**Why.** Per-item ordering is a guarantee nothing in the build can check — a future operation that locks two items in the order it happens to read them silently reintroduces the cycle, and it fails as a hang, not a test failure. Architecture 002 §6 says to choose the smallest structural change and 003 §4 to prefer existing mechanisms; introducing a lock-striping pattern is a structural change requiring justification, while the store already serialized every mutation. Deadlock-freedom becomes structural instead of procedural. The cost (coarse contention) is real but invisible for a single-process in-memory engine, and because CON-004 pins the property, moving to per-item locks later touches only the store.

**Q.** Widen the existing Reservation entity to carry a set of items, or add a second Booking entity that groups single-item reservations?

**Chose.** Widened ENT-004: Reservation(User, Set<Item>, TimeWindow), non-empty, defensively copied; the single-item case is the one-element set, kept ergonomic by a secondary constructor Reservation(User, Item, TimeWindow).

**Why.** The story asks for 'a single reservation covering exactly those items'. A grouping entity over N single-item reservations would make all-or-nothing a property of clean-up (N records to write and unwind) instead of a property of the shape — there would be a partial state to observe. Keeping the single-item constructor meant the reshape broke only 3 production call sites instead of every one, so the type checker's break list stayed the change set rather than noise.

**Q.** Where does the multi-hold confirmation live — services/reservation (which the architecture's component map labels 'confirm · cancel') or services/hold (which already owns confirm(Hold))?

**Chose.** services/hold, as ExpiringHoldService.confirm(List<Hold>), with confirm(Hold) delegating to it as the one-element case.

**Why.** The operation consumes holds and needs exactly what that service already has: the injected clock for expiry and the hold-existence check. Putting it in services/reservation would have duplicated both, and would have left two implementations of one decision free to drift. Delegating the single case at the same time removes the narrow path entirely rather than leaving it beside the general one.

**Q.** Should the multi-hold confirmation re-check quota?

**Chose.** No quota check on confirmation.

**Why.** CON-003 and SW-004 both state the quota in ITEMS ('held items plus reserved items'), not in claims. Consuming N holds to produce a reservation over the same N items leaves the count identical, so a check could only ever be a no-op or a false rejection. This is exactly what the story's 'consumes no additional quota' criterion asks for, and it is why the quota spec needed no ## Changes entry at all — only its code (map(Reservation::item) -> flatMap over items) had to follow.

**Q.** Hold.toReservation() has no production caller after the change. Keep it or delete it?

**Chose.** Deleted, together with the one unanchored test that exercised it.

**Why.** It can only manufacture the single-item shape the redesign replaces, so keeping it is an invitation to rebuild the narrow path. Its removal is caused by this change, so it is not opportunistic refactoring under 003 §5.

**Q.** ENT-004's filename slug is the generic 'reservation', which 006 §2 calls a defect; its title changed materially this increment. Rename the file (and therefore the traceable member ENT_004_RESERVATION and every anchor)?

**Chose.** Left the slug alone; only the title and body changed.

**Why.** Renaming would churn the generated member name and every anchor in an increment already reshaping a core type, mixing a naming fix into a behavioural change. The slug was equally generic before this increment, so nothing was made worse.

**Q.** 005 §2 assigns CON specs to the UNIT level, but the deadlock property needs the real object graph and threads; the existing corpus already verifies CON-001 and CON-003 at the APPLICATION level.

**Chose.** Verified CON-004 at both levels: a unit assertion that the service hands the store exactly one call for the whole set, plus a concurrency test in the acceptance suite.

**Why.** The contract's level table is not honoured literally by the code that predates me, and a mocked store cannot show a deadlock. Splitting it keeps a falsifiable assertion at the unit level (a per-hold loop would fail it today) while the acceptance test guards the property against future locking changes.

**Q.** The story lifecycle: close STR-006 to done inside implement, or leave it active for a separate review commit as earlier increments did?

**Chose.** Set it done before the implementation commit.

**Why.** This run's cadence allows exactly two commits and folds the clew-review drift check into implement. Leaving the story active would end the run with a work item that is green, reviewed, and yet still open.

### Anchor findings (drift check)

**STK-002** — stale-verify · confirmed: yes · fixed: yes

The STK-002-anchored test exercised only the refusal half of the spec's verification description; the 'every item of the group is claimed' half was asserted by a test that named only SYS-005.

STK-002's Verification Description names two halves: 'drives the public engine to book a group of items in one go and asserts every item of the group is claimed', and 'a request that fails a check ... leaves every one of the user's prior claims exactly as it was'. The only @VerifiesStk(STK_002) anchor sat on a_group_whose_holds_do_not_all_survive_is_booked_for_no_item_at_all, which covers the second half alone. Fixed by adding @VerifiesStk(STK_002) to holds_on_several_items_for_one_window_confirm_into_one_reservation_covering_all_of_them, which asserts the booking covers exactly MEETING_ROOM and WORKSHOP and that both become unavailable.

**SYS-005** — stale-verify · confirmed: yes · fixed: yes

Two of the six refusal conditions the spec enumerates — an expired hold and a hold already consumed — were not exercised by any SYS-005-anchored test.

SYS-005's Verification Description lists 'an empty set, an expired hold, a hold already consumed, two users, two windows, a repeated item'. The anchored a_hold_set_that_is_empty_mixed_or_repetitive_is_refused... covered four of the six. Fixed by appending an already-consumed assertion (re-confirming the same holds after a successful confirmation throws UnknownHoldException) and by adding @VerifiesSys(SYS_005) to the expired-group test, which drives the same engine refusal.

**SW-005** — stale-verify · confirmed: yes · fixed: yes

The spec's claim that a single-hold confirmation takes the same path as a set was asserted only under SW-002's anchor, not under SW-005's.

SW-005 states 'Confirming a single hold is the one-element case of this path, not a second path' and its verification description says a single-hold confirmation is asserted to take the same path. The assertion exists — a_hold_is_confirmable_while_active_... verifies replaceHoldsWithReservation(List.of(hold), reservation) — but carried @VerifiesSw(SW_002_HOLD_SERVICE) only. Fixed by widening that anchor to {SW_002, SW_005}.

**CON-002** — stale-verify · confirmed: yes · fixed: yes

The success half of the widened invariant — one change consuming every hold and recording one reservation over all their items — had no CON-002-anchored test.

The 2026-08-11 ## Changes entry widened CON-002 to span the whole hold set, and its verification description now ends '...and that a successful one hands the store a single change consuming every hold and recording one reservation over all their items.' The two new CON-002 anchors I had placed (one expired hold, one unknown hold) cover only the failure half; the success half was asserted in a_valid_hold_set_reaches_the_store_as_one_change... under SW-005/CON-004. Fixed by adding CON_002_ATOMIC_CONFIRMATION to that test's @VerifiesCon.

### Documentation — worked well

- The spec bodies carried the reasoning I needed, not just the rule. CON-003 and SW-004 both state the quota 'in items — held items plus reserved items'. That single word settled the hardest silent question of the whole increment: when a reservation covers three items, does it cost one or three? The code said `.map(Reservation::item)` — one per record — but the spec said items, so flatMap was the faithful reading and quota-neutral confirmation fell out for free. Nothing in the code would have told me that.
- docs/spec/architecture.md's Rejections section already listed 'an invalid hold set' among the things signalled by a dedicated unchecked exception, with the one-type-per-reason rule. That pre-authorised InvalidHoldSetException and told me not to collapse expired/unknown/malformed into one type — a decision I would otherwise have had to make blind.
- clew-implement's warning that a widened spec keeps its old test, keeps compiling and keeps reporting Covered is the single most useful sentence in the skill set. It is exactly what happened four times, and only because I was told to expect it did I re-read every anchored test against the spec's new text instead of trusting the green 25/25.
- clew promote was genuinely mechanical and trustworthy: temp ids bound in one pass (STR-TMP-001 -> STR-006 and its four specs), cross-references substituted inside the drafts, files moved. The instruction to write links in their post-promotion form even though they do not resolve from the drafts folder was counter-intuitive but correct, and the skill said so explicitly enough that I did not 'fix' them.
- 006 §2 (title states the decision, slug is the title tightened) changed what I wrote. My first instinct for the deadlock spec was a slug like 'multi-item-locking'; the rule pushed me to CON-004-multi-item-confirmation-never-deadlocks, and the generated member CON_004_MULTI_ITEM_CONFIRMATION_NEVER_DEADLOCKS now tells a cold reader at the anchor site what the store's synchronized method is for.
- clew-context's instruction for a type reshape — get the sites from the type system, not from the anchor walk, because consumers of a shared type carry no marker — was precisely right. Changing Reservation and reading javac's break list gave me the exact three production call sites in one command.

### Documentation — gaps

- Nothing tells you where to put a CON spec's verification when the constraint is a concurrency property. 005 §2 assigns CON to the UNIT level with mocked collaborators, but a deadlock cannot be shown against a mock, and the existing corpus already contradicts the table (CON-001 and CON-003 are verified in the acceptance suite). I had to invent the split myself.
- The clew skills insist that a verifies test must encode a falsifying case, but give no guidance for a spec whose chosen design makes the failure unreachable *today*. My deadlock test cannot fail under a single serialization point — it is a guard against a future change, not a check of current code. That is a legitimate and common category (regression barrier), and the skill's binary 'if you cannot construct the failing case, the test is decorative' does not cover it. I resolved it by pairing the property test with a unit assertion that is falsifiable now, but I was guessing at the intent.
- No guidance on renaming a promoted spec whose title materially changes. ENT-004's title went from 'binds exactly one user, item, and window' to 'binds one user and one window to a non-empty set of items', but its slug — and therefore the traceable member every anchor names — stayed the generic 'reservation' that 006 §2 itself calls a defect. Whether a slug may be renamed after promotion, and what that costs in anchor churn and clew state, is unaddressed.
- The ADR template is scaffolded but nothing in the clew skills says when an increment needs an ADR versus an ARCH spec versus just a spec rationale. I wrote ADR-0006 because the decision (reject per-item locking) is a choice between alternatives with consequences rather than a checkable rule, but that boundary is my inference, not documented.
- clew-implement says to disposition every clew-review finding but does not say whether the review's own fixes are then re-reviewed. My four fixes were all anchor placements, so I re-ran coverage and check rather than a second review pass; a rule of thumb would help.
- The commit-cadence instruction and 006 §4's story lifecycle do not quite meet: 006 says the implementation step sets a story active and something later sets it done 'when the increment closes with its specs Covered and reviewed', but with only two commits and the review folded into implement, nothing names who closes it. I chose to close it in implement.

### Issues hit

- ./mvnw failed outright — 'curl: Failed to fetch .../apache-maven-3.9.5-bin.zip'. The committed wrapper could not bootstrap in this environment. Resolved by using the locally installed `mvn`, which worked for every goal including verify and the JaCoCo gate.
- `python` on this box is the Microsoft Store alias stub, so a heredoc'd python script for appending spec text failed silently with a German prompt to install it. Resolved by doing all file surgery with sed, bash heredocs, and the Edit tool.
- One genuine test failure during the increment: my acceptance test's 'unknown hold' case used a hold with a DIFFERENT window from the rest of the set, so the set-shape check (one window) fired before the existence check and threw InvalidHoldSetException where the test expected UnknownHoldException. Root-caused from the stack trace before touching anything: the code was right, the test's fixture was wrong. Fixed by giving the never-placed hold the same window as the rest of the set.
- Mockito's verifyNoInteractions could not express 'no change reached the store' for the rejection cases that legitimately READ the store. Resolved by ordering the service's checks so that every shape and expiry check runs before any store read — which is what the spec demanded anyway ('every check runs before any change is handed to the store') — leaving verifyNoInteractions honest for those cases and verify(reads)+verifyNoMoreInteractions for the existence case.
- The concurrency test needed each round to be independent without touching the injected clock (005 §6 forbids sleeping or racing on time). Resolved by giving each round its own disjoint pair of time windows over the same two overlapping items, a far-future hold expiry, and a CountDownLatch to line the two threads up; a deadlock surfaces as Future.get(10, SECONDS) timing out, never as a wrong result.
- Deleting Hold.toReservation() broke an unanchored HoldTest case and two store tests that used it as a fixture shortcut. Resolved by constructing the expected Reservation explicitly in those tests and deleting the test whose only subject was the removed method.

### Notes (verbatim)

> WHAT I CHANGED
>
> Specs: four new (STK-002 all-items-or-none, SYS-005 confirm-hold-set-into-one-reservation, SW-005 validate-hold-set-before-one-atomic-change, CON-004 multi-item-confirmation-never-deadlocks), two widened in place with ## Changes entries (ENT-004 Reservation, CON-002 atomic confirmation), one new ADR-0006 (multi-item atomicity uses one serialization point), and two narrative edits to docs/spec/architecture.md (a reservation binds one or more items; the store's serialization point is taken once per operation).
>
> Code: Reservation became record(User, Set<Item>, TimeWindow) — non-empty, defensively copied, with a single-item secondary constructor so the one-item case stays the one-element set. ReservationStore.replaceHoldWithReservation(Hold, Reservation) became replaceHoldsWithReservation(List<Hold>, Reservation), one synchronized call that consumes every hold and records the reservation under each of its items; record/remove now iterate the item set. ExpiringHoldService gained confirm(List<Hold>), which checks the whole set (non-empty, one user, one window, distinct items, every hold active against the injected clock, every hold recorded) before anything reaches the store, with InvalidHoldSetException / ExpiredHoldException / UnknownHoldException kept distinct; confirm(Hold) now delegates to it. The quota service counts items via flatMap instead of one per reservation. The cancellation service checks and reports over the item set. ReservationEngine.confirmHolds(List<Hold>) is the new facade method. Hold.toReservation() was deleted as orphaned.
>
> HOW THE REDESIGN WENT
>
> The shape of the change was decided in about ten minutes of reading and then barely wavered, because two specs pinned the two decisions that mattered before I wrote a line: ENT-004 told me the entity was the thing standing in the way ('binds exactly one user, item, and window' is a decision, not an accident), and CON-002 told me atomicity was already stated as a standing invariant, so the redesign was a widening of an existing claim rather than a new mechanism.
>
> The hard parts were three. First, the deadlock requirement: the story hinted at ordered per-item locking, but the store had one monitor and the honest question was whether to introduce lock striping at all. I decided against it and wrote the reasoning into ADR-0006 and CON-004 — the constraint is stated over the property so the mechanism can change later. If a reviewer disagrees with this increment anywhere, I expect it to be here. Second, the quota question, which the specs answered for me. Third, the four verification gaps the drift check surfaced, all of the same shape: I widened a spec, wrote genuinely new tests, and still left sentences of the spec's verification description unexercised while coverage read a cheerful 25/25.
>
> WHAT I MIGHT HAVE MISSED
>
> - Partial cancellation is out of scope by the story, but a user who books three items now cannot give back one. Nothing warns them.
> - The availability service was untouched and I believe correctly so (it reads reservationsFor(item), and multi-item reservations are indexed under every item), but I have no test that a multi-item reservation blocks an item through the availability path at the unit level — only through the acceptance test.
> - InMemoryReservationStore.replaceHoldsWithReservation does not verify the holds it removes are the ones it was told about, mirroring the pre-existing tolerance of the single-hold version (there is a test asserting the never-recorded case still records the reservation). The service checks it instead. That is consistent with the store owning mechanism and the service owning decisions, but it means the store's contract is weaker than the spec's prose might suggest.
> - The concurrency test is a barrier, not a proof; it will not catch a subtler contention bug.
>
> INTENT-ANCHORING TESTIMONIAL:
>
> I came into this repository knowing nothing about it and was asked to perform the change that breaks its central type. Here is what actually happened, plainly.
>
> The anchors did their strongest work in the first twenty minutes, and the value was not that they pointed at code — grep would have done that — but that they pointed at *sentences someone wrote down on purpose*. I opened Reservation.java and it was four lines: a record of user, item, window, and a marker naming ENT_004_RESERVATION. Following that marker got me a title that reads 'A Reservation binds exactly one user, item, and window' and a rationale explaining that fixing that shape is what let the confirm service, the availability computation and the double-booking check each be written against one definite structure. That is the difference between reading a record and understanding a decision. I knew immediately that widening it was not an incidental refactor but the removal of a load-bearing assumption three other components had been allowed to rely on — and, usefully, exactly which three to go look at.
>
> The single most valuable moment was the quota. ClaimCountingQuotaService did `.map(Reservation::item)` and counted. With a multi-item reservation, one line of arithmetic decides whether booking a room and a projector costs a user one or two, and the code cannot tell you which is right — the old code was correct for both readings because the two coincided when every reservation had exactly one item. I followed the anchor to SW-004 and CON-003 and both said, in words, 'active item claims — held items from active holds plus reserved items from confirmed reservations'. Items. That is a product decision written down before the ambiguity existed, and it made flatMap obviously right and 'held items become reserved items consumes no more quota' fall out as a consequence rather than as a special case I had to invent. Without that sentence I would have guessed, and I would have had a fifty-fifty chance of quietly changing what a quota means.
>
> Where it helped less. The high-altitude anchors were nearly inert for me: @RealizesStk(STK_001_NO_DOUBLE_BOOKING) sits on the ReservationEngine class, and following it gets you 'items are never double-booked' — true, important, and it told me nothing about what to do that I did not already know from the class name. The value of that anchor is that it fails to compile if the promise is deleted, not that it orients a reader. The fine-grained CON and SW anchors were worth ten of it.
>
> Where it actively misled me — and this is the honest part. An anchor is a claim, and I caught myself twice treating it as a map of the change set. It is not. Reshaping Reservation broke exactly three production call sites, and not one of them carried a marker naming ENT-004, because you anchor the decision, not every consumer. Had I trusted the anchor walk to enumerate the work I would have missed all three; the compiler found them in one command. The clew-context skill says this explicitly, which is the only reason I did not fall into it.
>
> The second misleading thing is subtler and I think it is the real risk of this method. After I had widened CON-002's text to span a whole hold set, the build was green, `clew check` said OK, and coverage said 25 of 25 Covered — while CON-002's only tests still asserted things about a single-item confirmation. Every mechanical signal was green over a claim nothing checked. The structure was intact and the meaning had drifted underneath it, and the system is designed not to notice. When I ran the drift review deliberately I found four of these in my own work, in an increment where I was consciously trying not to make that mistake. So anchoring bought me orientation and a checked skeleton; it did not buy me truth, and a green coverage number after a spec widening is close to meaningless on its own. I would rather have it than not — being told exactly which six specs to re-read, and having a spec text to re-read them against, is what made those four gaps findable at all — but anyone reading 'Covered' as 'verified' is being told something the tool never promised.
>
> One last concrete thing. The cost is real and it is in the writing, not the code. The Java changes here are perhaps 150 lines. I spent considerably longer on spec prose, ## Changes entries and the ADR than on the implementation, and about a third of the increment's total effort went into the six spec documents and the review of them. On this change that was worth it, because the next person to touch multi-item confirmation will find ADR-0006 explaining why there are no per-item locks — the single most likely thing for a well-meaning future author to 'fix' and thereby break. I am much less sure it would be worth it on a change that pins no decision.

---

## Anchoring reviews

Each increment was reviewed by a separate agent that had not written the code.

### STR-1 set up workspace

**Increment sound:** yes · **Green:** yes · **Story closed:** yes
**Fix commit:** `711180e` fix: review (STR-1 set up workspace) · **Close commit:** none

**Findings**

**STR-001** — defect · confirmed: yes · fixed: yes — mvnw committed without the executable bit, so ./mvnw fails on any POSIX checkout

git ls-files -s mvnw reported mode 100644. The technology contract (004 §1) states the wrapper is committed "so the build is reproducible without a local Maven install"; with no exec bit, ./mvnw on Linux/macOS/CI fails with 'Permission denied', which is exactly the case the wrapper exists for. The blob content itself is fine (LF line endings, .gitattributes forces eol=lf), so only the mode is wrong — and on Windows, where it was authored, the mode is not observable, which is why it slipped through. Fixed with `git update-index --chmod=+x mvnw` (now 100755); mvnw.cmd correctly stays 100644. Re-ran mvn -B verify (green, 4 tests, coverage checks met), clew coverage (universe empty, as expected — no specs yet), clew check (OK). Committed as 711180e.

**STR-001** — other · confirmed: no · fixed: no — ArchUnit state-change rule checks the declaration site, not the call site as architecture.md's prose says

src/test/java/io/example/reservations/architecture/ArchitectureBoundariesTest.java:36 enforces `methods().that().areAnnotatedWith(MutatesState.class).should().beDeclaredInClassesThat().resideInAPackage("..store..")`, whereas docs/spec/architecture.md says "only store classes may call declared state-mutating methods". Traced to ADR-0005, which spells the rule out as "only store classes may call declared state-mutating methods (marked by a @MutatesState annotation **or confined to the store package**)" — the implemented form is the second alternative the ADR explicitly authorises. It is also the only coherent one: a literal call-site rule would forbid services from calling the store's own mutators, which is the design's normal path (ADR-0002). No defect.

**STR-001** — vacuous-test · confirmed: no · fixed: no — Three of the four ArchUnit rules match nothing today and archunit.properties disables the empty-should failure

src/test/resources/archunit.properties sets archRule.failOnEmptyShould=false, and with no domain code the entities/api/@MutatesState rules currently evaluate over an empty set. I probed each rule rather than trusting it: planted one violating class per rule (an entities class depending on store, an api class depending on store, a @MutatesState method in services/hold, and a class in a package with no package-info) and ran mvn -B test — all four rules failed, each naming its own violation, then removed the probes and re-verified green. The rules are live, not vacuous; the failOnEmptyShould setting is unavoidable for a skeleton whose domain code arrives in the next increment and is stated in the commit message.

**STR-001** — other · confirmed: no · fixed: no — JaCoCo 80% LINE gate could have been inert or over-excluding

pom.xml binds jacoco:check to verify with element=BUNDLE, LINE COVEREDRATIO >= 0.80, excluding clew/traceables/**, **/package-info.class and **/MutatesState.class — matching 005 §5's exclusion list exactly. Probed both directions: an uncovered two-method class under io.example.reservations.entities made verify fail with 'Coverage checks have not been met' (bundle analysed 1 class, so the 8 package-infos and MutatesState are correctly excluded), and an executable enum planted at clew/traceables/clew/ left the bundle at 0 classes, confirming the traceables path pattern will actually exclude the generated sources once they exist. Gate is correctly wired.

**STR-001** — other · confirmed: no · fixed: no — Story went straight from planned to done in the implement commit, skipping active and preceding this review

006 §4 says the implementation step sets a story active when the increment begins and done when it closes 'with its specs Covered and reviewed'; commit 6349fff promoted STR-TMP-001 to docs/spec/stories/STR-001-set-up-the-workspace.md already carrying **Status**: done, so no separate active state was ever recorded and done was written before the review ran. Not a code defect and not something to revert: 006 assigns the done transition to the implementation step, this story authors no specs so there is no coverage gate to await, and the end state is exactly what this review would have set. Noted as a workflow-ordering observation only.

**Review note**

> Reviewed both increment commits (c92f51e scaffold+draft, 6349fff implement) file by file. The governance set (000-006), the five ADRs and docs/spec/architecture.md are byte-identical to the design surface under setup/reservations-cas-dd-demo/ (verified by diff; only ADR-template.md is additional, from the clew scaffold), and the promoted story is verbatim the source story with only Status changed. The eight packages named in architecture.md's code-organization block are all present, each with a @NullMarked package-info; MutatesState uses RetentionPolicy.CLASS, which ArchUnit does read from bytecode — confirmed by the probe run. ENT is registered in both .clewrc.json and docs/spec/schemas/spec.schema.yaml, so ENT ids will mint and validate in the next increment. Rather than reading the four ArchUnit rules and the JaCoCo gate and calling them plausible, I planted deliberate violations for each and observed all six checks fail, then removed the probes — this is where a setup increment usually hides its rot (rules that look right but match nothing forever), and none of it was rotten here. One real defect found and fixed: mvnw was committed non-executable (mode 100644), which makes ./mvnw unusable on POSIX and quietly defeats the reason 004 gives for committing a wrapper; fixed via git update-index --chmod=+x and committed as 711180e. Final state: mvn -B verify green (4 tests, coverage checks met), clew check OK, clew coverage empty by design (no specs authored in this increment), working tree clean. No close commit was made because commit 6349fff had already written **Status**: done into the story — no story is left active, clew status reports STR-001 done, and that is the state this review would have set, so I left it rather than churn the file; the ordering is reported as finding 5.

### STR-2 reserve single item

**Increment sound:** no · **Green:** yes · **Story closed:** yes
**Fix commit:** `9c1a49a` fix: review (STR-2 reserve single item) · **Close commit:** none

**Findings**

**ARCH-002** — stale-verify · confirmed: yes · fixed: yes — The ArchUnit rule anchored to ARCH-001/ARCH-002 asserted where state-mutating methods are declared, not the access rule both specs state ("only store classes may call declared state-mutating methods"); as annotated, the production code violated that rule.

ARCH-001's verification description asks that "no write access to persisted state originates outside the store package" and ARCH-002's third rule that "only store classes may CALL declared state-mutating methods". The increment anchored both to state_mutating_methods_are_declared_only_in_the_store, a declaration-site rule (methods().that().areAnnotatedWith(MutatesState).should().beDeclaredInClassesThat().resideInAPackage("..store..")), which asserts a different and weaker property. I probed the literal rule (noClasses().that().resideOutsideOfPackage("..store..").should().callMethodWhere(target(annotatedWith(MutatesState.class)))) and it FAILED once: CheckedReservationConfirmationService.confirm calls ReservationStore.record, which carried @MutatesState — i.e. the code as annotated broke the rule the corpus states, and the weaker rule is what kept the build green (a silent deviation, 003 §7). Since services must call record to hand their change to the store (ARCH-001, SW-001), the self-consistent reading is that @MutatesState marks the method that actually mutates persisted state. Fix (C:\develop\intellij-installations\clew-example-reservations2): moved @MutatesState from ReservationStore.record to InMemoryReservationStore.record; added only_the_store_calls_state_mutating_methods anchored @VerifiesArch({ARCH_001, ARCH_002}) (the declaration rule kept, unanchored); also added api_depends_only_on_service_interfaces_and_entities anchored to ARCH-002 for the unasserted half of its api clause ("may depend only on service interfaces and DTOs" — only the "not the store" half was checked). Both new rules were probed to fail when their premise is broken, so neither is vacuous. mvn -B verify green (28 tests), clew coverage 13/13 covered, clew check OK.

**CON-001** — defect · confirmed: yes · fixed: no — confirm() is a check-then-act across two independent store locks, so two concurrent confirmations of overlapping windows for the same item can both succeed — the invariant CON-001 states holds "at no point" can be broken.

CheckedReservationConfirmationService.confirm calls availabilityService.isAvailable(item, window) — which reads through InMemoryReservationStore.reservationsFor under one acquisition of the store monitor — and then, after releasing it, reservationStore.record(reservation) under a second acquisition. Each call is atomic; the compound decision is not. Two threads confirming overlapping windows for the same item can both observe "available" and both record, leaving the item bound by two overlapping reservations. That contradicts CON-001 ("At no point may an item be bound by two active reservations over overlapping windows") and docs/spec/architecture.md §Atomicity and contention ("An operation serializes on the item it touches, so two operations on the same item never interleave") — the store's synchronized methods signal that thread-safety was intended, which makes the half-done version worse than an explicitly single-threaded engine. NOT FIXED, deliberately: every available fix is a structural change to the store contract — an atomic conditional record, or a store-owned lock scope the service runs its decision inside. Both change ReservationStore's public interface, and the store cannot signal the rejection itself because ItemUnavailableException lives in services.reservation, which store must not depend on (ARCH-002); re-checking inside the store would also duplicate the decision the service owns (SW-001). Per 002 §3 and the 000 conflict-handling protocol that is an architectural decision needing explicit justification and spec authority (no spec in this increment states a concurrency requirement — only the narrative architecture doc does), so it is escalated rather than made silently inside a review fix. Recommend a CON spec pinning concurrent-confirmation atomicity, then the store API change.

**CON-001** — misanchor · confirmed: no · fixed: no — CON-001 is verified at APPLICATION level while the testing contract maps CON specs to UNIT — examined and dismissed, the anchored test is the one that genuinely exercises the spec.

005-testing-contract §2 says UNIT verifies SW, ENT and CON specs and APPLICATION verifies STK and SYS, but @VerifiesCon(CON_001_NO_DOUBLE_BOOKING) sits on ReservationEngineAcceptanceTest.no_item_is_bound_by_two_reservations_over_overlapping_windows_across_a_sequence_of_operations. I traced it: CON-001's own verification description asks for a test that "attempts an overlapping reservation after a first is established and asserts the invariant holds across a sequence of operations" — which is exactly what that acceptance test does, and which a mock-driven unit test of CheckedReservationConfirmationService cannot do (no first reservation can be established against a mocked AvailabilityService). Moving the anchor down would produce a weaker, partly vacuous claim. Changed nothing; noting the contract-vs-spec tension for the corpus owner.

**SW-001** — vacuous-test · confirmed: no · fixed: no — Checked whether the SW-001 unit tests are mock-shaped no-ops — they are not.

CheckedReservationConfirmationServiceTest asserts decision-before-change with InOrder plus verifyNoMoreInteractions, asserts verifyNoInteractions(reservationStoreMock) on the rejected path, and verify(times(1)) on the recorded reservation value. Each assertion would fail if the service reordered, skipped, or duplicated the store handoff, so the tests carry real weight for "computes availability, then hands exactly one atomic change to the store".

**ENT-002** — defect · confirmed: no · fixed: no — Checked the half-open overlap and end<=start rejection logic for an off-by-one — correct.

TimeWindow.overlaps is start.isBefore(other.end) && other.start.isBefore(end), which is exactly half-open [start,end) overlap: adjacent windows [10,11) and [11,12) do not overlap in either direction, nested and partial overlaps do, and a window overlaps itself. The compact constructor rejects end<=start via !end.isAfter(start), covering both the reversed and the degenerate-equal case. ComputedAvailabilityService.isAvailable then uses noneMatch(window::overlaps) over the item's reservations only, and the acceptance test confirms an adjacent window succeeds end-to-end (the AC "adjacent windows are both allowed"). No defect.

**CON-002** — unmet-requirement · confirmed: no · fixed: no — Checked that a rejected confirmation leaves no trace and a successful one records exactly one reservation, at both levels — met.

Unit level: verifyNoInteractions on the rejected path and verify(times(1)) + verifyNoMoreInteractions on the success path. Application level: after a rejection the acceptance test still shows the adjacent window bookable and the covered window unavailable, so no phantom record was left. InMemoryReservationStore.record is a single map mutation under the monitor, and reservationsFor returns List.copyOf (asserted unmodifiable), so no partial state is observable through the API. Met as stated.

**Review note**

> Reviewed every file in 2b09e72 (draft) and 2819736 (implement). Build state after my fix: mvn -B verify green (28 tests, JaCoCo line gate met), pnpm run clew coverage 13 covered / 0 gaps, pnpm run clew check OK. One fix commit: 9c1a49a. Story closing: no file under docs/spec/stories/ was left with Status active — STR-002 was promoted already carrying **Status**: done inside the implement commit, so the end state is correct and no close commit was needed (closeCommit empty, storyClosed true). Minor process note for the corpus owner: 006 §4 wants a story born planned, set active when the increment begins and done when it closes; here it went straight to done at promotion, so the active phase is not visible in git. incrementSound is false only because of the unfixed CON-001 concurrency finding: the confirm path's check-then-act spans two independent acquisitions of the store monitor, so concurrent overlapping confirmations can both succeed. Every correct fix changes ReservationStore's contract (atomic conditional record or a store-owned lock scope) and the store cannot throw ItemUnavailableException without breaking ARCH-002 layering — an architectural decision that needs a spec, so I escalated it instead of making it silently in a review commit. Sequentially the engine is correct: the double-booking rejection, adjacency, computed availability and atomicity behaviour all hold and are genuinely tested.

### STR-3 tentative holds with expiry

**Increment sound:** yes · **Green:** yes · **Story closed:** no
**Fix commit:** `d7afcbe` fix: review (STR-3 tentative holds) · **Close commit:** none

**Findings**

**NF-001** — vacuous-test · confirmed: yes · fixed: yes — SystemClockTest could not fail for a wrong clock adapter — the whole suite stayed green with SystemClock.now() returning a constant

src/test/java/io/example/reservations/clock/SystemClockTest.java asserted only that a second reading of the wall clock is not before the first (isAfterOrEqualTo). That assertion holds for any fixed instant, so it verified nothing about the adapter. Probed it: with SystemClock.now() replaced by Instant.EPOCH, `mvn -B -o test` ran 49 tests, 0 failures — the entire suite, including the acceptance test that assembles the engine with the system clock, stayed green. This matters for NF-001 ('every time-dependent decision is evaluated against the injected clock'): the production adapter that supplies that time was the one link nothing checked, and an engine built through Reservations.newInMemoryReservationEngine() with a constant clock would treat every hold as permanently expired or permanently active undetected. Fix: assert both readings lie after a fixed past instant, keeping the ordering assertion — re-probed against Instant.EPOCH and the test now fails, then restored the implementation and re-ran mvn -B verify green, clew coverage 17/17 Covered, clew check OK. Committed as d7afcbe.

**CON-001** — defect · confirmed: no · fixed: no — ExpiringHoldService.place is check-then-act, so concurrent placements could both pass the availability check

place() calls availabilityService.isAvailable(...) and then reservationStore.record(hold) as two separate store interactions; two threads placing overlapping holds on the same item could both observe availability before either records. Dismissed as not a defect of this increment: the store methods are individually synchronized (ARCH-001's 'serializes and applies atomically' holds at store granularity), the identical check-then-act pattern was introduced for confirmation in STR-002 and reviewed there, no spec in the corpus states a concurrent-use requirement, and closing it would mean moving the availability decision into the store — a structural change the story does not authorize (002-architecture §3, §5). Left the code unchanged.

**CON-001** — defect · confirmed: no · fixed: no — confirmHold records the reservation without re-checking the window, relying on the standing invariant instead

ExpiringHoldService.confirm checks expiry and store membership, then calls replaceHoldWithReservation without any availability check. Traced whether that can double-book: place() rejects a hold whose window overlaps an existing claim, and while a hold is active every overlapping confirm or place is rejected by ComputedAvailabilityService, so no overlapping claim can exist while the hold is confirmable. The only way to break it is a clock that moves backwards across an expiry instant (a hold expires, an overlapping reservation is admitted, the clock rewinds and the hold is confirmable again) — SystemClock is forward-moving and the spec corpus states no backwards-clock tolerance. Real invariant, correctly argued; not a defect. Left unchanged.

**ENT-005** — unmet-requirement · confirmed: no · fixed: no — ENT-005 names release as an end of a hold's active life, which no code models

ENT-005 states a hold is active 'until it expires, is confirmed into a reservation, or is released'. Hold.isActiveAt covers only expiry; confirmation is modelled by removal from the store (a second confirmHold yields UnknownHoldException, asserted in the acceptance test). Release has no implementation — but the story lists 'owner-initiated cancellation and release' under Out of scope, and ENT-005's own Verification Description asks only for the expiry boundary, which HoldTest asserts at strictly-before, exactly-at and after. No unmet requirement for this increment.

**SW-002** — other · confirmed: no · fixed: no — The hold service throws ItemUnavailableException, a type owned by the sibling services.reservation package

ExpiringHoldService.place imports io.example.reservations.services.reservation.ItemUnavailableException, coupling services.hold to services.reservation. Judged not a defect: the type is part of that package's public surface, reusing it keeps one observable rejection type for 'the window is taken' across both entry points (the acceptance test asserts exactly that for confirm and placeHold alike), no ArchUnit rule or ARCH spec constrains service-to-service dependencies, and relocating it would be a structural change outside the story's scope. Left unchanged.

**Review note**

> Reviewed every file in 4add9e9..5ba3acf (the draft and implement commits): the six specs, the new clock port and SystemClock, Hold, ExpiringHoldService with its two exceptions, the widened ComputedAvailabilityService, the store's holdsFor/record(Hold)/replaceHoldWithReservation, the composition root, and all five touched or added test classes. Baseline before any change was already green (mvn -B -o verify, 49 tests; clew coverage 17 covered / 0 realized / 0 verified / 0 none; clew check OK).
>
> The implementation is correct on the substance: half-open expiry (isActiveAt is strictly-before, asserted at the boundary and one millisecond either side), availability recomputed per query from reservations plus holds still active at a single captured clock reading, confirmation handed to the store as one atomic replaceHoldWithReservation so a hold is never both a hold and a reservation, a fabricated or already-consumed Hold rejected as unknown, and an expiry-in-the-past guard on place that incidentally rules out the value-equality hazard of re-placing a Hold equal to an expired one. Every story acceptance criterion and every spec Verification Description is exercised by a real assertion; the SYS-002 and CON-001 Changes entries are present and state why, not just what.
>
> One confirmed defect, fixed and committed as d7afcbe: the SystemClock test was vacuous, proven by probing the production class with a constant (whole suite stayed green). Four further concerns were traced and dismissed without changing code; the concurrency one is the only pre-existing design gap worth carrying forward if the engine ever becomes multi-threaded.
>
> Story not closed by me: docs/spec/stories/STR-003-tentative-holds-with-expiry.md was already committed with **Status**: done inside the implement commit 5ba3acf, so no story under docs/spec/stories/ carries **Status**: active and there was no transition left to make or commit. All three gates are green (mvn -B verify, all 17 specs Covered including SYS-003, SW-002, ENT-005, NF-001, and clew check OK), so the increment is closed in substance — the status transition was simply recorded one commit earlier than the workflow expects. Worth correcting upstream: the implement step should leave the story active for the reviewer to close.

### STR-4 owner cancellation and release

**Increment sound:** yes · **Green:** yes · **Story closed:** yes
**Fix commit:** none · **Close commit:** none

**Findings**

**SYS-004** — other · confirmed: no · fixed: no — release() does not require the hold to be active, though the spec says "active hold"

ExpiringHoldService.release checks ownership and store membership but not hold.isActiveAt(clock.now()), unlike confirm(). Traced to ComputedAvailabilityService.claimedWindowsOf: expired holds are already filtered out of the claimed windows, so removing an expired hold changes nothing observable - it cannot free a window that was not already free, and it cannot remove another party's claim (records are value-equal including the user). No acceptance criterion in STR-004 and no sentence in SYS-004/SW-003 requires rejecting the release of an expired hold. Dismissed; nothing changed.

**SW-003** — other · confirmed: no · fixed: no — check-then-act across two store calls is not a single atomic store operation

Both cancel() and release() read (reservationsFor/holdsFor .contains) and then mutate (store.remove), so decision and mutation are two calls. STR-004's AC says cancellation and release are atomic (ADR-0002). ADR-0002 itself states 'services compute decisions and hand the change to the store to apply', which is exactly this shape, and matches the already-reviewed confirm path (isAvailable then record). The mutation is synchronized and @MutatesState in InMemoryReservationStore, so it is applied atomically; a lost race only makes the second remove a no-op, and removing a claim can never create a double booking. Dismissed; nothing changed.

**SW-003** — defect · confirmed: no · fixed: no — possible ownership bypass by fabricating a claim object naming the caller

Hypothesis: since cancel/release take a caller-supplied Reservation/Hold, BOB could construct new Reservation(BOB, MEETING_ROOM, TEN_TO_ELEVEN) to pass the ownership check and delete ALICE's claim for that window. Traced through the records: User is a component of both Reservation and Hold, so the fabricated value is not equal to the stored one, reservationsFor(item).contains(...) is false, and UnknownReservationException is thrown. The same argument makes List.remove's first-occurrence semantics safe: value-equal duplicate claims cannot be created, because place() and confirm() both gate on availability. No bypass exists. Dismissed; nothing changed.

**SYS-004** — vacuous-test · confirmed: no · fixed: no — release acceptance test asserts availability on a different window than the hold's

releasing_an_active_hold_frees_its_window_for_others_and_only_its_owner_may_release_it places a hold on TEN_TO_ELEVEN but asserts isAvailable(MEETING_ROOM, HALF_PAST_TEN_TO_TWELVE). The two windows overlap (TimeWindow.overlaps), and the test clock is NINE while the hold expires at HALF_PAST_NINE, so the hold is genuinely active: the false-then-true flip is caused by the release, not by expiry. The test also re-confirms the window as BOB afterwards, which would fail if the hold were still recorded. Non-vacuous. Dismissed; nothing changed.

**STR-004** — other · confirmed: no · fixed: no — story promoted straight to Status: done inside the implement commit, never active in the corpus

git show 14b27a3 shows docs/spec/stories/STR-004-owner-cancellation-and-release.md added with Status: done. Per 006-spec-conventions section 4, the implementation step sets a story active when the increment begins and done only when it closes with its specs Covered and reviewed, so the recorded history skipped active and pre-declared 'reviewed' before this review ran. This is a workflow-sequencing deviation, not a defect in the increment's code, tests or specs, and clew check reports OK. The end state is the correct one now that verify, coverage and check are all green, and rewriting committed history is not a fix. Dismissed; nothing changed.

**Review note**

> Reviewed the full diff of 6d59bba (draft) and 14b27a3 (implement) - every changed file read on its own terms, plus SYS-004, SW-003, ARCH-001, CON-002 and ADR-0002 for the requirements they impose. Re-ran the gates myself rather than inheriting them: mvn -B -o verify BUILD SUCCESS (58 tests, JaCoCo line gate met), pnpm run clew coverage 19 covered / 0 realized / 0 verified / 0 none, pnpm run clew check OK. No confirmed defects, so there is no fix commit and the working tree is clean. On closing: docs/spec/stories/ contains no file with Status active - STR-004 was already done, having been promoted with that status inside the implement commit (finding 5), so there was nothing to change and no close commit was made. The increment is closed and the story is done; the absent close commit reflects that the implement step did the transition early, not that the increment was left open. One non-blocking quality note, deliberately not changed under the minimize-scope rule: the UnknownHoldException message string is now duplicated verbatim between ExpiringHoldService.confirm and ExpiringHoldService.release.

### STR-5 per-user quota (CON-003 quota-bound, SW-004 quota-service, ENT-003 user revised)

**Increment sound:** yes · **Green:** yes · **Story closed:** yes
**Fix commit:** `a8e4e49` fix: review (STR-5 per-user quota) · **Close commit:** none

**Findings**

**SW-004** — vacuous-test · confirmed: yes · fixed: yes — The per-user isolation acceptance test could not fail for the reason it names, because its admitting leg used an unbounded user.

ReservationEngineAcceptanceTest.one_users_quota_does_not_bound_another_users_claims drove CARLA_ON_A_QUOTA_OF_TWO to quota, asserted the next confirm throws, then asserted `confirm(ALICE, LIBRARY, ...)` succeeds as the isolation evidence. ALICE is `new User("alice")`, i.e. UNBOUNDED_QUOTA = Integer.MAX_VALUE, so that leg holds no matter whether the count is attributed per user at all. Confirmed by mutation, not by reading: I deleted the `.filter(reservation -> reservation.user().equals(user))` from InMemoryReservationStore.reservationsOwnedBy — making every user's claims count against every user's quota, a direct violation of SW-004's 'counts the user's active item claims' — and the entire ReservationEngineAcceptanceTest stayed green (15/15), including the CON-003-anchored invariant test, which only ever exercises carla. Only the two store unit tests caught it, so the application level had no guard on this at all. Fix: added DEREK_ON_A_QUOTA_OF_ONE and used him for the admitting leg, plus a follow-on assertion that his own quota then refuses his second claim (so the admission is not just an unbounded user slipping through). Re-ran the same mutation against the strengthened test: it now fails with 'User derek already claims 2 item(s) and its quota of 1 admits no further claim'. Store restored, mvn -B verify green (72 tests, JaCoCo gate met), clew coverage 21/21 Covered, clew check OK.

**CON-003** — other · confirmed: no · fixed: no — A confirmed reservation consumes quota permanently — a past window never frees headroom — but this is what the spec says, not a code defect.

ClaimCountingQuotaService counts every reservation from reservationsOwnedBy with no time filter, while holds are filtered by isActiveAt. So a reservation whose window ended months ago still consumes headroom until cancelled; over a long-lived engine every user eventually locks themselves out. I traced this to the spec before judging it: CON-003 says 'held items from active holds plus reserved items from confirmed reservations' — it qualifies the hold case explicitly ('active, unexpired holds' in STR-005) and pointedly leaves reservations unqualified, and names exactly three reducers (expiry, release, cancellation), none of which is 'the window passed'. The implementation is faithful; changing it would contradict the spec. Flagged for the spec author rather than fixed.

**CON-003** — other · confirmed: no · fixed: no — The effective quota is whatever the caller puts in the User argument, so a caller can present a larger quota for the same user id — but ENT-003 explicitly sanctions this.

requireHeadroomFor reads user.quota() off the passed-in User, while the claim count is matched by id (User.equals is id-only). A caller holding 2 claims as new User("carla", 2) can pass new User("carla", 5) and be admitted, which reads as a violation of CON-003's 'never exceed the quota carried by that user'. Not a code defect: ENT-003 was deliberately widened this increment to state that two Users with the same identity and different quotas are the same User and that the quota is never part of identity, so 'the quota carried by that user' is under-determined at the spec level, not mis-implemented. There is no user registry in the architecture for an authoritative quota to live in, so closing this would be a structural change (new store/entity) that no spec authorizes — a stop condition, not a review fix. Raised as a spec sufficiency gap.

**SW-004** — other · confirmed: no · fixed: no — confirmHold is the one claim path with no quota gate; verified count-preserving, so correct.

ExpiringHoldService.confirm consults no QuotaService. Traced the store path: it rejects an inactive hold and a hold the store does not contain, then calls replaceHoldWithReservation, which removes exactly the one hold and adds one reservation for the same user and item — the counted total is unchanged, so it can never take a user over quota. Also checked the duplicate-equal-hold and double-confirm cases (the second confirm throws UnknownHoldException). Ungating it is right; gating it would wrongly refuse a user at quota from confirming their own hold.

**CON-002** — other · confirmed: no · fixed: no — Check-then-record between requireHeadroomFor and the store write is not atomic under concurrency, but the gap is pre-existing and unspecified.

Both gates call quotaService.requireHeadroomFor(user) and then reservationStore.record(...) as two separately synchronized store interactions, so two concurrent callers could both pass the check and land a user one over quota. This is the identical shape CON-001/SW-001 already use for the availability check (introduced in STR-002), not something this increment brought in, and no loaded spec states a concurrency requirement — ADR-0002/CON-002 only claim per-change atomicity in the store, which holds. Out of this increment's scope under charter IV; noted rather than changed.

**ENT-003** — other · confirmed: no · fixed: no — User's hand-written equals/hashCode over the record are correct and adequately covered.

Checked the override for the usual record-with-custom-equality traps: reflexive/symmetric/transitive, hashCode consistent with equals (both id-only), record is final so no subclass asymmetry, and the negative-quota guard is in the compact constructor. Verified the id-only equality is what every downstream consumer needs — store removal, ownership checks in release/cancel, and the per-user claim filters all compare Users and must treat the same id with a different quota as the same party, which is exactly ENT-003's stated intent. UserTest covers same-id/different-quota, the unbounded form, the other-type branch and the negative quota. No defect.

**Review note**

> One confirmed defect, fixed and committed as a8e4e49; final state is mvn -B verify green (72 tests, JaCoCo gate met), clew coverage 21 covered / 0 realized / 0 verified / 0 none, clew check OK.
>
> The confirmed finding was a vacuous assertion leg rather than a production bug: the acceptance test named for per-user quota isolation used the unbounded ALICE as its second user, so the leg passed regardless of whether claims were attributed per user. I verified this by mutation instead of by reading — deleting the per-user filter from InMemoryReservationStore.reservationsOwnedBy left the entire acceptance suite green, including the CON-003 invariant test. The strengthened test now fails under that mutation. Production code for STR-5 is otherwise sound: I traced the two claim gates, the ungated confirmHold path, the store's user-keyed reads, and User's equality override, and found no correctness defect.
>
> Two things worth the author's attention that I deliberately did not change, both spec-level rather than code-level (see findings for the trace):
> - A confirmed reservation consumes quota forever; a window passing is not one of the three reducers CON-003 names. Faithful to the spec as written, but likely not intended over a long-lived engine.
> - The effective quota is whatever the caller puts in the User argument, and ENT-003 explicitly makes same-id/different-quota the same user, so CON-003's "the quota carried by that user" is under-determined. Closing it needs a user registry — a structural change no spec authorizes.
>
> On closing: no story was in **Status**: active. The implement commit (75d4329) promoted STR-005 straight to `done`, so there was no active→done transition left for me to make and no close commit was created. The state is nonetheless correct — the gates that justify `done` are all green — so storyClosed is reported true with an empty closeCommit. Flagging the process deviation only: 006-spec-conventions §4 has the implementation step set the story `active` when the increment begins and `done` when it closes "with its specs Covered and reviewed", so committing `done` inside the implement commit marks the story reviewed before the review ran. clew check does not object, and no corpus edit was needed.

### STR-6 multi-item redesign (blind)

**Increment sound:** yes · **Green:** yes · **Story closed:** yes
**Fix commit:** `ed04b10` fix: review (STR-6 multi-item redesign (blind))
**Close commit:** `70b5067` feat: implement atomic-multi-item-bookings (STR-6) — the story file was already committed with **Status**: done there; no separate close commit was needed or made

**Findings**

**CON-003** — defect · confirmed: yes · fixed: yes — A multi-item reservation counted once per item against its owner's quota, so confirming two held items left the user claiming four.

InMemoryReservationStore.reservationsOwnedBy flattened reservationsByItem, where a reservation is indexed under each of its items, so a multi-item reservation was returned n times. ClaimCountingQuotaService.activeItemClaimCountOf then mapped Reservation::items and flatMapped, counting n*n item claims. CON-003 (quota counted in items) plus the STR-006 AC 'confirming holds a user already holds consumes no additional quota' require the count to be exactly preserved across confirmation: two held items (count 2) became a reservation counted as 4. Proven by a failing test before the fix: 'User erin already claims 4 item(s) and its quota of 3 admits no further claim'. Fixed by returning each of the user's reservations once from the store (.distinct() in reservationsOwnedBy) — the repetition is an index detail that must not leak to callers. Deliberately NOT fixed by deduplicating items in the quota service: that would collapse the same item reserved for two different windows, which is two genuine claims. Regression tests added: InMemoryReservationStoreTest.a_multi_item_reservation_is_owned_once_however_many_items_it_covers and the strengthened acceptance test.

**CON-003** — vacuous-test · confirmed: yes · fixed: yes — The acceptance test named for quota neutrality asserted only that the quota was still exhausted, which held whether the count was right or doubled.

ReservationEngineAcceptanceTest.confirming_the_items_a_user_already_holds_consumes_no_further_quota used a user on a quota of two, placed two holds, confirmed them, and asserted a further confirm throws QuotaExceededException. With the correct count (2 >= 2) and with the over-count (4 >= 2) the assertion passes identically, so the test could not observe the property it is named for — which is why the defect above shipped green. Rewritten against a quota of three: after confirming two held items a third claim must succeed and only a fourth (the same item in another window) must be refused, which pins the count at exactly two and also guards the opposite failure mode of over-deduplicating items.

**STR-006** — other · confirmed: yes · fixed: no — The story was committed with Status: done inside the implement commit, before the review that 006 makes a precondition of done.

docs/spec/stories/STR-006-atomic-multi-item-bookings.md was added in 70b5067 already carrying **Status**: done. 006-spec-conventions §4 says the implementation step sets a story active when the increment begins and done when it closes 'with its specs Covered and reviewed' — done was claimed one commit before the review, and while it was claimed the increment in fact carried the confirmed CON-003 defect above. Nothing changed for this: after the fix the end state (done, green, Covered, checked) is the correct one, and rewriting history or re-committing an unchanged field would add noise. Consequence for this run: no story was left active for the reviewer to close, so there is no separate close commit.

**CON-004** — other · confirmed: no · fixed: no — Dismissed: the concurrent-confirmation test is a real deadlock check, not a vacuous one.

ReservationEngineAcceptanceTest.two_confirmations_over_overlapping_items_both_finish_instead_of_waiting_on_each_other runs 50 rounds of two threads confirming two-item sets over the same two items in opposite orders, released together by a CountDownLatch and joined with a bounded Future.get(10, SECONDS). A hang fails the test rather than passing it silently, and both results are asserted to cover both items. The realizing code matches: InMemoryReservationStore.replaceHoldsWithReservation is one synchronized method taking the store's single monitor once, and ExpiringHoldService hands the store exactly one call, so no operation holds one claim while waiting for another (ADR-0006 D1/D2). No defect.

**CON-002** — other · confirmed: no · fixed: no — Dismissed: hold-set confirmation is genuinely all-or-nothing; every check precedes the single store mutation.

ExpiringHoldService.confirm(List) runs requireWellFormedHoldSet, requireEveryHoldActive and requireEveryHoldRecorded — all read-only (holdsFor only) — before constructing the reservation and calling replaceHoldsWithReservation once. There is no path that consumes part of a set: the only mutation is the single synchronized store call that removes every hold and records the one reservation. Unit tests assert verifyNoInteractions/verifyNoMoreInteractions on the store mock for each rejection reason, and the acceptance tests assert the items stay available after a refused group. No defect.

**ENT-004** — other · confirmed: no · fixed: no — Dismissed: the widened Reservation enforces non-empty, duplicate-free, immutable items as the spec states.

The compact constructor does Set.copyOf(items) before the emptiness check, so the record is defensively copied (a later mutation of the caller's set cannot reach it, asserted by a test) and duplicates cannot exist in a Set. Empty construction throws IllegalArgumentException. The convenience single-item constructor delegates to Set.of(item), so the single-item case is the one-element set and value equality with the multi-item form is preserved, which every call site and store lookup relies on. Availability (reservationsFor per item) and cancellation (recorded-for-every-item check, removal from every item) were traced for the widened shape and are consistent. No defect.

**Review note**

> Reviewed every file the increment's commits touched (70b5067; 3dcd88b is the draft). One real defect found and fixed, plus the weak test that let it through.
>
> The defect: InMemoryReservationStore indexes a reservation under each of its items (reservationsByItem), so the flattened reservationsOwnedBy repeated a multi-item reservation once per item; ClaimCountingQuotaService then flat-mapped items over that list and counted an n-item booking n times. Proven before fixing — the failing acceptance test reported "User erin already claims 4 item(s)" after confirming two held items. Fixed in the store (distinct()), not in the quota service: deduplicating items there would collapse the genuinely distinct claim of one item reserved for two different windows. The new acceptance test asserts both directions (a third claim still fits, a fourth does not, the fourth being the same item in another window).
>
> Post-fix state: mvn -B verify green (89 tests, JaCoCo gate met), pnpm run clew coverage 25 covered / 0 gaps, pnpm run clew check OK, working tree clean.
>
> Story closure: docs/spec/stories/STR-006-atomic-multi-item-bookings.md was already committed with **Status**: done inside the implement commit itself, so no story was left active and there was nothing for me to transition or commit. The end state is correct (increment complete, green, Covered, reviewed), but the transition happened before the review rather than at close, which is a workflow deviation from 006-spec-conventions §4 ("done when the increment closes with its specs Covered and reviewed"). Reported as the third finding; nothing was changed for it.
>
> Files of interest (absolute):
> C:\develop\intellij-installations\clew-example-reservations2\src\main\java\io\example\reservations\store\InMemoryReservationStore.java
> C:\develop\intellij-installations\clew-example-reservations2\src\main\java\io\example\reservations\services\quota\ClaimCountingQuotaService.java
> C:\develop\intellij-installations\clew-example-reservations2\src\test\java\io\example\reservations\api\ReservationEngineAcceptanceTest.java
> C:\develop\intellij-installations\clew-example-reservations2\src\test\java\io\example\reservations\store\InMemoryReservationStoreTest.java

---

## Measured cost

Every figure below is copied verbatim from the two collector outputs — [`docs/metrics/run-metrics-cas-dd.md`](metrics/run-metrics-cas-dd.md) (from the raw transcripts) and [`docs/metrics/repo-metrics-cas-dd.md`](metrics/repo-metrics-cas-dd.md) (from git).
Nothing here is recomputed, rounded or re-derived.

The tables below are the snapshot the collectors produced for the fifteen agent tasks of the run proper, before this reporting step existed.
The collectors were then re-run so the committed metrics files also cover the metrics step; those files therefore carry two rows the tables below do not (`metrics`, and a `report` row for this task).
That `report` row is necessarily incomplete — tokens are still being spent on this document as it is written — so neither the tables below nor the committed files are a complete run total.

### Tokens and time per task

| task | kind | in | out | cache write | cache read | total | reqs | gen min | tool min | wall min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| preflight | preflight | 4 | 262 | 35,942 | 35,463 | 71,671 | 2 | 0.0 | 0.1 | 0.1 |
| str-1 | increment | 86 | 30,289 | 107,247 | 3,100,083 | 3,237,705 | 43 | 2.8 | 7.6 | 10.4 |
| str-1-review | review | 1,317 | 19,120 | 77,332 | 1,550,374 | 1,648,143 | 26 | 1.1 | 6.8 | 7.9 |
| str-2 | increment | 580 | 74,501 | 169,275 | 5,971,038 | 6,215,394 | 58 | 5.7 | 13.8 | 19.5 |
| str-2-review | review | 1,042 | 41,625 | 117,211 | 2,526,917 | 2,686,795 | 29 | 1.4 | 11.3 | 12.8 |
| str-3 | increment | 1,260 | 56,061 | 165,113 | 7,483,270 | 7,705,704 | 71 | 5.4 | 14.0 | 19.4 |
| str-3-review | review | 62 | 19,105 | 103,373 | 2,362,817 | 2,485,357 | 31 | 1.2 | 8.8 | 10.0 |
| str-4 | increment | 678 | 30,129 | 136,286 | 4,924,507 | 5,091,600 | 52 | 2.9 | 7.1 | 9.9 |
| str-4-review | review | 34 | 17,685 | 87,386 | 995,399 | 1,100,504 | 17 | 0.8 | 4.3 | 5.1 |
| str-5 | increment | 130 | 61,861 | 183,935 | 7,489,670 | 7,735,596 | 65 | 5.7 | 13.1 | 18.7 |
| str-5-review | review | 68 | 23,811 | 100,887 | 2,624,965 | 2,749,731 | 34 | 1.4 | 8.8 | 10.2 |
| str-6-cherry-pick | increment | 6 | 800 | 38,194 | 75,213 | 114,213 | 3 | 0.1 | 0.3 | 0.4 |
| str-6 | increment | 168 | 78,219 | 222,588 | 12,305,161 | 12,606,136 | 84 | 5.8 | 20.7 | 26.5 |
| str-6-review | review | 62 | 19,637 | 116,702 | 2,649,138 | 2,785,539 | 31 | 0.6 | 6.8 | 7.4 |
| metrics | metrics | 2 | 230 | 38,690 | 0 | 38,922 | 1 | 0.0 | 0.0 | 0.0 |

`in` is uncached input, `cache read` is input served from the prompt cache and `cache write` is input written into it — they are three different prices for the same axis, so they are never summed into one "input" column here.

### Where the tokens went — activity

| activity | total tokens | share | in | cache write | cache read | out | reqs | gen min | tool min |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reporting | 2,428,387 | 4.3% | 38 | 39,734 | 2,306,104 | 82,511 | 19 | 13.5 | 0.6 |
| specification | 5,016,175 | 8.9% | 678 | 89,896 | 4,883,822 | 41,779 | 52 | 3.9 | 9.5 |
| traceability | 4,065,799 | 7.2% | 66 | 54,799 | 4,003,108 | 7,826 | 33 | 0.4 | 10.3 |
| implementation | 4,966,419 | 8.8% | 76 | 58,163 | 4,874,328 | 33,852 | 38 | 2.9 | 3.6 |
| test-authoring | 5,349,080 | 9.5% | 80 | 119,140 | 5,156,381 | 73,479 | 40 | 6.2 | 4.8 |
| workspace | 83,200 | 0.1% | 2 | 3,801 | 76,209 | 3,188 | 1 | 0.2 | 0.8 |
| verification | 10,885,676 | 19.3% | 178 | 117,217 | 10,738,766 | 29,515 | 89 | 1.1 | 38.0 |
| version-control | 5,995,517 | 10.7% | 134 | 344,605 | 5,605,745 | 45,033 | 67 | 1.9 | 14.7 |
| orientation | 17,482,757 | 31.1% | 4,247 | 872,806 | 16,449,552 | 156,152 | 208 | 4.7 | 41.0 |

| activity | what it covers |
| --- | --- |
| reporting | emitting the structured result, or writing a report document |
| specification | authoring or maintaining specs/stories/ADRs under docs/spec, and clew mint/promote |
| traceability | anchor markers, clew spec/coverage/check — the spec<->code link itself |
| implementation | production code under src/main |
| test-authoring | test code under src/test |
| workspace | build and tool configuration (pom.xml, .clewrc.json, .claude/, package.json) |
| verification | running the build and the test suite (mvn / mvnw) |
| version-control | git staging, committing, inspecting history |
| orientation | reading and searching — files, specs, code, skills |

### Roll-up

| roll-up | total tokens | share | in | cache write | cache read | out | gen min | tool min | members |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reasoning | 22,498,932 | 40.0% | 4,925 | 962,702 | 21,333,374 | 197,931 | 8.7 | 50.5 | orientation, deliberation, specification |
| implementation | 10,398,699 | 18.5% | 158 | 181,104 | 10,106,918 | 110,519 | 9.3 | 9.3 | implementation, test-authoring, workspace |
| verification | 10,885,676 | 19.3% | 178 | 117,217 | 10,738,766 | 29,515 | 1.1 | 38.0 | verification |
| traceability | 4,065,799 | 7.2% | 66 | 54,799 | 4,003,108 | 7,826 | 0.4 | 10.3 | traceability |
| overhead | 8,423,904 | 15.0% | 172 | 384,339 | 7,911,849 | 127,544 | 15.4 | 15.3 | version-control, reporting |

Output tokens are the axis worth ranking on: they are a fraction of the volume and a large share of the spend, and unlike cache read they do not move with cache-hit timing. Cache read reads as *how much context this work had to re-read*.

### Lines written per increment, by what they are

| increment | commits | spec + | adr + | production + | test + | build/gov + | generated + | total + | total − |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STR-1 | 3 | 38 | 111 | 48 | 59 | 2,127 | 28 | 2,678 | 1 |
| STR-2 | 3 | 411 | 0 | 243 | 441 | 0 | 812 | 2,038 | 63 |
| STR-3 | 3 | 214 | 0 | 212 | 400 | 0 | 140 | 1,008 | 47 |
| STR-4 | 2 | 105 | 0 | 105 | 163 | 0 | 4 | 397 | 12 |
| STR-5 | 3 | 122 | 0 | 124 | 269 | 0 | 4 | 539 | 33 |
| STR-6 | 4 | 252 | 51 | 145 | 314 | 0 | 8 | 864 | 83 |

`generated` is the clew traceables — emitted by the tool, not written by an agent, and excluded from any hand-written total.

### Sources

- [`docs/metrics/run-metrics-cas-dd.md`](metrics/run-metrics-cas-dd.md) — token and time accounting per agent task, activity and method stage, collected from the raw run transcripts.
- [`docs/metrics/repo-metrics-cas-dd.md`](metrics/repo-metrics-cas-dd.md) — lines, files, anchors and commits per increment, collected from git.
