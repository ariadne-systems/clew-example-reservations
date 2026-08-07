#!/usr/bin/env node
// Run-metrics collector.
//
// Reads the raw agent transcripts a Workflow run leaves behind and turns them into hard,
// per-task numbers: tokens in/out (and the two cache classes), model time vs tool time,
// request and tool-call counts — each attributed to an ACTIVITY bucket so that two runs
// built on different methods can be compared on the same axes.
//
// The collector is method-agnostic on purpose: it classifies by what a request actually DID
// (which files it wrote, which commands it ran), not by which tool or skill was in play, so two
// runs that built the same work in different ways produce rows you can set against each other.
//
//   node .claude/workflows/metrics/collect-run-metrics.mjs \
//     [--dir <transcriptDir>] [--label <runLabel>] [--out <jsonPath>] [--md <mdPath>]
//     [--rates <ratesJson>] [--quiet]
//
// With no --dir it resolves the most recently written workflow transcript directory whose
// agents ran in the current working directory.

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname, basename } from 'node:path'
import { homedir } from 'node:os'

// ---------------------------------------------------------------------------------------------
// activity buckets
// ---------------------------------------------------------------------------------------------

// Highest priority first. A request usually carries several tool calls; it is attributed whole
// to the highest-priority bucket among them, because the tokens that produced the request bought
// the most consequential of its actions — splitting a request's tokens across its tool calls
// would invent a precision the usage record does not have.
const ACTIVITY_PRIORITY = [
  'reporting',
  'specification',
  'traceability',
  'implementation',
  'test-authoring',
  'workspace',
  'verification',
  'version-control',
  'orientation',
  'deliberation',
]

const ACTIVITY_DOC = {
  reporting: 'emitting the structured result, or writing a report document',
  specification: 'authoring or maintaining specs/stories/ADRs under docs/spec, and clew mint/promote',
  traceability: 'anchor markers, clew spec/coverage/check — the spec<->code link itself',
  implementation: 'production code under src/main',
  'test-authoring': 'test code under src/test',
  workspace: 'build and tool configuration (pom.xml, .clewrc.json, .claude/, package.json)',
  verification: 'running the build and the test suite (mvn / mvnw)',
  'version-control': 'git staging, committing, inspecting history',
  orientation: 'reading and searching — files, specs, code, skills',
  deliberation: 'a turn that called no tool: pure reasoning or a written answer',
}

// The three the comparison turns on, plus the ones worth holding apart rather than burying.
const ROLLUPS = {
  reasoning: ['orientation', 'deliberation', 'specification'],
  implementation: ['implementation', 'test-authoring', 'workspace'],
  verification: ['verification'],
  traceability: ['traceability'],
  overhead: ['version-control', 'reporting'],
}

// What a run driven straight from a work item would not spend at all: recording and checking
// intent rather than writing the code. Reported separately because on a run that keeps no
// specifications it falls to zero, which is what makes the two comparable on one definition.
//
// Review tasks are deliberately NOT counted here. A review is a phase of the work, not part of
// the method; charging one run's review to its method would confound "the method costs more"
// with "that run had a second pair of eyes". Review both, and charge neither.
const METHOD_SPECIFIC_ACTIVITIES = ['specification', 'traceability']

// ---------------------------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { quiet: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--quiet') args.quiet = true
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i]
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const repoRoot = process.cwd()

// ---------------------------------------------------------------------------------------------
// locating the transcripts
// ---------------------------------------------------------------------------------------------

function listDirs(path) {
  try {
    return readdirSync(path, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => join(path, d.name))
  } catch {
    return []
  }
}

function samePath(a, b) {
  if (!a || !b) return false
  const norm = p => String(p).replace(/[\\/]+/g, '/').replace(/\/$/, '').toLowerCase()
  return norm(a) === norm(b)
}

// The cwd every agent records in its transcript is what ties a run directory to this repo;
// mtime alone would happily pick up a run from a different project.
function runDirCwd(dir) {
  for (const f of readdirSync(dir)) {
    if (!f.startsWith('agent-') || !f.endsWith('.jsonl')) continue
    const firstLine = readFileSync(join(dir, f), 'utf8').split(/\r?\n/).find(Boolean)
    if (!firstLine) continue
    try {
      return JSON.parse(firstLine).cwd
    } catch {
      return null
    }
  }
  return null
}

function resolveTranscriptDir() {
  if (args.dir) return args.dir
  const projects = join(homedir(), '.claude', 'projects')
  const candidates = []
  for (const project of listDirs(projects)) {
    for (const session of listDirs(project)) {
      const workflows = join(session, 'subagents', 'workflows')
      for (const run of listDirs(workflows)) {
        if (!existsSync(join(run, 'journal.jsonl'))) continue
        if (!samePath(runDirCwd(run), repoRoot)) continue
        candidates.push({ dir: run, mtime: statSync(join(run, 'journal.jsonl')).mtimeMs })
      }
    }
  }
  if (!candidates.length) {
    throw new Error(`no workflow transcript directory found for ${repoRoot}; pass --dir explicitly`)
  }
  // Newest journal wins: the run that just finished is the one being measured.
  candidates.sort((a, b) => b.mtime - a.mtime)
  return candidates[0].dir
}

// ---------------------------------------------------------------------------------------------
// transcript parsing
// ---------------------------------------------------------------------------------------------

function readJsonl(path) {
  const out = []
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      // A truncated final line is expected while a run is still writing; skip it rather than
      // failing the whole collection.
    }
  }
  return out
}

function messageText(message) {
  if (!message) return ''
  const content = message.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map(c => (typeof c === 'string' ? c : c && c.type === 'text' ? c.text || '' : '')).join('\n')
  }
  return ''
}

const norm = p => String(p || '').replace(/\\/g, '/')

const ANCHOR_LINE = /^\s*(@(Realizes|Verifies|Concerns)\w*\s*\(|import\s+.*[Tt]raceables)/

// An anchor arrives two ways: inside a file being written for the first time (that is code
// authoring, the anchor rides along), or as a small edit bolted onto code that already exists
// (that is traceability work). Only the second is charged to traceability.
function editIsAnchorOnly(input) {
  const oldText = String(input.old_string || '')
  const newText = String(input.new_string || '')
  if (!newText) return false
  const oldLines = new Set(oldText.split(/\r?\n/).map(l => l.trim()))
  const added = newText.split(/\r?\n/).map(l => l).filter(l => l.trim() && !oldLines.has(l.trim()))
  if (!added.length) return false
  return added.every(l => ANCHOR_LINE.test(l))
}

function bucketForTool(tool) {
  const name = tool.name
  const input = tool.input || {}

  if (name === 'StructuredOutput') return 'reporting'
  if (name === 'Skill') return 'orientation'

  if (name === 'Bash' || name === 'PowerShell') {
    const cmd = String(input.command || '')
    if (/(^|[\s;&|(])(mvn|mvnw|\.\/mvnw)([\s;&|)]|$)/.test(cmd)) return 'verification'
    if (/clew\s+(spec|coverage|check|scan)\b/.test(cmd)) return 'traceability'
    if (/clew\s+(mint|promote|status)\b/.test(cmd)) return 'specification'
    if (/(^|[\s;&|(])git\s+/.test(cmd)) return 'version-control'
    return 'orientation'
  }

  if (name === 'Write' || name === 'Edit' || name === 'NotebookEdit') {
    const path = norm(input.file_path)
    if (/docs\/spec\//.test(path)) return 'specification'
    if (/src\/(main|test)\//.test(path)) {
      if (name === 'Edit' && editIsAnchorOnly(input)) return 'traceability'
      return /src\/test\//.test(path) ? 'test-authoring' : 'implementation'
    }
    if (/^docs\//.test(path) || /\/docs\//.test(path)) return 'reporting'
    return 'workspace'
  }

  if (['Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch', 'ToolSearch', 'NotebookRead'].includes(name)) {
    return 'orientation'
  }
  return 'orientation'
}

function bucketForRequest(tools) {
  if (!tools.length) return 'deliberation'
  const present = new Set(tools.map(bucketForTool))
  for (const bucket of ACTIVITY_PRIORITY) if (present.has(bucket)) return bucket
  return 'deliberation'
}

function emptyUsage() {
  return { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 }
}

function addUsage(target, u) {
  target.inputTokens += u.inputTokens
  target.outputTokens += u.outputTokens
  target.cacheWriteTokens += u.cacheWriteTokens
  target.cacheReadTokens += u.cacheReadTokens
}

function emptyBucket() {
  return { requests: 0, toolCalls: 0, thinkingBlocks: 0, genMs: 0, toolMs: 0, ...emptyUsage() }
}

function addToBucket(bucket, req) {
  bucket.requests += 1
  bucket.toolCalls += req.tools.length
  bucket.thinkingBlocks += req.thinkingBlocks
  bucket.genMs += req.genMs
  bucket.toolMs += req.toolMs
  addUsage(bucket, req.usage)
}

// One API request can appear as several transcript records (a streaming snapshot, then the
// settled message). They share message.id; the last record carries the final usage, and the
// span between first and last is the time the model spent generating.
function collapseRequests(records) {
  const byId = new Map()
  for (const rec of records) {
    if (rec.type !== 'assistant' || !rec.message) continue
    const id = rec.message.id || rec.requestId || rec.uuid
    if (!byId.has(id)) byId.set(id, [])
    byId.get(id).push(rec)
  }
  const requests = []
  for (const [id, group] of byId) {
    const first = group[0]
    const last = group[group.length - 1]
    const usageRaw = last.message.usage || {}
    const content = Array.isArray(last.message.content) ? last.message.content : []
    const tools = content.filter(c => c && c.type === 'tool_use')
    requests.push({
      id,
      model: last.message.model || null,
      effort: last.effort || null,
      startedAt: Date.parse(first.timestamp),
      endedAt: Date.parse(last.timestamp),
      usage: {
        inputTokens: usageRaw.input_tokens || 0,
        outputTokens: usageRaw.output_tokens || 0,
        cacheWriteTokens: usageRaw.cache_creation_input_tokens || 0,
        cacheReadTokens: usageRaw.cache_read_input_tokens || 0,
      },
      tools,
      thinkingBlocks: content.filter(c => c && (c.type === 'thinking' || c.type === 'redacted_thinking')).length,
      textChars: content.filter(c => c && c.type === 'text').reduce((n, c) => n + (c.text || '').length, 0),
    })
  }
  requests.sort((a, b) => a.startedAt - b.startedAt)
  return requests
}

// The clew skills mark the phases of the method; a run without them stays in one segment, which
// is why the stage axis is reported beside the activity axis and never in place of it.
function stageOf(tools, current) {
  for (const t of tools) {
    if (t.name === 'Skill' && t.input && t.input.skill) return `skill:${t.input.skill}`
    if ((t.name === 'Bash' || t.name === 'PowerShell') && t.input) {
      const m = String(t.input.command || '').match(/RUN-STAGE:\s*([\w-]+)/)
      if (m) return m[1]
    }
  }
  return current
}

// A run started before the workflow tagged its prompts still has to be measurable, so fall back
// to recognising the prompt itself. Only the tag is authoritative; this is a best effort.
function inferTaskId(text) {
  const increment = text.match(/INCREMENT:\s*STR-(\d+)/)
  if (increment) return `str-${increment[1]}`
  const review = text.match(/ANCHORING REVIEWER for the increment just implemented \(STR-(\d+)/)
  if (review) return `str-${review[1]}-review`
  if (/ANCHORING REVIEWER/.test(text)) return 'review'
  if (/git cherry-pick/.test(text)) return 'cherry-pick'
  if (/git HEAD is on a branch/.test(text)) return 'preflight'
  if (/collect-run-metrics|collect-repo-metrics/.test(text)) return 'metrics'
  if (/autonomous-run data below into a readable markdown report/.test(text)) return 'report'
  return null
}

function taskIdFrom(records, fallback) {
  const firstUser = records.find(r => r.type === 'user')
  const text = messageText(firstUser && firstUser.message)
  const tagged = text.match(/RUN-TASK-ID:\s*(\S+)/)
  if (tagged) return tagged[1]
  return inferTaskId(text) || fallback
}

function taskKind(taskId) {
  if (/^preflight/.test(taskId)) return 'preflight'
  if (/^cherry/.test(taskId)) return 'cherry-pick'
  if (/review/.test(taskId)) return 'review'
  if (/^metrics/.test(taskId)) return 'metrics'
  if (/^report/.test(taskId)) return 'report'
  if (/^str-?\d/i.test(taskId)) return 'increment'
  return 'other'
}

function analyseAgent(path) {
  const records = readJsonl(path)
  const agentId = (records.find(r => r.agentId) || {}).agentId || basename(path)
  const taskId = taskIdFrom(records, agentId)
  const requests = collapseRequests(records)

  const task = {
    taskId,
    kind: taskKind(taskId),
    agentId,
    transcript: basename(path),
    model: requests.length ? requests[0].model : null,
    effort: requests.length ? requests[0].effort : null,
    startedAt: requests.length ? new Date(requests[0].startedAt).toISOString() : null,
    finishedAt: requests.length ? new Date(requests[requests.length - 1].endedAt).toISOString() : null,
    wallMs: requests.length ? requests[requests.length - 1].endedAt - requests[0].startedAt : 0,
    requests: requests.length,
    thinkingBlocks: 0,
    textChars: 0,
    genMs: 0,
    toolMs: 0,
    ...emptyUsage(),
    toolCalls: {},
    activities: {},
    stages: {},
  }

  let stage = 'orientation'
  for (let i = 0; i < requests.length; i++) {
    const req = requests[i]
    req.genMs = Math.max(0, req.endedAt - req.startedAt)
    // Everything between this response settling and the next one starting is tool execution
    // plus the wait it imposed — real wall time, and it belongs to the work that caused it.
    req.toolMs = i + 1 < requests.length ? Math.max(0, requests[i + 1].startedAt - req.endedAt) : 0

    stage = stageOf(req.tools, stage)
    const activity = bucketForRequest(req.tools)

    task.thinkingBlocks += req.thinkingBlocks
    task.textChars += req.textChars
    task.genMs += req.genMs
    task.toolMs += req.toolMs
    addUsage(task, req.usage)
    for (const t of req.tools) task.toolCalls[t.name] = (task.toolCalls[t.name] || 0) + 1

    if (!task.activities[activity]) task.activities[activity] = emptyBucket()
    addToBucket(task.activities[activity], req)

    if (!task.stages[stage]) task.stages[stage] = emptyBucket()
    addToBucket(task.stages[stage], req)
  }

  task.totalTokens = task.inputTokens + task.outputTokens + task.cacheWriteTokens + task.cacheReadTokens
  // Per-task buckets carry their own total too, so a consumer can ask "what did orientation cost
  // in THIS increment" without re-summing the four token classes itself.
  for (const bucket of [...Object.values(task.activities), ...Object.values(task.stages)]) {
    bucket.totalTokens = bucket.inputTokens + bucket.outputTokens + bucket.cacheWriteTokens + bucket.cacheReadTokens
  }
  // The same roll-up the run carries, per task — so "what did THIS increment spend on reasoning
  // versus implementation" is a lookup rather than a re-derivation by every consumer.
  task.rollups = rollupOf(task.activities)
  return task
}

// ---------------------------------------------------------------------------------------------
// aggregation
// ---------------------------------------------------------------------------------------------

function rollupOf(activities) {
  const out = {}
  for (const [name, members] of Object.entries(ROLLUPS)) {
    const bucket = emptyBucket()
    for (const member of members) {
      const src = activities[member]
      if (!src) continue
      bucket.requests += src.requests
      bucket.toolCalls += src.toolCalls
      bucket.thinkingBlocks += src.thinkingBlocks
      bucket.genMs += src.genMs
      bucket.toolMs += src.toolMs
      addUsage(bucket, src)
    }
    bucket.totalTokens = bucket.inputTokens + bucket.outputTokens + bucket.cacheWriteTokens + bucket.cacheReadTokens
    out[name] = bucket
  }
  return out
}

function mergeActivities(tasks) {
  const merged = {}
  for (const task of tasks) {
    for (const [name, bucket] of Object.entries(task.activities)) {
      if (!merged[name]) merged[name] = emptyBucket()
      const target = merged[name]
      target.requests += bucket.requests
      target.toolCalls += bucket.toolCalls
      target.thinkingBlocks += bucket.thinkingBlocks
      target.genMs += bucket.genMs
      target.toolMs += bucket.toolMs
      addUsage(target, bucket)
    }
  }
  for (const bucket of Object.values(merged)) {
    bucket.totalTokens = bucket.inputTokens + bucket.outputTokens + bucket.cacheWriteTokens + bucket.cacheReadTokens
  }
  return merged
}

function costOf(usage, model, rates) {
  if (!rates) return null
  const rate = rates[model] || rates.default
  if (!rate) return null
  const per = n => n / 1_000_000
  return (
    per(usage.inputTokens) * (rate.input || 0) +
    per(usage.outputTokens) * (rate.output || 0) +
    per(usage.cacheWriteTokens) * (rate.cacheWrite || 0) +
    per(usage.cacheReadTokens) * (rate.cacheRead || 0)
  )
}

// ---------------------------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------------------------

const n = v => (v == null ? '' : Number(v).toLocaleString('en-US'))
const mins = ms => (ms == null ? '' : (ms / 60000).toFixed(1))
const pct = (part, whole) => (whole ? ((part / whole) * 100).toFixed(1) + '%' : '—')

function table(headers, rows) {
  const head = `| ${headers.join(' | ')} |`
  const sep = `| ${headers.map(() => '---').join(' | ')} |`
  return [head, sep, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n')
}

function renderMarkdown(run) {
  const out = []
  out.push(`# Run metrics — ${run.label}`)
  out.push('')
  out.push(
    `Arm \`${run.arm}\` · branch \`${run.provenance.branch}\` at \`${run.provenance.head}\`` +
      `${run.provenance.baseRev ? ` from base \`${run.provenance.baseRev}\`` : ''} · ` +
      `model ${run.provenance.models.join(', ') || 'unknown'} · effort ${run.provenance.efforts.join(', ') || 'unknown'}` +
      `${run.provenance.dirty ? ' · **working tree was dirty**' : ''}`
  )
  out.push('')
  out.push(`Transcripts: \`${run.transcriptDir}\``)
  out.push('')
  out.push(
    `${run.tasks.length} agent tasks · ${n(run.totals.requests)} model requests · ` +
      `${n(run.totals.totalTokens)} tokens · ${mins(run.totals.wallMs)} min of agent wall time ` +
      `(${mins(run.totals.genMs)} min generating, ${mins(run.totals.toolMs)} min in tools).`
  )
  out.push('')

  out.push('## Tokens and time per task')
  out.push('')
  out.push(
    table(
      ['task', 'kind', 'in', 'out', 'cache write', 'cache read', 'total', 'reqs', 'gen min', 'tool min', 'wall min'],
      run.tasks.map(t => [
        t.taskId,
        t.kind,
        n(t.inputTokens),
        n(t.outputTokens),
        n(t.cacheWriteTokens),
        n(t.cacheReadTokens),
        n(t.totalTokens),
        n(t.requests),
        mins(t.genMs),
        mins(t.toolMs),
        mins(t.wallMs),
      ])
    )
  )
  out.push('')
  out.push(
    '`in` is uncached input, `cache read` is input served from the prompt cache and `cache write` is input written into it — ' +
      'they are three different prices for the same axis, so they are never summed into one "input" column here.'
  )
  out.push('')

  // Each activity split across the four billed classes, because they are four different prices:
  // a bucket that is 96% cache read is cheap volume, one that is mostly output is the real spend.
  const costCol = run.cost != null
  const classHeaders = ['in', 'cache write', 'cache read', 'out']
  const classCells = b => [n(b.inputTokens), n(b.cacheWriteTokens), n(b.cacheReadTokens), n(b.outputTokens)]

  // Reviews first: the phase axis is what compares like with like across arms.
  out.push('## Cost by kind of task')
  out.push('')
  out.push(
    table(
      ['kind', 'tasks', 'total tokens', 'share', ...classHeaders, ...(costCol ? ['cost', 'cost share'] : []), 'reqs', 'wall min'],
      Object.entries(run.byKind)
        .sort((a, b) => b[1].totalTokens - a[1].totalTokens)
        .map(([kind, b]) => [
          kind,
          n(b.tasks),
          n(b.totalTokens),
          pct(b.totalTokens, run.totals.totalTokens),
          ...classCells(b),
          ...(costCol ? [`$${b.cost.toFixed(2)}`, pct(b.cost, run.cost)] : []),
          n(b.requests),
          mins(b.wallMs),
        ])
    )
  )
  out.push('')
  out.push(
    'A review is a phase of the work, not an activity within it — on the activity axis below it is scattered across ' +
      'orientation, verification and the rest. This is the row that sets one arm\'s review against the other\'s.'
  )
  out.push('')

  out.push('## Where the tokens went — activity')
  out.push('')
  out.push(
    table(
      ['activity', 'total tokens', 'share', ...classHeaders, ...(costCol ? ['cost', 'cost share'] : []), 'reqs', 'gen min', 'tool min'],
      ACTIVITY_PRIORITY.filter(a => run.activities[a]).map(a => {
        const b = run.activities[a]
        return [
          a,
          n(b.totalTokens),
          pct(b.totalTokens, run.totals.totalTokens),
          ...classCells(b),
          ...(costCol ? [`$${b.cost.toFixed(2)}`, pct(b.cost, run.cost)] : []),
          n(b.requests),
          mins(b.genMs),
          mins(b.toolMs),
        ]
      })
    )
  )
  out.push('')
  out.push(
    table(
      ['activity', 'what it covers'],
      ACTIVITY_PRIORITY.filter(a => run.activities[a]).map(a => [a, ACTIVITY_DOC[a]])
    )
  )
  out.push('')

  out.push('## Roll-up')
  out.push('')
  out.push(
    table(
      ['roll-up', 'total tokens', 'share', ...classHeaders, ...(costCol ? ['cost', 'cost share'] : []), 'gen min', 'tool min', 'members'],
      Object.entries(run.rollups).map(([name, b]) => [
        name,
        n(b.totalTokens),
        pct(b.totalTokens, run.totals.totalTokens),
        ...classCells(b),
        ...(costCol ? [`$${b.cost.toFixed(2)}`, pct(b.cost, run.cost)] : []),
        mins(b.genMs),
        mins(b.toolMs),
        ROLLUPS[name].join(', '),
      ])
    )
  )
  out.push('')
  out.push(
    'Output tokens are the axis worth ranking on: they are a fraction of the volume and a large share of the spend, ' +
      'and unlike cache read they do not move with cache-hit timing. Cache read reads as *how much context this work had to re-read*.'
  )
  out.push('')

  // The same split per task, so an increment can be read on its own terms — which is what the
  // orientation-versus-codebase-size question is actually asked of.
  out.push('## Roll-up per task — output tokens')
  out.push('')
  const rollupNames = Object.keys(ROLLUPS)
  out.push(
    table(
      ['task', 'kind', ...rollupNames, 'total out'],
      run.tasks.map(t => [
        t.taskId,
        t.kind,
        ...rollupNames.map(name => n(t.rollups[name] ? t.rollups[name].outputTokens : 0)),
        n(t.outputTokens),
      ])
    )
  )
  out.push('')
  out.push(
    `Method-specific spend (${METHOD_SPECIFIC_ACTIVITIES.join(' + ')}): ` +
      `**${n(run.methodSpecific.totalTokens)} tokens, ${pct(run.methodSpecific.totalTokens, run.totals.totalTokens)} of the run** — ` +
      'the part a run driven straight from the stories would not spend. ' +
      'Review tasks are excluded: both arms review, so charging one arm\'s review to the method would confound it with having a second pair of eyes.'
  )
  out.push('')

  out.push('## Tokens per method stage')
  out.push('')
  const stageRows = Object.entries(run.stages).sort((a, b) => b[1].totalTokens - a[1].totalTokens)
  out.push(
    table(
      ['stage', 'total tokens', 'share', 'reqs', 'gen min', 'tool min'],
      stageRows.map(([name, b]) => [
        name,
        n(b.totalTokens),
        pct(b.totalTokens, run.totals.totalTokens),
        n(b.requests),
        mins(b.genMs),
        mins(b.toolMs),
      ])
    )
  )
  out.push('')
  out.push(
    'Stages come from the skill invoked at the time; a run that uses no skills reports one stage. ' +
      'This axis describes the method, so only the activity axis above is comparable across methods.'
  )
  out.push('')

  out.push('## Tool calls')
  out.push('')
  const tools = Object.entries(run.toolCalls).sort((a, b) => b[1] - a[1])
  out.push(table(['tool', 'calls'], tools.map(([name, count]) => [name, n(count)])))
  out.push('')
  out.push(
    'Counted once per settled message. A streaming response is written to the transcript twice, ' +
      'so a naive count over the raw records inflates this figure.'
  )
  out.push('')

  if (run.cost) {
    out.push('## Cost')
    out.push('')
    out.push(
      table(
        ['task', 'cost'],
        run.tasks.map(t => [t.taskId, t.cost == null ? '—' : `$${t.cost.toFixed(2)}`])
      )
    )
    out.push('')
    out.push(`Total: **$${run.cost.toFixed(2)}** at the rates in \`${run.ratesFile}\`.`)
    out.push('')
  }
  return out.join('\n')
}

// ---------------------------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------------------------

const transcriptDir = resolveTranscriptDir()
const agentFiles = readdirSync(transcriptDir)
  .filter(f => f.startsWith('agent-') && f.endsWith('.jsonl'))
  .map(f => join(transcriptDir, f))

const tasks = agentFiles.map(analyseAgent).filter(t => t.requests > 0)
// Chronological, so the table reads as the run happened.
tasks.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))

const rates = args.rates && existsSync(args.rates) ? JSON.parse(readFileSync(args.rates, 'utf8')) : null
if (rates) for (const task of tasks) task.cost = costOf(task, task.model, rates)

const totals = { requests: 0, toolCalls: 0, thinkingBlocks: 0, genMs: 0, toolMs: 0, wallMs: 0, ...emptyUsage() }
const toolCalls = {}
for (const task of tasks) {
  totals.requests += task.requests
  totals.thinkingBlocks += task.thinkingBlocks
  totals.genMs += task.genMs
  totals.toolMs += task.toolMs
  totals.wallMs += task.wallMs
  addUsage(totals, task)
  for (const [name, count] of Object.entries(task.toolCalls)) toolCalls[name] = (toolCalls[name] || 0) + count
}
totals.toolCalls = Object.values(toolCalls).reduce((a, b) => a + b, 0)
totals.totalTokens = totals.inputTokens + totals.outputTokens + totals.cacheWriteTokens + totals.cacheReadTokens

// Cost per kind of task — increments, reviews, and the run's own scaffolding kept apart. Reviews
// are a phase of the work, not an activity within it, so they only become visible as a line of
// their own on this axis; the activity axis scatters them across orientation, verification and
// the rest. Both arms review, so this is the row that compares review against review.
const byKind = {}
for (const task of tasks) {
  if (!byKind[task.kind]) {
    byKind[task.kind] = { tasks: 0, requests: 0, thinkingBlocks: 0, genMs: 0, toolMs: 0, wallMs: 0, ...emptyUsage() }
  }
  const bucket = byKind[task.kind]
  bucket.tasks += 1
  bucket.requests += task.requests
  bucket.thinkingBlocks += task.thinkingBlocks
  bucket.genMs += task.genMs
  bucket.toolMs += task.toolMs
  bucket.wallMs += task.wallMs
  addUsage(bucket, task)
}
for (const bucket of Object.values(byKind)) {
  bucket.totalTokens = bucket.inputTokens + bucket.outputTokens + bucket.cacheWriteTokens + bucket.cacheReadTokens
}

const activities = mergeActivities(tasks)
const rollups = rollupOf(activities)
// Cost per bucket, not just per run: the four classes are priced differently, so a bucket's share
// of the tokens and its share of the bill are different numbers and both are worth reading.
if (rates) {
  const model = tasks.length ? tasks[0].model : null
  for (const bucket of [...Object.values(activities), ...Object.values(rollups), ...Object.values(byKind)]) {
    bucket.cost = costOf(bucket, model, rates)
  }
}
const stages = {}
for (const task of tasks) {
  for (const [name, bucket] of Object.entries(task.stages)) {
    if (!stages[name]) stages[name] = emptyBucket()
    const target = stages[name]
    target.requests += bucket.requests
    target.toolCalls += bucket.toolCalls
    target.thinkingBlocks += bucket.thinkingBlocks
    target.genMs += bucket.genMs
    target.toolMs += bucket.toolMs
    addUsage(target, bucket)
  }
}
for (const bucket of Object.values(stages)) {
  bucket.totalTokens = bucket.inputTokens + bucket.outputTokens + bucket.cacheWriteTokens + bucket.cacheReadTokens
}

const methodSpecific = emptyBucket()
for (const activity of METHOD_SPECIFIC_ACTIVITIES) {
  const src = activities[activity]
  if (!src) continue
  methodSpecific.requests += src.requests
  methodSpecific.genMs += src.genMs
  methodSpecific.toolMs += src.toolMs
  addUsage(methodSpecific, src)
}
methodSpecific.totalTokens =
  methodSpecific.inputTokens + methodSpecific.outputTokens + methodSpecific.cacheWriteTokens + methodSpecific.cacheReadTokens

// Repeating a run is only meaningful if you can tell afterwards that the two were comparable.
// Everything a later reader would have to take on trust — which commit it started from, which
// model and effort actually served the requests — is recorded with the numbers.
function gitOrNull(...cliArgs) {
  try {
    return execFileSync('git', cliArgs, { cwd: repoRoot, encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

const models = [...new Set(tasks.map(t => t.model).filter(Boolean))]
const efforts = [...new Set(tasks.map(t => t.effort).filter(Boolean))]

// An arm groups the repeats of one way of working: "alpha-03" belongs to arm "alpha". Repeats are what
// separate a real difference between methods from the spread of a single method against itself.
const label = args.label || 'run'
const arm = args.arm || label.replace(/[-_]?\d+$/, '')

const run = {
  label,
  arm,
  collectedAt: new Date().toISOString(),
  provenance: {
    branch: gitOrNull('rev-parse', '--abbrev-ref', 'HEAD'),
    head: gitOrNull('rev-parse', '--short', 'HEAD'),
    baseRev: args.base || null,
    dirty: (gitOrNull('status', '--porcelain') || '') !== '',
    models,
    efforts,
    node: process.version,
  },
  repoRoot,
  transcriptDir,
  activityDoc: ACTIVITY_DOC,
  rollupMembers: ROLLUPS,
  methodSpecificActivities: METHOD_SPECIFIC_ACTIVITIES,
  totals,
  toolCalls,
  byKind,
  activities,
  rollups,
  stages,
  methodSpecific,
  tasks,
  ratesFile: rates ? args.rates : null,
  cost: rates ? tasks.reduce((sum, t) => sum + (t.cost || 0), 0) : null,
}

const jsonPath = args.out || join(repoRoot, 'docs', 'metrics', `run-metrics-${run.label}.json`)
const mdPath = args.md || join(repoRoot, 'docs', 'metrics', `run-metrics-${run.label}.md`)
for (const p of [jsonPath, mdPath]) mkdirSync(dirname(p), { recursive: true })
writeFileSync(jsonPath, JSON.stringify(run, null, 2))
writeFileSync(mdPath, renderMarkdown(run) + '\n')

if (!args.quiet) {
  console.log(`transcripts: ${transcriptDir}`)
  console.log(`tasks: ${tasks.length}  requests: ${totals.requests}  tokens: ${totals.totalTokens}`)
  console.log(`wrote ${jsonPath}`)
  console.log(`wrote ${mdPath}`)
}
