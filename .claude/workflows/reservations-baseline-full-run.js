export const meta = {
  name: 'reservations-baseline-full-run',
  description: 'Run the reservations demo autonomously from the stories alone — six increments built straight from their acceptance criteria, a commit per increment, a correctness review after each implementation, collecting timing, open questions, documentation strengths/weaknesses, issues, and measured token/time cost per task',
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

// The structure here is pinned on purpose: the increments, the task ids, the commit cadence, the
// review after each increment and the measurement steps are all fixed so that one run can be set
// against another. Changing any of them changes what the numbers mean, so change them knowingly.
const RUN_LABEL = (typeof args === 'object' && args && args.runLabel) || 'baseline'
const RESULTS_DIR = (typeof args === 'object' && args && args.resultsDir) || 'docs/metrics'
const BASE_REV = (typeof args === 'object' && args && args.baseRev) || ''

const METRICS_IN_REPO = RESULTS_DIR === 'docs/metrics'
const commitTarget = METRICS_IN_REPO ? `docs/autonomous-run-report.md and ${RESULTS_DIR}/` : 'docs/autonomous-run-report.md'
const commitSubject = METRICS_IN_REPO ? 'docs: autonomous run report and measured cost' : 'docs: autonomous run report'

const taskTag = id => `RUN-TASK-ID: ${id}\n\n`

const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    increment: { type: 'string' },
    startedAt: { type: 'string', description: 'UTC HH:MM:SSZ from `date -u`' },
    finishedAt: { type: 'string', description: 'UTC HH:MM:SSZ from `date -u`' },
    green: { type: 'boolean', description: 'mvn -B verify green AND every acceptance criterion of the story met' },
    testsPassing: { type: 'integer' },
    commits: {
      type: 'array',
      description: 'the commits made this increment, "<shorthash> <subject>"',
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
    docsWellDocumented: { type: 'array', items: { type: 'string' }, description: 'where the governance / design surface / stories guided you clearly' },
    docsWeaknesses: { type: 'array', items: { type: 'string' }, description: 'gaps, ambiguity, or missing guidance in the governance / design surface / stories' },
    issues: { type: 'array', items: { type: 'string' }, description: 'concrete problems hit during the work and how you resolved them (build breaks, tooling quirks)' },
    notes: { type: 'string' },
  },
  required: ['increment', 'green', 'startedAt', 'finishedAt', 'commits', 'openQuestions', 'docsWellDocumented', 'docsWeaknesses', 'issues'],
}

const PREAMBLE = `You are implementing ONE increment of a Java reservation engine, built story by story.
Working dir is the repo root already. Environment: JDK 25, Maven online (\`mvn -B verify\` — batch mode; dependencies download on first run). Windows + Git Bash. Start by \`date -u +%H:%M:%SZ\`; end the same way.

YOUR REPO VIEW MAY BE A STALE SNAPSHOT — THE DISK IS AUTHORITATIVE. What was injected into your context at spawn can be frozen at session start, so files an EARLIER increment created or filled may still appear to you as ABSENT or as empty stubs. This affects at least: the governance under .claude/.ai-project-context/ (000-005), the design surface under baseline/, and src/. Before relying on any file's presence or content, LIST/READ it fresh from disk and treat the disk as authoritative — never conclude a file is absent or empty from your injected context alone.

THE DESIGN SURFACE is at baseline/ and is the fixed source of truth for how this system is shaped:
- baseline/architecture.md — the module shape, the layering and nullness rules, atomicity, rejections.
- baseline/domain-model.md — the entities and their shape.
- baseline/adr/ — the standing design decisions (ADR-0002 store is the single point of state change, ADR-0003 availability is computed not stored, ADR-0004 a single injected clock, ADR-0005 boundaries enforced by ArchUnit). Read the one a story cites.
- baseline/stories/ — the work items. Implement ONLY the story named for this increment.
The governance under .claude/.ai-project-context/ (000-005) is binding, 005 being the testing contract.

THIS PROJECT KEEPS NO SPECIFICATION CORPUS. There are no spec documents, no traceability markers, no generated symbols and no coverage tool beyond JaCoCo — and none are to be introduced. Build from the story and the design surface directly. Do not invent a spec tree, an id scheme, or annotations that link code to requirements.

COMMIT CADENCE — one commit per increment, once the increment is green: stage src, pom.xml and anything else the increment legitimately changed (NEVER .claude/settings.local.json), and commit with subject "feat: implement <name> (STR-N)". For STR-1 the subject is "feat: stand up the reservations workspace (STR-1)".
Every commit message MUST end with exactly this trailer line:
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

USE THESE SKILLS — this is required. Invoke each with the Skill tool: \`superpowers:test-driven-development\` before writing any implementation code; \`superpowers:systematic-debugging\` on any bug, test failure or unexpected behaviour, before proposing a fix; \`superpowers:verification-before-completion\` before you call the increment done.

Conventions: JUnit 5 + Mockito (@ExtendWith(MockitoExtension.class); @Mock fields end 'Mock'; NO @DisplayName; NO Mockito.lenient(); lifecycle method named after annotation) + AssertJ. JSpecify @NullMarked packages — a hand-written equals(Object) needs @Nullable on the param.

AUTONOMY: never ask a question — at every fork pick your preferred option, proceed, and log it in openQuestions. REPORT HONESTLY on the developer experience: docsWellDocumented (where the governance, design surface or story guided you clearly), docsWeaknesses (ambiguity/gaps/missing guidance), issues (concrete problems and how you resolved them). If you cannot reach green, still return the report with green:false and notes on where it broke — do not commit broken code.`

const steps = [
  {
    phase: 'STR-1 set up workspace',
    taskId: 'str-1',
    prompt: `${PREAMBLE}

INCREMENT: STR-1 — stand up the workspace. Story: baseline/stories/STR-1-set-up-the-workspace.md. FROM THE BARE BASELINE: there is no src, no pom.xml, no build. You generate all of it now, to baseline/architecture.md and the governance (004 technology contract, 005 testing contract).
IMPLEMENT: pom.xml on JDK 25 (maven.compiler.release=25) with JUnit BOM 5.14.4, Mockito 5.23.0 (+ mockito-junit-jupiter), AssertJ 3.27.7, archunit-junit5 1.4.2 (test), JSpecify 1.0.0 (compile), maven-compiler-plugin 3.14.1, maven-surefire-plugin 3.5.6, and jacoco-maven-plugin (prepare-agent + report + a check rule bound to verify: element BUNDLE, LINE COVEREDRATIO >= 0.80, excluding **/package-info.class and **/MutatesState.class — at STR-1 there is no domain code, so the rule is trivially satisfied); the EIGHT io.example.reservations packages (api, services/reservation, services/hold, services/availability, services/quota, store, clock, entities) each with a @NullMarked package-info.java; store/MutatesState.java (@Target METHOD, @Retention CLASS); src/test/resources/archunit.properties containing archRule.failOnEmptyShould=false; src/test/java/io/example/reservations/architecture/ArchitectureBoundariesTest.java with FOUR ArchUnit rules: entities depend on nothing above them; api may not access store; @MutatesState methods declared only in store; every io.example.reservations package has a @NullMarked package-info. Add -XX:+EnableDynamicAgentLoading to the surefire argLine alongside @{argLine} so Mockito's inline mock maker works on this JDK. Then \`mvn -B verify\` green (4 tests); \`mvn -N wrapper:wrapper\`. COMMIT: stage pom.xml mvnw mvnw.cmd .mvn src, subject "feat: stand up the reservations workspace (STR-1)". Report.`,
  },
  {
    phase: 'STR-2 reserve single item',
    taskId: 'str-2',
    prompt: `${PREAMBLE}

INCREMENT: STR-2 — reserve a single item for a time window. Story: baseline/stories/STR-2-reserve-single-item.md. First domain increment.
Implement per baseline/architecture.md and baseline/domain-model.md: entity records Item/TimeWindow(half-open overlap; reject end<=start)/User/Reservation; a store (single point of state change, methods marked @MutatesState); an availability service (free/occupied computed from reservations, ADR-0003); a confirm service (compute availability then hand ONE atomic change to the store, ADR-0002); an api ReservationEngine facade (confirm, isAvailable) wired by a composition root outside the enforced packages. The four ArchUnit boundary rules written in STR-1 must still pass. Report.`,
  },
  {
    phase: 'STR-3 tentative holds',
    taskId: 'str-3',
    prompt: `${PREAMBLE}

INCREMENT: STR-3 — tentative holds with expiry. Story: baseline/stories/STR-3-tentative-holds-with-expiry.md.
Introduce an injected Clock (clock port + a mutable test clock, ADR-0004); a Hold is active until its expiry instant vs the clock; confirming an active hold converts it to a reservation (consume the hold atomically); confirming an expired hold is rejected; availability excludes only ACTIVE holds. Note the story requires the availability computation and the no-double-booking invariant to now account for holds, and their existing tests to be widened accordingly — a test that still only exercises reservations no longer covers the rule it is named for. Report.`,
  },
  {
    phase: 'STR-4 cancellation/release',
    taskId: 'str-4',
    prompt: `${PREAMBLE}

INCREMENT: STR-4 — owner-initiated cancellation and release. Story: baseline/stories/STR-4-owner-cancellation-and-release.md.
Per the architecture code-org, add cancel to the reservation service and release to the hold service (NOT a new package); the store gains removal operations (@MutatesState); each verifies the requester OWNS the claim then hands one atomic removal to the store else rejects and changes nothing; engine exposes cancel/release. Report.`,
  },
  {
    phase: 'STR-5 per-user quota',
    taskId: 'str-5',
    prompt: `${PREAMBLE}

INCREMENT: STR-5 — per-user fair-use quota. Story: baseline/stories/STR-5-per-user-quota.md.
Model User carrying a quota WHILE preserving identity-only equality (two Users equal exactly when ids equal — so the record must override equals/hashCode to use id alone; give an unbounded convenience form so existing call sites keep working). Add a services.quota service counting a user's active item claims (held items from active holds + reserved items) IN ITEM TERMS, not object counts, computed from the store (no stored counter, ADR-0003). Gate BOTH placeHold and confirm on quota before creating a claim; expiry/release/cancel lower the count. Boundary tests at exactly-quota and one-over. Threading the new dependency rewires the affected tests; behaviour unchanged for unbounded users. Report.`,
  },
  {
    phase: 'STR-6 multi-item redesign (blind)',
    taskId: 'str-6',
    cherryPick: 'baseline-str6-requirement',
    prompt: `${PREAMBLE}

INCREMENT: STR-6 — atomic multi-item bookings. THE REDESIGN, and it runs DIFFERENTLY from every prior increment: you are given ONLY the plain requirement. Read ONLY baseline/stories/STR-6-atomic-multi-item-bookings.md. Work out the WHOLE change yourself from the requirement — nothing here tells you which parts of the system change, or how. Read the code that the requirement affects and reason from what it does, then edit. Add an ADR under baseline/adr/ for any genuinely new design decision.
Reach green \`mvn -B verify\`. In notes, describe exactly what you changed and how the redesign went — what you found, what was hard, and anything you suspect you might have missed. ALSO REQUIRED — a candid, first-person TESTIMONIAL on working out this change from the code alone, placed in your report's notes field under a line reading 'INTENT-RECOVERY TESTIMONIAL:'. You arrived at this codebase COLD, with no prior context, and had to perform its hardest change by recovering intent from the code, the tests, the architecture document and the ADRs. Speak plainly, concretely, and honestly — as YOUR own lived experience, not marketing: when you needed to know what an existing piece of code MEANT and whether its shape was a deliberate decision or an accident, what did you consult, and did it settle the question? Where did you have to guess, and where did a guess turn out wrong? Be concrete about the specific moments that stood out. Report.`,
  },
]

const CHERRY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', description: 'cherry-pick succeeded and the check below passed' },
    commit: { type: 'string', description: 'short hash of the new commit' },
    storyPresent: { type: 'boolean', description: 'the STR-6 story file exists on disk after the cherry-pick' },
    note: { type: 'string' },
  },
  required: ['ok', 'storyPresent'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    increment: { type: 'string' },
    green: { type: 'boolean', description: 'mvn -B verify still green after any fixes you made' },
    incrementSound: { type: 'boolean', description: 'true if, after any fixes, this increment is sound — no confirmed defect left unfixed' },
    findings: {
      type: 'array',
      description: 'one entry per issue examined (confirmed or dismissed)',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          criterion: { type: 'string', description: 'the acceptance criterion or design decision the finding concerns' },
          category: { type: 'string', description: 'defect | unmet-requirement | vacuous-test | other' },
          summary: { type: 'string' },
          confirmed: { type: 'boolean', description: 'true only if you traced criterion->code/test and the defect is real, not a false alarm' },
          fixed: { type: 'boolean', description: 'true if you corrected it and re-verified green' },
          detail: { type: 'string', description: 'concrete evidence: which criterion, which code or test fails it, what you changed' },
        },
        required: ['criterion', 'category', 'summary', 'confirmed', 'fixed'],
      },
    },
    fixCommit: { type: 'string', description: 'short hash + subject of the review-fix commit, or empty if no fix was needed' },
    note: { type: 'string' },
  },
  required: ['increment', 'green', 'incrementSound', 'findings'],
}

// A review runs after every increment for one reason: an increment that compiles green has not
// thereby been checked. What it examines depends on what the run records — here there is nothing
// but the story, so the reviewer traces each acceptance criterion to the code and to a test that
// could fail. Any run this one is compared against gets a review too, so a quality difference
// between them cannot be put down to one of them having had a second pair of eyes.
const reviewPrompt = (phaseTitle, storyPath) => `You are the REVIEWER for the increment just implemented (${phaseTitle}). Working dir is the repo root. Maven online (\`mvn -B verify\`). Windows + Git Bash.

The story is ${storyPath}. The binding design surface is baseline/architecture.md, baseline/domain-model.md and baseline/adr/; the governance under .claude/.ai-project-context/ is binding.

Review this increment’s diff — every file its commit changed. Green proves the suite passes, not that the story was honoured.

VERIFY before reporting: set confirmed:true only after you traced the defect in the code and it is real. For each CONFIRMED defect, FIX it, then re-run \`mvn -B verify\` (green), and commit as "fix: review (${phaseTitle})" ending with exactly:
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
If a finding is not a real defect, change nothing for it (report confirmed:false). If you cannot fix a confirmed defect while keeping green, leave the code and report fixed:false with green reflecting the true build state.

Return findings (criterion, category, summary, confirmed, fixed, detail), green, incrementSound, the fix commit if any, and a note.`

// Preflight: this run commits to whatever ref HEAD points at. If HEAD is DETACHED — e.g. the user
// checked out a tag — every increment's commit would belong to no branch. Make sure we are on a
// branch first; create one if not.
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
  `If it exits non-zero / prints nothing, HEAD is DETACHED: create a branch to hold this run with \`git checkout -b run\`, then report onBranch:false, branch:"run", created:true. ` +
  `Do nothing else — no other git commands, no file changes. Return {onBranch, branch, created}.`,
  { schema: PREFLIGHT_SCHEMA, phase: 'Preflight', label: 'preflight: ensure branch' }
)
log(`preflight: onBranch=${pre && pre.onBranch} branch=${pre && pre.branch} created=${pre && pre.created}`)

const reports = []
const reviews = []
for (let i = 0; i < steps.length; i++) {
  phase(steps[i].phase)

  // Reveal the last increment's requirement just-in-time: the STR-6 story lives on a separate ref,
  // NOT in the design surface, so STR-1..5 run blind to the redesign.
  if (steps[i].cherryPick) {
    const cp = await agent(
      taskTag(`${steps[i].taskId}-cherry-pick`) +
      `Run exactly one git command in the repo root: \`git cherry-pick ${steps[i].cherryPick}\`. ` +
      `It adds this increment's plain story file and creates a commit. Then verify that ` +
      `baseline/stories/STR-6-atomic-multi-item-bookings.md now EXISTS and report it as storyPresent. ` +
      `Do NOT read the story or any other file, and do NOT inspect git log, tags, branches, or diffs beyond running that single command. ` +
      `Return the new commit's short hash and the check.`,
      { schema: CHERRY_SCHEMA, phase: steps[i].phase, label: `cherry-pick ${steps[i].cherryPick}` }
    )
    log(`cherry-pick ${steps[i].cherryPick}: ok=${cp && cp.ok} storyPresent=${cp && cp.storyPresent}`)
  }

  const r = await agent(taskTag(steps[i].taskId) + steps[i].prompt, { schema: REPORT_SCHEMA, phase: steps[i].phase, label: steps[i].phase })
  reports.push(r)
  log(`${steps[i].phase}: green=${r && r.green} tests=${r && r.testsPassing} commits=${r && r.commits ? r.commits.length : 0}`)

  // Halt on a failed/dead increment instead of cascading: later increments build on this one.
  if (!r || r.green !== true) {
    log(`HALT after ${steps[i].phase}: did not finish green (${r ? 'green:false' : 'agent died / null'}). Stopping so the failure does not corrupt later increments; resume to retry this step.`)
    break
  }

  const storyPath = steps[i].taskId === 'str-6'
    ? 'baseline/stories/STR-6-atomic-multi-item-bookings.md'
    : `baseline/stories/${steps[i].taskId.toUpperCase()}-*.md`
  const rev = await agent(taskTag(`${steps[i].taskId}-review`) + reviewPrompt(steps[i].phase, storyPath), { schema: REVIEW_SCHEMA, phase: steps[i].phase, label: `review: ${steps[i].phase}` })
  reviews.push(rev)
  const confirmedUnfixed = rev && rev.findings ? rev.findings.filter(f => f && f.confirmed && !f.fixed).length : 0
  log(`review ${steps[i].phase}: honoured=${rev && rev.incrementSound} findings=${rev && rev.findings ? rev.findings.length : 0} confirmed-unfixed=${confirmedUnfixed} green=${rev && rev.green}`)

  // A review finding is quality feedback, not a hard build failure, so the run always proceeds.
  if (rev && rev.green !== true) {
    log(`NOTE: correctness review of ${steps[i].phase} did not restore green; continuing anyway (findings recorded for follow-up).`)
  }
}

phase('Metrics')

// A fixed shape, so the aggregate can set cost against outcome across any two runs.
const last = reports.length ? reports[reports.length - 1] : null
const outcome = {
  label: RUN_LABEL,
  arm: RUN_LABEL.replace(/[-_]?\d+$/, ''),
  incrementsAttempted: steps.length,
  incrementsCompleted: reports.length,
  allGreen: reports.length === steps.length && reports.every(r => r && r.green === true),
  finalTestsPassing: last ? last.testsPassing : null,
  finalSpecsCovered: null,
  confirmedFindings: reviews.reduce((n, r) => n + (r && r.findings ? r.findings.filter(f => f && f.confirmed).length : 0), 0),
  confirmedUnfixedFindings: reviews.reduce(
    (n, r) => n + (r && r.findings ? r.findings.filter(f => f && f.confirmed && !f.fixed).length : 0),
    0
  ),
  storiesClosed: null,
  perIncrement: reports.map(r => ({
    increment: r && r.increment,
    green: r && r.green,
    testsPassing: r && r.testsPassing,
    specsCovered: null,
  })),
}

const METRICS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', description: 'both collectors ran without error and wrote their files' },
    totalTokens: { type: 'integer' },
    outputTokens: { type: 'integer' },
    requests: { type: 'integer' },
    genMinutes: { type: 'number' },
    toolMinutes: { type: 'number' },
    methodSpecificTokens: { type: 'integer', description: 'run.methodSpecific.totalTokens — expected to be ~0 on this arm' },
    methodSpecificShare: { type: 'number' },
    rollupTokens: { type: 'object', additionalProperties: true, description: 'run.rollups mapped to name -> totalTokens' },
    files: { type: 'array', items: { type: 'string' } },
    note: { type: 'string' },
  },
  required: ['ok', 'totalTokens', 'outputTokens', 'requests', 'files'],
}
const metrics = await agent(
  taskTag('metrics') +
  `Collect the hard cost data for the autonomous run that just finished. Working dir is the repo root; Windows + Git Bash; node is on PATH.\n\n` +
  `Run EXACTLY these two commands, in this order, and do not edit either script:\n` +
  `  node .claude/workflows/metrics/collect-run-metrics.mjs --label ${RUN_LABEL} --arm ${RUN_LABEL.replace(/[-_]?\d+$/, '')}` +
  `${BASE_REV ? ` --base ${BASE_REV}` : ''} --out ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.json --md ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.md\n` +
  `  node .claude/workflows/metrics/collect-repo-metrics.mjs --label ${RUN_LABEL}` +
  `${BASE_REV ? ` --rev ${BASE_REV}` : ''} --out ${RESULTS_DIR}/repo-metrics-${RUN_LABEL}.json --md ${RESULTS_DIR}/repo-metrics-${RUN_LABEL}.md\n\n` +
  `The first reads this run's raw agent transcripts and writes run-metrics-${RUN_LABEL}.{json,md}: tokens in/out/cache-write/cache-read, model time vs tool time, and request counts, per task and per activity. ` +
  `The second reads git and writes repo-metrics-${RUN_LABEL}.{json,md}. Both land in ${RESULTS_DIR}/.\n\n` +
  `THEN write the run's outcome alongside them. Create ${RESULTS_DIR}/outcome-${RUN_LABEL}.json containing EXACTLY this JSON, unmodified:\n` +
  `\`\`\`json\n${JSON.stringify(outcome, null, 1)}\n\`\`\`\n\n` +
  `If a command fails, report the error verbatim in note and set ok:false — do NOT work around it by computing numbers yourself, and do NOT hand-edit the generated files. ` +
  `Every figure you return must be read back out of ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.json.\n\n` +
  `Do not commit anything — the report step commits the metrics files together with the report.\n\n` +
  `Return the headline figures read from that json: totals.totalTokens, totals.outputTokens, totals.requests, totals.genMs and totals.toolMs converted to minutes, methodSpecific.totalTokens and its share, and rollups mapped to name -> totalTokens.`,
  { schema: METRICS_SCHEMA, phase: 'Metrics', label: 'collect run + repo metrics' }
)
log(
  `metrics: ok=${metrics && metrics.ok} tokens=${metrics && metrics.totalTokens} out=${metrics && metrics.outputTokens} ` +
  `requests=${metrics && metrics.requests} method-specific=${metrics && metrics.methodSpecificTokens}`
)

phase('Report')
await agent(
  taskTag('report') +
  `Render the autonomous-run data below into a readable markdown report and WRITE it to ` +
  `docs/autonomous-run-report.md in the repo root, then commit it.\n\n` +
  `FORMAT — be faithful, drop nothing:\n` +
  `- An intro line: number of agents, number of increments, how many green. State plainly how this run was driven — from the stories and the design surface alone, with no specification corpus — so a reader can tell which run they are looking at.\n` +
  `- One \`## <increment>\` section per report, IN ORDER, each with: green / tests passing / the time window; the commits; ` +
  `"open questions the agent resolved itself" as Q / chose / why; "documentation — worked well"; "documentation — gaps"; "issues hit"; ` +
  `then the notes VERBATIM — quote any INTENT-RECOVERY TESTIMONIAL block word-for-word. This is a record, not a summary; do not paraphrase or drop content.\n` +
  `- A \`## Correctness reviews\` section: per review, incrementSound / green / findings, and the review note.\n` +
  `- A \`## Measured cost\` section built ONLY from ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.md and ` +
  `${RESULTS_DIR}/repo-metrics-${RUN_LABEL}.md, which already exist on disk — READ them and copy their ` +
  `"Cost by kind of task", "Tokens and time per task", "Where the tokens went — activity", "Roll-up" and "Lines written per increment" ` +
  `tables in verbatim, then link both files. Do NOT recompute, round, or re-derive any figure.\n\n` +
  `LAST, after the report file is written, re-run both collectors with the SAME arguments the metrics step used, so the committed metrics also cover that step:\n` +
  `  node .claude/workflows/metrics/collect-run-metrics.mjs --label ${RUN_LABEL} --arm ${RUN_LABEL.replace(/[-_]?\d+$/, '')}` +
  `${BASE_REV ? ` --base ${BASE_REV}` : ''} --quiet --out ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.json --md ${RESULTS_DIR}/run-metrics-${RUN_LABEL}.md\n` +
  `  node .claude/workflows/metrics/collect-repo-metrics.mjs --label ${RUN_LABEL}` +
  `${BASE_REV ? ` --rev ${BASE_REV}` : ''} --out ${RESULTS_DIR}/repo-metrics-${RUN_LABEL}.json --md ${RESULTS_DIR}/repo-metrics-${RUN_LABEL}.md\n` +
  `(Your own tokens are still being spent as you do this, so the committed figures exclude this final step — say so in one sentence under the Measured cost heading.)\n\n` +
  `Then stage and commit EXACTLY ${commitTarget} (nothing else) with subject "${commitSubject}". Report the commit hash.` +
  `${METRICS_IN_REPO ? '' : ` The metrics files live outside this working tree at ${RESULTS_DIR} and are NOT committed — do not try to stage them.`}\n\n` +
  `DATA:\n\`\`\`json\n${JSON.stringify({ reports, reviews }, null, 1)}\n\`\`\``,
  { phase: 'Report', label: 'write run report' }
)
return { reports, reviews, metrics }
