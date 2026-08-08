export const meta = {
  name: 'reservations-cas-dd-full-run',
  description: 'Run the complete CAS-DD reservations demo autonomously with the clew draft/promote/implement cycle, a commit after draft and after implement, a code-review agent after each implementation, collecting timing, open questions, documentation strengths/weaknesses, issues, and measured token/time cost per task',
  phases: [
    { title: 'Preflight' },
    { title: 'STR-1 set up workspace' },
    { title: 'STR-2 reserve single item' },
    { title: 'STR-3 tentative holds' },
    { title: 'STR-4 cancellation/release' },
    { title: 'STR-5 per-user quota' },
    { title: 'STR-6 multi-item redesign (blind)' },
    { title: 'Metrics' },
    { title: 'Report' },
  ],
}

// The label every artefact of this run is filed under, and where its metrics land. Repeats of the
// same arm pass their own label and results directory (see metrics/new-run.mjs), so run N never
// overwrites run N-1 and the aggregate can read them all back as samples of one arm.
const RUN_LABEL = (typeof args === 'object' && args && args.runLabel) || 'cas-dd'
const RESULTS_DIR = (typeof args === 'object' && args && args.resultsDir) || 'docs/metrics'
const BASE_REV = (typeof args === 'object' && args && args.baseRev) || ''

// In an experiment the results directory belongs to the main repo while the run happens in a
// worktree, so the metrics files are not part of this working tree and cannot be committed from
// it. Only the in-repo default is committed; an external one is left where the aggregate reads it.
const METRICS_IN_REPO = RESULTS_DIR === 'docs/metrics'
const commitTarget = METRICS_IN_REPO ? `docs/autonomous-run-report.md and ${RESULTS_DIR}/` : 'docs/autonomous-run-report.md'
const commitSubject = METRICS_IN_REPO ? 'docs: autonomous run report and measured cost' : 'docs: autonomous run report'

// Every agent prompt opens with this tag. The metrics collector reads it out of the raw
// transcript to attribute tokens and time to a named task — without it, the numbers come back
// keyed by an opaque agent hash and nothing can be compared task-for-task between two runs.
const taskTag = id => `RUN-TASK-ID: ${id}\n\n`

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    increment: { type: 'string' },
    startedAt: { type: 'string', description: 'UTC HH:MM:SSZ from `date -u`' },
    finishedAt: { type: 'string', description: 'UTC HH:MM:SSZ from `date -u`' },
    green: { type: 'boolean', description: 'mvn verify green AND clew check OK AND all targeted specs Covered' },
    specsCoveredTotal: { type: 'integer', description: 'total specs Covered per `clew coverage` after this increment' },
    testsPassing: { type: 'integer' },
    commits: {
      type: 'array',
      description: 'the commits made this increment, "<shorthash> <subject>", one after draft and one after implement (STR-001: setup, then workspace)',
      items: { type: 'string' },
    },
    openQuestions: {
      type: 'array',
      description: 'forks with no single obvious answer that you resolved yourself instead of asking',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          question: { type: 'string' },
          chosenAnswer: { type: 'string' },
          rationale: { type: 'string' },
        },
        required: ['question', 'chosenAnswer', 'rationale'],
      },
    },
    // clew 0.3.0 runs the conformance walk inside clew-implement, so its yield is reported by the
    // implementer. The reviewer no longer runs that walk; without this field it is not measured.
    anchorFindings: {
      type: 'array',
      description: "every finding the clew-review drift check raised as clew-implement's final step — one entry each, empty array if it raised none",
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          spec: { type: 'string', description: 'the spec id the finding concerns, e.g. CON-003' },
          category: { type: 'string', description: 'stale-verify | drifted-realize | misanchor' },
          summary: { type: 'string' },
          confirmed: { type: 'boolean', description: 'true only if you traced anchor -> spec -> code/test and the drift is real' },
          fixed: { type: 'boolean', description: 'true if you corrected it before COMMIT (2)' },
          detail: { type: 'string', description: 'concrete evidence: which anchor, which spec sentence, what you changed' },
        },
        required: ['spec', 'category', 'summary', 'confirmed', 'fixed'],
      },
    },
    docsWellDocumented: { type: 'array', items: { type: 'string' }, description: 'where the clew skills / seed / generated docs guided you clearly' },
    docsWeaknesses: { type: 'array', items: { type: 'string' }, description: 'gaps, ambiguity, or missing guidance in the clew skills / seed / docs' },
    issues: { type: 'array', items: { type: 'string' }, description: 'concrete problems hit during the work and how you resolved them (build breaks, anchor/coverage snags, tooling quirks)' },
    notes: { type: 'string' },
  },
  required: ['increment', 'green', 'startedAt', 'finishedAt', 'commits', 'openQuestions', 'anchorFindings', 'docsWellDocumented', 'docsWeaknesses', 'issues'],
}

const PREAMBLE = `You are implementing ONE increment of a Code-Anchored Spec-Driven Development (clew) demo — a Java reservation engine.
Working dir is the repo root already. Environment: JDK 25, Maven online (\`mvn -B verify\` — batch mode; dependencies download on first run). Invoke clew as \`pnpm run clew <cmd>\` (never the bare 'clew'). Windows + Git Bash. Start by \`date -u +%H:%M:%SZ\`; end the same way.

YOUR REPO VIEW MAY BE A STALE SNAPSHOT — THE DISK IS AUTHORITATIVE. What was injected into your context at spawn can be frozen at session start, so files an EARLIER increment created or filled may still appear to you as ABSENT or as empty stubs. This affects at least: the governance under .claude/.ai-project-context/ (000-006, incl. 004 technology + 005 testing contracts — shown empty though setup already filled them); the ADRs under docs/spec/adr/ (reproduced by setup — an ADR referenced by id such as 'ADR-0003' lives THERE, it is NOT missing); the promoted spec corpus under docs/spec/specs/; and src/. Before relying on any file's presence or content, LIST/READ it fresh from disk and treat the disk as authoritative — never conclude a file is absent or empty from your injected context alone.

USE THE CLEW SKILLS — this is required. Run the clew cycle via the project's skills, invoking each with the Skill tool: clew-draft, then clew-promote, then clew-implement. Their full procedures are also on disk at .claude/skills/<name>/SKILL.md — read and follow them if the Skill tool is not available to you. Follow them faithfully.

THE SEED is the fixed source of truth at setup/reservations-cas-dd-demo/ (stories/ and specs/). For increments whose specs are pre-authored there, you REPRODUCE the seed's specs faithfully — do not invent them. HARD RULE: never open setup/reservations-cas-dd-demo/expectations/ (off-limits answer key).

COMMIT CADENCE — exactly two commits per increment:
  (1) AFTER DRAFT: once the story + spec drafts are written in docs/spec/drafts/, \`git add docs/spec/drafts\` and commit, subject "docs: draft <name> (STR-N)".
  (2) AFTER IMPLEMENT: once green, stage docs/spec, src, and .clew/state.json (NEVER .claude/settings.local.json, .clew/locations.json, .clew/coverage.json) and commit, subject "feat: implement <name> (STR-N)".
Every commit message MUST end with exactly this trailer line:
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

STORY IDS: each story binds to the corpus id matching its own number — the setup story STR-1 binds STR-001, STR-2 binds STR-002, … STR-6 binds STR-006. Use the story's 'STR-N' label from its filename in commit subjects; the bound id is the same number, zero-padded.

CLEW CYCLE DETAIL:
- DRAFT (clew-draft): temp-mint ids \`pnpm run clew mint --tmp <LENS>\` (lenses STK SYS SW ARCH NF CON ENT; story prefix STR). Write story -> docs/spec/drafts/stories/, specs -> docs/spec/drafts/specs/; each field a **Bold label** line (copy docs/spec/schemas/*.example.md). Reproduce seed spec bodies in BASE form (forward-reference-free as of this increment). Relation links: already-promoted spec -> its REAL id + CURRENT corpus title; new spec in this set -> its TEMP id (clew substitutes on promote). Keep every to-be-minted id OUT of the story prose (name new specs by name there); ids live only in ## Relations. Then COMMIT (1).
- PROMOTE (clew-promote): \`pnpm run clew promote <story-temp-id>\` — binds ids, moves drafts into docs/spec/{stories,specs}/.
- IMPLEMENT (clew-implement): set each newly promoted spec Status planned->active + append a \`## Changes\` entry (dated TODAY — obtain the date with \`date +%Y-%m-%d\`, never hard-code it — stating the reason). Also flip THIS increment's own story from \`**Status**: planned\` to \`active\` at the start of implement (the story lifecycle is planned->active->done; a story has NO \`## Changes\` section — just change the field). The review step closes it to \`done\` at the end, so exactly one story is \`active\` at any time. If the story says to EXTEND an existing promoted spec, edit its content in place + append a \`## Changes\` entry AND widen its existing verify test to actually exercise the new behaviour. \`pnpm run clew spec\` to regenerate. Write production + tests per docs/spec/architecture.md. Anchor: read src/main/java/clew/traceables/clew/README.md for the marker form — @Realizes<Set>/@Verifies<Set> (SOURCE retention) referencing <Set>Traceables.<MEMBER>; realizes on production, verifies on the test that exercises the spec. Reach green \`mvn -B verify\`, then \`pnpm run clew coverage\` (this scans the anchors and reports in one step — there is NO separate \`clew scan\` in the flow anymore — confirm every targeted spec is Covered) + \`pnpm run clew check\` (OK). clew-implement's REQUIRED FINAL STEP is the \`clew-review\` drift check over the specs this increment added or changed — do not skip it, and disposition every finding it raises within this increment. Then COMMIT (2).

USE THESE SKILLS — this is required. Invoke each with the Skill tool: \`superpowers:test-driven-development\` before writing any implementation code; \`superpowers:systematic-debugging\` on any bug, test failure or unexpected behaviour, before proposing a fix; \`superpowers:verification-before-completion\` before you call the increment done.

Conventions: JUnit 5 + Mockito (@ExtendWith(MockitoExtension.class); @Mock fields end 'Mock'; NO @DisplayName; NO Mockito.lenient(); lifecycle method named after annotation) + AssertJ. JSpecify @NullMarked packages — a hand-written equals(Object) needs @Nullable on the param.

AUTONOMY: never ask a question — at every fork pick your preferred option, proceed, and log it in openQuestions. REPORT anchorFindings — every finding clew-implement's final \`clew-review\` step raised, one entry each with confirmed and fixed; an empty array if it raised none. Never summarise or omit one. REPORT HONESTLY on the developer experience: docsWellDocumented (where clew's skills/generated docs/the seed guided you clearly), docsWeaknesses (ambiguity/gaps/missing guidance), issues (concrete problems and how you resolved them). If you cannot reach green, still return the report with green:false and notes on where it broke — do not commit broken code.`

const steps = [
  {
    phase: 'STR-1 set up workspace',
    taskId: 'str-1',
    prompt: `${PREAMBLE}

INCREMENT: STR-1 — SCAFFOLD CLEW, set up the project, AND stand up the workspace (the FIRST increment; its story binds corpus id STR-001). FROM THE BARE BASELINE: commit 1 tracks ONLY setup/ (the design surface), LICENSE, .gitattributes, .gitignore. There is NO .clewrc.json, NO .claude/skills, NO governance (.claude/.ai-project-context), NO CLAUDE.md, NO docs/spec/schemas, no src, no corpus, no .clew/state.json — you GENERATE all of it now.
FIRST — INSTALL + SCAFFOLD CLEW: run \`pnpm install\` (installs clew per package.json into node_modules so \`pnpm run clew\` resolves), then run \`pnpm run clew setup --type claude --generator java\`. This writes .clewrc.json and the spec-tree layout, docs/spec/schemas, emits the clew SKILLS into .claude/skills/, and the GOVERNANCE (000-006) plus the CLAUDE.md entry that loads it. Then RE-READ the emitted governance and skills from disk (they were not in your spawn context). clew setup configures the DEFAULT lenses (STK SYS SW ARCH NF CON) with NO ENT — add the ENT lens now, in BOTH places: an entry in .clewrc.json's lenses array ({ "id": "ENT", "description": "Entity spec — a domain shape, its purpose and typed attributes." }) AND ENT in docs/spec/schemas/spec.schema.yaml's Lens enum, so ENT specs mint and validate.
THEN use the clew-setup skill (Skill tool, or read .claude/skills/clew-setup/SKILL.md) for the workspace-setup STORY only. The technology contract, the testing contract and the architecture overview are NOT authored in this run — they are supplied as files and copied verbatim (below). For the workspace-setup STORY, REPRODUCE the seed's setup story setup/reservations-cas-dd-demo/stories/STR-1-set-up-the-workspace.md as the draft into docs/spec/drafts/stories/ (temp id: \`pnpm run clew mint --tmp STR\`) — do NOT invent a fresh one; it authors no specs, so its \`## Relations\` is empty. Draft it with \`**Status**: planned\` (implement flips it to active per the standard cycle).
- INSTALL THE GOVERNANCE — copy all seven files from setup/reservations-cas-dd-demo/governance/ over .claude/.ai-project-context/, replacing what \`clew setup\` seeded. Copy them BYTE FOR BYTE: do not edit, reword, extend, shorten or reorder anything in them. They are inputs to this run, not work products.
- Copy setup/reservations-cas-dd-demo/architecture.md BYTE FOR BYTE to docs/spec/architecture.md. Do not rewrite, summarise or extend it, and add nothing forward-looking.
- Establish the built-project ADR home at docs/spec/adr/: reproduce the seed's ADRs (setup/reservations-cas-dd-demo/adr/ADR-0001..0005) verbatim into docs/spec/adr/, so the specs' ADR references resolve and later increments have one clear place for new ADRs.
COMMIT (1) — SCAFFOLD + DRAFT: stage the clew-setup output together with the draft — .clewrc.json, .claude/skills (as \`clew setup\` emitted them), .claude/.ai-project-context (000-006, copied verbatim from the seed), CLAUDE.md, docs/spec/schemas, docs/spec/architecture.md, docs/spec/adr, and docs/spec/drafts (the workspace story) — subject "chore: scaffold clew and draft set-up-the-workspace (STR-1)". PROMOTE: \`pnpm run clew promote <story-temp-id>\` (binds STR-001).
IMPLEMENT the workspace (the story's content): pom.xml on JDK 25 (maven.compiler.release=25) with JUnit BOM 5.14.4, Mockito 5.23.0 (+ mockito-junit-jupiter), AssertJ 3.27.7, archunit-junit5 1.4.2 (test), JSpecify 1.0.0 (compile), maven-compiler-plugin 3.14.1, maven-surefire-plugin 3.5.6, and jacoco-maven-plugin (prepare-agent + report + a check rule bound to verify: element BUNDLE, LINE COVEREDRATIO >= 0.80, excluding clew/traceables/**, **/package-info.class and **/MutatesState.class — at STR-1 there is no domain code, so the rule is trivially satisfied per 005); the EIGHT io.example.reservations packages (api, services/reservation, services/hold, services/availability, services/quota, store, clock, entities) each with a @NullMarked package-info.java; store/MutatesState.java (@Target METHOD, @Retention CLASS); src/test/resources/archunit.properties containing archRule.failOnEmptyShould=false; src/test/java/io/example/reservations/architecture/ArchitectureBoundariesTest.java with FOUR ArchUnit rules ALL UNANCHORED (the ARCH specs arrive in the first domain increment, STR-2): entities depend on nothing above them; api may not access store; @MutatesState methods declared only in store; every io.example.reservations package has a @NullMarked package-info. Then \`pnpm run clew spec\`; \`mvn -B verify\` green (4 tests); \`mvn -N wrapper:wrapper\`; \`pnpm run clew check\` OK. COMMIT (2) — IMPLEMENT: stage pom.xml mvnw mvnw.cmd .mvn src docs .clew/state.json (the clew scaffolding + governance were already committed in COMMIT 1), subject "feat: stand up the reservations workspace (STR-1)". specsCoveredTotal is 0 (no specs yet). Report.`,
  },
  {
    phase: 'STR-2 reserve single item',
    taskId: 'str-2',
    prompt: `${PREAMBLE}

INCREMENT: STR-2 — reserve a single item for a time window. Seed story: setup/reservations-cas-dd-demo/stories/STR-2-reserve-single-item.md; it realizes thirteen seed specs STK-001, SYS-001, SYS-002, SW-001, CON-001, CON-002, ARCH-001, ARCH-002, ARCH-003, ENT-001..004 (reproduce their bodies from setup/.../specs/; the seed STR-2 story's ## Relations lists all thirteen in the order that binds the seed ids). First spec-bearing increment (corpus currently only has the STR-001 workspace story). The story prose names NO ids; the ## Relations order fixes the id binding to reproduce the seed's numbers. NOTE: the ENT lens is already configured in .clewrc.json and docs/spec/schemas/spec.schema.yaml, so \`pnpm run clew mint --tmp ENT\` works out of the box — no ENT config action is needed.
Implement per architecture: entity records Item/TimeWindow(half-open overlap; reject end<=start)/User/Reservation; a store (single point of state change, @MutatesState); an availability service (free/occupied computed from reservations); a confirm service (compute availability then hand ONE atomic change to the store); an api ReservationEngine facade (confirm, isAvailable). ARCH-001/ARCH-002/ARCH-003 are authored here — anchor STR-001's four already-written ArchUnit rules with @VerifiesArch (state-mutation rule -> ARCH-001; the two layering rules -> ARCH-002; every-package-@NullMarked rule -> ARCH-003); realize ARCH-001 on the store, ARCH-002 on the api package-info, ARCH-003 on the entities package-info (representative of the @NullMarked packages). STK-001 realized by the engine, verified by an end-to-end acceptance test. All thirteen specs must read Covered — the null-marked ArchUnit rule is NOT left unanchored. Report.`,
  },
  {
    phase: 'STR-3 tentative holds',
    taskId: 'str-3',
    prompt: `${PREAMBLE}

INCREMENT: STR-3 — tentative holds with expiry. Seed story: setup/reservations-cas-dd-demo/stories/STR-3-tentative-holds-with-expiry.md. New seed specs: ENT-005 (Hold), SW-002 (hold-service), SYS-003 (place-hold), NF-001 (deterministic-expiry). EXTENDS SYS-002 (availability now also from active holds) and CON-001 (an active hold is a blocking claim) — edit each in place with a \`## Changes\` entry and WIDEN their verify tests to actually exercise holds. Introduce an injected Clock (clock port + a mutable test clock); a Hold is active until its expiry instant vs the clock; confirming an active hold converts it to a reservation (consume the hold atomically); confirming an expired hold is rejected; availability excludes only ACTIVE holds. All targeted specs (4 new + the 2 extended stay Covered) must read Covered. Report.`,
  },
  {
    phase: 'STR-4 cancellation/release',
    taskId: 'str-4',
    prompt: `${PREAMBLE}

INCREMENT: STR-4 — owner-initiated cancellation and release. Seed story: setup/reservations-cas-dd-demo/stories/STR-4-owner-cancellation-and-release.md. New seed specs: SYS-004 (cancel-release), SW-003 (cancel-release-service). Purely additive — no spec extensions (availability restores itself once a claim is removed). Per the architecture code-org, add cancel to the reservation service and release to the hold service (NOT a new package); the store gains removal operations (@MutatesState); each verifies the requester OWNS the claim then hands one atomic removal to the store else rejects and changes nothing; engine exposes cancel/release. Both new specs Covered. Report.`,
  },
  {
    phase: 'STR-5 per-user quota',
    taskId: 'str-5',
    prompt: `${PREAMBLE}

INCREMENT: STR-5 — per-user fair-use quota. Seed story: setup/reservations-cas-dd-demo/stories/STR-5-per-user-quota.md. New seed specs: CON-003 (quota-bound), SW-004 (quota-service). EXTENDS ENT-003 — the User now carries a quota — edit ENT-003 in place with a \`## Changes\` entry. Model User carrying a quota WHILE preserving identity-only equality (ENT-003: two Users equal exactly when ids equal — so the record must override equals/hashCode to use id alone; give an unbounded convenience form so existing call sites keep working). Add a services.quota service counting a user's active item claims (held items from active holds + reserved items) IN ITEM TERMS, not object counts, computed from the store (no stored counter). Gate BOTH placeHold and confirm on quota before creating a claim; expiry/release/cancel lower the count. CON-003 across both gate points, SW-004 on the quota service. Boundary tests at exactly-quota and one-over. Threading the new dependency rewires the affected tests; behaviour unchanged for unbounded users. All targeted specs Covered. Report.`,
  },
  {
    phase: 'STR-6 multi-item redesign (blind)',
    taskId: 'str-6',
    cherryPick: 'str6-requirement',
    prompt: `${PREAMBLE}

INCREMENT: STR-6 — atomic multi-item bookings. THE REDESIGN, and it runs DIFFERENTLY from every prior increment: its specs are NOT pre-authored, and you are given ONLY the plain requirement. Read ONLY setup/reservations-cas-dd-demo/stories/STR-6-atomic-multi-item-bookings.md. You MUST NOT open setup/reservations-cas-dd-demo/expectations/ under any circumstances — it is the answer key. Work out the WHOLE change yourself from the requirement — nothing here tells you which specs change, or how, or what new specs/ADRs it needs. Use clew-context: walk the anchors of the code the requirement affects, follow each anchor to the spec it points at, reason from that intent, and only then edit. Author or revise whatever specs the change actually requires, each with its own \`## Changes\` entry, and add an ADR for any genuinely new design decision.
Reach green mvn verify + full clew coverage + clew check. In notes, describe exactly what you changed and how the redesign went — what you found, what was hard, and anything you suspect you might have missed. ALSO REQUIRED — a candid, first-person TESTIMONIAL on the usability of intent anchoring, placed in your report's notes field under a line reading 'INTENT-ANCHORING TESTIMONIAL:'. You arrived at this codebase COLD, with no prior context, and had to perform its hardest change purely by working from the intent anchored into the code (the @Realizes/@Verifies markers that bind code and tests to their specs). Speak plainly, concretely, and honestly — as YOUR own lived experience, not marketing: did following an anchor to its spec help you understand what the existing code MEANT and decide what had to change? Where did working from the anchored intent help you, and where did it get in the way, mislead you, or fall short? Be concrete about the specific moments that stood out. Report.`,
  },
]

const CHERRY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', description: 'cherry-pick succeeded and both checks below passed' },
    commit: { type: 'string', description: 'short hash of the new commit' },
    storyPresent: { type: 'boolean', description: 'the STR-6 story file exists on disk after the cherry-pick' },
    expectationsAbsent: { type: 'boolean', description: 'setup/.../expectations/ is NOT on disk (must be true)' },
    note: { type: 'string' },
  },
  required: ['ok', 'storyPresent', 'expectationsAbsent'],
}

// The three categories only the clew-review walk can produce. Since 0.3.0 that walk runs inside
// clew-implement, so these are counted off the implementer's report, not the reviewer's.
const ANCHOR_CATEGORIES = ['stale-verify', 'drifted-realize', 'misanchor']

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    increment: { type: 'string' },
    green: { type: 'boolean', description: 'mvn -B verify still green AND clew check OK after any fixes you made' },
    incrementSound: { type: 'boolean', description: 'true if, after any fixes, this increment is sound — no confirmed defect left unfixed' },
    findings: {
      type: 'array',
      description: 'one entry per anchoring issue examined (confirmed or dismissed)',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          spec: { type: 'string', description: 'the spec id the finding concerns, e.g. CON-003' },
          category: { type: 'string', description: 'defect | unmet-requirement | vacuous-test | stale-verify | drifted-realize | misanchor | other' },
          summary: { type: 'string' },
          confirmed: { type: 'boolean', description: 'true only if you traced anchor->spec->code/test and the defect is real, not a false alarm' },
          fixed: { type: 'boolean', description: 'true if you corrected it and re-verified green' },
          detail: { type: 'string', description: 'concrete evidence: which anchor, which spec sentence it violates, what you changed' },
        },
        required: ['spec', 'category', 'summary', 'confirmed', 'fixed'],
      },
    },
    fixCommit: { type: 'string', description: 'short hash + subject of the review-fix commit, or empty if no fix was needed' },
    storyClosed: { type: 'boolean', description: "true if the increment was complete and you set its story's Status to done and committed it" },
    closeCommit: { type: 'string', description: 'short hash + subject of the story-close commit, or empty if the story was left active' },
    note: { type: 'string' },
  },
  required: ['increment', 'green', 'incrementSound', 'findings', 'storyClosed'],
}

const reviewPrompt = (phaseTitle) => `You are the REVIEWER for the increment just implemented (${phaseTitle}). Working dir is the repo root. Invoke clew as \`pnpm run clew <cmd>\` (never bare 'clew'); Maven is OFFLINE (\`mvn -B verify\`). Windows + Git Bash.

HARD RULE: never open setup/reservations-cas-dd-demo/expectations/ (off-limits answer key).

Review this increment’s diff — every file its commits changed. Read each changed file and judge it on its own terms. The spec-to-code conformance walk already ran inside clew-implement (\`clew-review\`, its required final step) — do NOT run it again, and do not go looking for anchor drift; your job is the code review that walk deliberately does not do: correctness, unmet requirements, vacuous tests, and defects. If something you run into anyway turns out to be spec-to-code drift, label it \`stale-verify\`, \`drifted-realize\` or \`misanchor\` rather than \`other\` — that is a labelling rule for what you found, not an instruction to search for it.

VERIFY before reporting: set confirmed:true only after you traced the defect in the code and it is real. For each CONFIRMED defect, FIX it, then re-run \`mvn -B verify\` (green), \`pnpm run clew coverage\` (the targeted specs still Covered) and \`pnpm run clew check\` (OK), and commit as "fix: review (${phaseTitle})" ending with exactly:
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
If a finding is not a real defect, change nothing for it (report confirmed:false). If you cannot fix a confirmed defect while keeping green, leave the code and report fixed:false with green reflecting the true build state.

CLOSE THE INCREMENT: if \`mvn -B verify\` is green, every targeted spec is Covered and \`pnpm run clew check\` is OK, set this increment’s story — the only file under docs/spec/stories/ with \`**Status**: active\` — from \`active\` to \`done\`, and commit ONLY that file with subject "chore: close increment — story done (${phaseTitle})" ending with the same trailer. Otherwise leave it active and report storyClosed:false with the reason in the note.

Return findings (spec id, category, summary, confirmed, fixed, detail), green, incrementSound, storyClosed, the fix and close commits if any, and a note.`

// Preflight: this run commits to whatever ref HEAD points at. If HEAD is DETACHED — e.g. the user
// ran `git checkout initial-setup`, which is a tag — every increment's commit would belong to no
// branch and `main` would be left behind. Make sure we are on a branch first; create one if not.
phase('Preflight')
const PREFLIGHT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    onBranch: { type: 'boolean', description: 'true if HEAD was already on a branch' },
    branch: { type: 'string', description: 'the branch this run will commit to' },
    created: { type: 'boolean', description: 'true if a branch was created because HEAD was detached' },
  },
  required: ['onBranch', 'branch', 'created'],
}
const pre = await agent(
  taskTag('preflight') +
  `In the repo root, make sure git HEAD is on a branch before this run commits anything. ` +
  `Run \`git symbolic-ref -q --short HEAD\`: if it prints a branch name, HEAD is on a branch — report onBranch:true, branch:<name>, created:false. ` +
  `If it exits non-zero / prints nothing, HEAD is DETACHED (e.g. checked out from the initial-setup tag): create a branch to hold this run with \`git checkout -b run\`, then report onBranch:false, branch:"run", created:true. ` +
  `Do nothing else — no other git commands, no file changes. Return {onBranch, branch, created}.`,
  { schema: PREFLIGHT_SCHEMA, phase: 'Preflight', label: 'preflight: ensure branch' }
)
log(`preflight: onBranch=${pre && pre.onBranch} branch=${pre && pre.branch} created=${pre && pre.created}`)

const reports = []
const reviews = []
for (let i = 0; i < steps.length; i++) {
  phase(steps[i].phase)

  // Reveal the last increment's requirement just-in-time: the STR-6 story lives on a separate
  // ref (str6-requirement), NOT in the seed, so STR-1..5 run blind to the redesign. Cherry-pick it
  // in only now. The answer key (str6-answerkey) is never brought in — it must not be on disk.
  if (steps[i].cherryPick) {
    const cp = await agent(
      taskTag(`${steps[i].taskId}-cherry-pick`) +
      `Run exactly one git command in the repo root: \`git cherry-pick ${steps[i].cherryPick}\`. ` +
      `It adds this increment's plain story file and creates a commit. Then verify two things and report them: ` +
      `(1) storyPresent — setup/reservations-cas-dd-demo/stories/STR-6-atomic-multi-item-bookings.md now EXISTS; ` +
      `(2) expectationsAbsent — the directory setup/reservations-cas-dd-demo/expectations/ does NOT exist on disk. ` +
      `If expectations/ exists, STOP immediately, do not read it, and report ok:false. ` +
      `Do NOT read the story or any other file, do NOT inspect git log, tags, branches, or diffs beyond running that single command, ` +
      `and NEVER read anything under expectations/. Return the new commit's short hash and both boolean checks.`,
      { schema: CHERRY_SCHEMA, phase: steps[i].phase, label: `cherry-pick ${steps[i].cherryPick}` }
    )
    log(`cherry-pick ${steps[i].cherryPick}: ok=${cp && cp.ok} storyPresent=${cp && cp.storyPresent} expectationsAbsent=${cp && cp.expectationsAbsent}`)
  }

  const r = await agent(taskTag(steps[i].taskId) + steps[i].prompt, { schema: REPORT_SCHEMA, phase: steps[i].phase, label: steps[i].phase })
  reports.push(r)
  log(`${steps[i].phase}: green=${r && r.green} covered=${r && r.specsCoveredTotal} commits=${r && r.commits ? r.commits.length : 0}`)

  // Halt on a failed/dead increment instead of cascading. A stalled agent returns null; a
  // non-green report means the increment did not close. Either way, later increments build on
  // this one, so stop here — resume replays the green prefix from cache and retries this step.
  if (!r || r.green !== true) {
    log(`HALT after ${steps[i].phase}: did not finish green (${r ? 'green:false' : 'agent died / null'}). Stopping so the failure does not corrupt later increments; resume to retry this step.`)
    break
  }

  // Anchoring review: Covered proves the link compiles, not that the anchored code/test honours
  // the spec's intent. This reviewer follows each targeted spec's @Realizes/@Verifies and fixes
  // green-but-stale or drifted anchors, so the increment is correct — not merely green.
  const rev = await agent(taskTag(`${steps[i].taskId}-review`) + reviewPrompt(steps[i].phase), { schema: REVIEW_SCHEMA, phase: steps[i].phase, label: `review: ${steps[i].phase}` })
  reviews.push(rev)
  const confirmedUnfixed = rev && rev.findings ? rev.findings.filter(f => f && f.confirmed && !f.fixed).length : 0
  log(`review ${steps[i].phase}: sound=${rev && rev.incrementSound} findings=${rev && rev.findings ? rev.findings.length : 0} drift-noticed-without-walk=${rev && rev.findings ? rev.findings.filter(f => f && ANCHOR_CATEGORIES.includes(f.category)).length : 0} confirmed-unfixed=${confirmedUnfixed} green=${rev && rev.green} storyClosed=${rev && rev.storyClosed}`)

  // The review fixes what it confirms and records the rest. It NEVER halts the run — a review
  // finding is quality feedback, not a hard build failure — so the run always proceeds to the
  // next increment. Anything the review could not fix is captured in its report for follow-up.
  if (rev && rev.green !== true) {
    log(`NOTE: code review of ${steps[i].phase} did not restore green; continuing anyway (findings recorded for follow-up).`)
  }
}
// Measure what the run actually cost. The numbers come out of the raw agent transcripts and out
// of git — not from anything an agent reports about itself — so they are hard data, and the same
// two collectors run unchanged against a baseline run built from the same stories without clew.
// That is the whole point: one measurement definition, two methods, comparable rows.
phase('Metrics')

// What the run achieved, in the same shape for every arm — so the aggregate can set cost against
// outcome. An arm that spends less and arrives with fewer tests or a failed increment has not won.
const last = reports.length ? reports[reports.length - 1] : null
const outcome = {
  label: RUN_LABEL,
  arm: RUN_LABEL.replace(/[-_]?\d+$/, ''),
  incrementsAttempted: steps.length,
  incrementsCompleted: reports.length,
  allGreen: reports.length === steps.length && reports.every(r => r && r.green === true),
  finalTestsPassing: last ? last.testsPassing : null,
  finalSpecsCovered: last ? last.specsCoveredTotal : null,
  confirmedFindings: reviews.reduce((n, r) => n + (r && r.findings ? r.findings.filter(f => f && f.confirmed).length : 0), 0),
  // What the clew-review walk brought, counted off the implementer's report — that is where the
  // walk now runs. Filtered to the three categories the walk produces, so a miscategorised entry
  // cannot inflate the count.
  anchorFindings: reports.reduce((n, r) => n + (r && r.anchorFindings ? r.anchorFindings.filter(f => f && ANCHOR_CATEGORIES.includes(f.category)).length : 0), 0),
  confirmedAnchorFindings: reports.reduce(
    (n, r) => n + (r && r.anchorFindings ? r.anchorFindings.filter(f => f && f.confirmed && ANCHOR_CATEGORIES.includes(f.category)).length : 0),
    0
  ),
  // The control: drift the reviewer ran into WITHOUT the walk — it is told not to run it and not to
  // look for drift, only to label correctly what it happens to find. Counted apart from the walk's
  // own yield, because it answers the other half of the question: how much of this would a plain
  // code review have caught anyway?
  reviewerAnchorFindings: reviews.reduce((n, r) => n + (r && r.findings ? r.findings.filter(f => f && ANCHOR_CATEGORIES.includes(f.category)).length : 0), 0),
  confirmedReviewerAnchorFindings: reviews.reduce(
    (n, r) => n + (r && r.findings ? r.findings.filter(f => f && f.confirmed && ANCHOR_CATEGORIES.includes(f.category)).length : 0),
    0
  ),
  confirmedUnfixedFindings: reviews.reduce(
    (n, r) => n + (r && r.findings ? r.findings.filter(f => f && f.confirmed && !f.fixed).length : 0),
    0
  ),
  storiesClosed: reviews.filter(r => r && r.storyClosed).length,
  perIncrement: reports.map(r => ({
    increment: r && r.increment,
    green: r && r.green,
    testsPassing: r && r.testsPassing,
    specsCovered: r && r.specsCoveredTotal,
  })),
}

const METRICS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', description: 'both collectors ran without error and wrote their four files' },
    totalTokens: { type: 'integer', description: 'run.totals.totalTokens from run-metrics json' },
    outputTokens: { type: 'integer' },
    requests: { type: 'integer' },
    genMinutes: { type: 'number', description: 'run.totals.genMs / 60000, one decimal' },
    toolMinutes: { type: 'number', description: 'run.totals.toolMs / 60000, one decimal' },
    methodSpecificTokens: { type: 'integer', description: 'run.methodSpecific.totalTokens — spec authoring + traceability + review tasks' },
    methodSpecificShare: { type: 'number', description: 'that figure as a percentage of totalTokens, one decimal' },
    rollupTokens: {
      type: 'object',
      additionalProperties: true,
      description: 'run.rollups mapped to name -> totalTokens (reasoning, implementation, verification, traceability, overhead)',
    },
    files: { type: 'array', items: { type: 'string' }, description: 'the metrics files written' },
    note: { type: 'string', description: 'anything that did not resolve cleanly — a missing transcript dir, a collector warning' },
  },
  required: ['ok', 'totalTokens', 'outputTokens', 'requests', 'methodSpecificTokens', 'files'],
}
const metrics = await agent(
  taskTag('metrics') +
  `Collect the hard cost data for the autonomous run that just finished. Working dir is the repo root; Windows + Git Bash; node is on PATH.\n\n` +
  `Run EXACTLY these two commands, in this order, and do not edit either script:\n` +
  `  node .claude/workflows/metrics/collect-run-metrics.mjs --label ${RUN_LABEL} --arm ${RUN_LABEL.replace(/[-_]?\d+$/, '')}` +
  `${BASE_REV ? ` --base ${BASE_REV}` : ''} --out ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.json --md ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.md\n` +
  `  node .claude/workflows/metrics/collect-repo-metrics.mjs --label ${RUN_LABEL}` +
  `${BASE_REV ? ` --rev ${BASE_REV}` : ''} --out ${RESULTS_DIR}/repo-metrics-${RUN_LABEL}.json --md ${RESULTS_DIR}/repo-metrics-${RUN_LABEL}.md\n\n` +
  `The first reads this run's raw agent transcripts (it resolves the newest workflow transcript directory for this repo by itself) ` +
  `and writes run-metrics-${RUN_LABEL}.{json,md}: tokens in/out/cache-write/cache-read, model time vs tool time, ` +
  `and request counts, each attributed to an activity bucket and to a method stage, per task. ` +
  `The second reads git and writes repo-metrics-${RUN_LABEL}.{json,md}: lines of spec vs production vs test per increment, ` +
  `and the state of the tree at the end of each one. Both land in ${RESULTS_DIR}/.\n\n` +
  `THEN write the run's outcome alongside them, so a later aggregate can weigh cost against what the run actually achieved. ` +
  `Create ${RESULTS_DIR}/outcome-${RUN_LABEL}.json containing EXACTLY this JSON, unmodified:\n` +
  `\`\`\`json\n${JSON.stringify(outcome, null, 1)}\n\`\`\`\n\n` +
  `If a command fails, report the error verbatim in note and set ok:false — do NOT work around it by computing numbers yourself, ` +
  `and do NOT hand-edit the generated files. Every figure you return must be read back out of ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.json; ` +
  `estimating or recalling a number instead of reading it defeats the purpose of measuring.\n\n` +
  `Do not commit anything — the report step commits the metrics files together with the report.\n\n` +
  `Return the headline figures read from that json: totals.totalTokens, totals.outputTokens, totals.requests, totals.genMs and totals.toolMs ` +
  `converted to minutes, methodSpecific.totalTokens and its share of totals.totalTokens, and rollups mapped to name -> totalTokens.`,
  { schema: METRICS_SCHEMA, phase: 'Metrics', label: 'collect run + repo metrics' }
)
log(
  `metrics: ok=${metrics && metrics.ok} tokens=${metrics && metrics.totalTokens} out=${metrics && metrics.outputTokens} ` +
  `requests=${metrics && metrics.requests} method-specific=${metrics && metrics.methodSpecificTokens} (${metrics && metrics.methodSpecificShare}%)`
)

// Write the run report to the repo so it is a durable artifact the user finds, not buried in
// the workflow's return value. The script holds the data; a thin agent renders it and commits.
phase('Report')
await agent(
  taskTag('report') +
  `Render the autonomous-run data below into a readable markdown report and WRITE it to ` +
  `docs/autonomous-run-report.md in the repo root, then commit it.\n\n` +
  `FORMAT — be faithful, drop nothing:\n` +
  `- An intro line: number of agents, number of increments, how many green.\n` +
  `- One \`## <increment>\` section per report, IN ORDER, each with: green / tests passing / specs covered / the time window; ` +
  `the commits; "open questions the agent resolved itself" as Q / chose / why; "documentation — worked well"; ` +
  `"documentation — gaps"; "issues hit"; then the notes VERBATIM — quote any INTENT-ANCHORING TESTIMONIAL block ` +
  `word-for-word. This is a record, not a summary; do not paraphrase or drop content.\n` +
  `- A \`## Anchoring reviews\` section: per review, sound / green / storyClosed / findings, and the review note.\n` +
  `- A \`## Measured cost\` section built ONLY from ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.md and ` +
  `${RESULTS_DIR}/repo-metrics-${RUN_LABEL}.md, which already exist on disk — READ them and copy their ` +
  `"Tokens and time per task", "Where the tokens went — activity", "Roll-up" and "Lines written per increment" ` +
  `tables in verbatim, then link both files. Do NOT recompute, round, or re-derive any figure: these came from the raw ` +
  `transcripts and from git, and a hand-adjusted number would be indistinguishable from a measured one.\n\n` +
  `LAST, after the report file is written, re-run both collectors with the SAME arguments the metrics step used, so the ` +
  `committed metrics also cover that step:\n` +
  `  node .claude/workflows/metrics/collect-run-metrics.mjs --label ${RUN_LABEL} --arm ${RUN_LABEL.replace(/[-_]?\d+$/, '')}` +
  `${BASE_REV ? ` --base ${BASE_REV}` : ''} --quiet --out ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.json --md ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.md\n` +
  `  node .claude/workflows/metrics/collect-repo-metrics.mjs --label ${RUN_LABEL}` +
  `${BASE_REV ? ` --rev ${BASE_REV}` : ''} --out ${RESULTS_DIR}/repo-metrics-${RUN_LABEL}.json --md ${RESULTS_DIR}/repo-metrics-${RUN_LABEL}.md\n` +
  `(Your own tokens are still being spent as you do this, so the committed figures exclude this final step — say so in one ` +
  `sentence under the Measured cost heading rather than leaving the reader to assume the total is complete.)\n\n` +
  `Then stage and commit EXACTLY ${commitTarget} (nothing else) with subject ` +
  `"${commitSubject}". Report the commit hash.` +
  `${METRICS_IN_REPO ? '' : ` The metrics files live outside this working tree at ${RESULTS_DIR} and are NOT committed — do not try to stage them.`}\n\n` +
  `DATA:\n\`\`\`json\n${JSON.stringify({ reports, reviews }, null, 1)}\n\`\`\``,
  { phase: 'Report', label: 'write run report' }
)
return { reports, reviews, metrics }
