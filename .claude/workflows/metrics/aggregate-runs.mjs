#!/usr/bin/env node
// Aggregate repeated runs into per-arm distributions.
//
// A single run of an agent is one sample, not a measurement. This reads every run-metrics file
// under an experiment directory, groups them by arm, and reports mean, spread and range for each
// token partition — so a difference between two methods can be read against the spread of each
// method against itself, instead of being asserted from one run apiece.
//
//   node .claude/workflows/metrics/aggregate-runs.mjs \
//     [--dir experiments] [--out experiments/aggregate.md] [--json experiments/aggregate.json]
//
// It finds `run-metrics-*.json` at any depth under --dir, and pairs each with the
// `repo-metrics-*.json` and `outcome-*.json` of the same label when they sit beside it.

import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) args[a.slice(2)] = argv[++i]
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const root = args.dir || join(process.cwd(), 'experiments')

function walk(dir, found = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, found)
    else if (/^run-metrics-.*\.json$/.test(entry.name)) found.push(path)
  }
  return found
}

const runPaths = walk(root)
if (!runPaths.length) {
  console.error(`no run-metrics-*.json found under ${root}`)
  process.exit(2)
}

const runs = runPaths.map(path => {
  const run = JSON.parse(readFileSync(path, 'utf8'))
  const label = run.label
  const sibling = name => {
    const candidate = join(dirname(path), `${name}-${label}.json`)
    return existsSync(candidate) ? JSON.parse(readFileSync(candidate, 'utf8')) : null
  }
  return { path, run, repo: sibling('repo-metrics'), outcome: sibling('outcome') }
})

// ---------------------------------------------------------------------------------------------
// statistics — deliberately plain
// ---------------------------------------------------------------------------------------------

// No significance tests. With a handful of runs per arm the honest summary is the centre, the
// spread and the range; a p-value here would dress up three samples as a result.
function describe(values) {
  const clean = values.filter(v => typeof v === 'number' && Number.isFinite(v))
  if (!clean.length) return null
  const n = clean.length
  const mean = clean.reduce((a, b) => a + b, 0) / n
  const sorted = [...clean].sort((a, b) => a - b)
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
  // Sample standard deviation; undefined for a single run, which is the point.
  const sd = n > 1 ? Math.sqrt(clean.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : null
  return { n, mean, median, sd, cv: sd && mean ? sd / mean : null, min: sorted[0], max: sorted[n - 1] }
}

const byArm = new Map()
for (const entry of runs) {
  const arm = entry.run.arm || entry.run.label
  if (!byArm.has(arm)) byArm.set(arm, [])
  byArm.get(arm).push(entry)
}

const ACTIVITIES = [...new Set(runs.flatMap(e => Object.keys(e.run.activities)))]
const KINDS = [...new Set(runs.flatMap(e => Object.keys(e.run.byKind || {})))]
const ROLLUPS = [...new Set(runs.flatMap(e => Object.keys(e.run.rollups)))]
const TASKS = [...new Set(runs.flatMap(e => e.run.tasks.map(t => t.taskId)))]

const pick = (entry, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), entry)

const arms = [...byArm.entries()].map(([arm, entries]) => {
  const of = fn => describe(entries.map(fn))
  return {
    arm,
    runs: entries.map(e => ({
      label: e.run.label,
      head: e.run.provenance ? e.run.provenance.head : null,
      models: e.run.provenance ? e.run.provenance.models : null,
      totalTokens: e.run.totals.totalTokens,
      outputTokens: e.run.totals.outputTokens,
      wallMs: e.run.totals.wallMs,
      green: e.outcome ? e.outcome.allGreen : null,
      tests: e.repo && e.repo.final ? e.repo.final.testMethods : null,
      coverage: e.repo && e.repo.coverage ? e.repo.coverage.linePercent : null,
    })),
    totals: {
      totalTokens: of(e => e.run.totals.totalTokens),
      outputTokens: of(e => e.run.totals.outputTokens),
      cacheReadTokens: of(e => e.run.totals.cacheReadTokens),
      cacheWriteTokens: of(e => e.run.totals.cacheWriteTokens),
      inputTokens: of(e => e.run.totals.inputTokens),
      requests: of(e => e.run.totals.requests),
      toolCalls: of(e => e.run.totals.toolCalls),
      genMinutes: of(e => e.run.totals.genMs / 60000),
      toolMinutes: of(e => e.run.totals.toolMs / 60000),
      wallMinutes: of(e => e.run.totals.wallMs / 60000),
    },
    kinds: Object.fromEntries(
      KINDS.map(kind => [
        kind,
        {
          tokens: of(e => (e.run.byKind && e.run.byKind[kind] ? e.run.byKind[kind].totalTokens : null)),
          outputTokens: of(e => (e.run.byKind && e.run.byKind[kind] ? e.run.byKind[kind].outputTokens : null)),
          minutes: of(e => (e.run.byKind && e.run.byKind[kind] ? e.run.byKind[kind].wallMs / 60000 : null)),
        },
      ])
    ),
    activities: Object.fromEntries(
      ACTIVITIES.map(name => [
        name,
        {
          tokens: of(e => (e.run.activities[name] ? e.run.activities[name].totalTokens : null)),
          minutes: of(e =>
            e.run.activities[name] ? (e.run.activities[name].genMs + e.run.activities[name].toolMs) / 60000 : null
          ),
        },
      ])
    ),
    rollups: Object.fromEntries(
      ROLLUPS.map(name => [name, of(e => (e.run.rollups[name] ? e.run.rollups[name].totalTokens : null))])
    ),
    methodSpecific: of(e => (e.run.methodSpecific ? e.run.methodSpecific.totalTokens : null)),
    tasks: Object.fromEntries(
      TASKS.map(id => {
        const taskOf = e => e.run.tasks.find(t => t.taskId === id)
        return [
          id,
          {
            tokens: of(e => { const t = taskOf(e); return t ? t.totalTokens : null }),
            orientationTokens: of(e => {
              const t = taskOf(e)
              return t && t.activities.orientation ? t.activities.orientation.totalTokens : null
            }),
            minutes: of(e => { const t = taskOf(e); return t ? t.wallMs / 60000 : null }),
          },
        ]
      })
    ),
    outcomes: {
      allGreen: entries.filter(e => e.outcome && e.outcome.allGreen).length,
      withOutcome: entries.filter(e => e.outcome).length,
      testMethods: of(e => (e.repo && e.repo.final ? e.repo.final.testMethods : null)),
      productionLines: of(e => (e.repo && e.repo.final ? e.repo.final.productionLines : null)),
      coverage: of(e => (e.repo && e.repo.coverage ? e.repo.coverage.linePercent : null)),
      confirmedFindings: of(e => (e.outcome ? e.outcome.confirmedFindings : null)),
    },
  }
})

// ---------------------------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------------------------

const n = v => (v == null ? '—' : Math.round(v).toLocaleString('en-US'))
const one = v => (v == null ? '—' : v.toFixed(1))
const cvPct = v => (v == null ? '—' : (v * 100).toFixed(0) + '%')

function cell(stat, fmt = n) {
  if (!stat) return '—'
  if (stat.n === 1) return `${fmt(stat.mean)} (n=1)`
  return `${fmt(stat.mean)} ± ${fmt(stat.sd)}`
}

function rangeCell(stat, fmt = n) {
  if (!stat) return '—'
  return stat.n === 1 ? fmt(stat.mean) : `${fmt(stat.min)}–${fmt(stat.max)}`
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ].join('\n')
}

const out = []
out.push('# Experiment aggregate')
out.push('')
out.push(`${runs.length} runs across ${arms.length} arm(s), read from \`${root}\`.`)
out.push('')
out.push('Cells are **mean ± sample standard deviation** across the repeats of that arm; a cell marked `(n=1)` is a single run and has no spread yet.')
out.push('')

out.push('## Runs')
out.push('')
out.push(
  table(
    ['arm', 'run', 'head', 'total tokens', 'output', 'wall min', 'green', '@Test', 'coverage'],
    arms.flatMap(a =>
      a.runs.map(r => [
        a.arm,
        r.label,
        r.head || '—',
        n(r.totalTokens),
        n(r.outputTokens),
        one(r.wallMs / 60000),
        r.green == null ? '—' : r.green ? 'yes' : 'no',
        n(r.tests),
        r.coverage == null ? '—' : r.coverage.toFixed(1) + '%',
      ])
    )
  )
)
out.push('')

out.push('## Totals per arm')
out.push('')
out.push(
  table(
    ['measure', ...arms.map(a => `${a.arm} (n=${a.runs.length})`), ...arms.map(a => `${a.arm} range`)],
    [
      ['total tokens', 'totalTokens', n],
      ['output tokens', 'outputTokens', n],
      ['cache read', 'cacheReadTokens', n],
      ['cache write', 'cacheWriteTokens', n],
      ['uncached input', 'inputTokens', n],
      ['requests', 'requests', n],
      ['tool calls', 'toolCalls', n],
      ['generating (min)', 'genMinutes', one],
      ['in tools (min)', 'toolMinutes', one],
      ['agent wall (min)', 'wallMinutes', one],
    ].map(([name, key, fmt]) => [
      name,
      ...arms.map(a => cell(a.totals[key], fmt)),
      ...arms.map(a => rangeCell(a.totals[key], fmt)),
    ])
  )
)
out.push('')

out.push('## Per kind of task')
out.push('')
out.push(
  table(
    ['kind', ...arms.map(a => `${a.arm} tokens`), ...arms.map(a => `${a.arm} out`), ...arms.map(a => `${a.arm} min`)],
    KINDS.map(kind => [
      kind,
      ...arms.map(a => cell(a.kinds[kind].tokens)),
      ...arms.map(a => cell(a.kinds[kind].outputTokens)),
      ...arms.map(a => cell(a.kinds[kind].minutes, one)),
    ])
  )
)
out.push('')
out.push('Both arms review after every increment, so the `review` row compares like with like — it is not part of either arm\'s method-specific spend.')
out.push('')

out.push('## Token partitions per arm — every activity')
out.push('')
out.push(
  table(
    ['activity', ...arms.map(a => `${a.arm} tokens`), ...arms.map(a => `${a.arm} cv`), ...arms.map(a => `${a.arm} min`)],
    ACTIVITIES.map(name => [
      name,
      ...arms.map(a => cell(a.activities[name].tokens)),
      ...arms.map(a => cvPct(a.activities[name].tokens ? a.activities[name].tokens.cv : null)),
      ...arms.map(a => cell(a.activities[name].minutes, one)),
    ])
  )
)
out.push('')
out.push('`cv` is the coefficient of variation — spread as a fraction of the mean. A difference between arms smaller than either arm\'s cv is not yet a result.')
out.push('')

out.push('## Roll-ups per arm')
out.push('')
out.push(
  table(
    ['roll-up', ...arms.map(a => a.arm), ...arms.map(a => `${a.arm} range`)],
    [...ROLLUPS.map(name => [name, ...arms.map(a => cell(a.rollups[name])), ...arms.map(a => rangeCell(a.rollups[name]))]),
     ['method-specific', ...arms.map(a => cell(a.methodSpecific)), ...arms.map(a => rangeCell(a.methodSpecific))]]
  )
)
out.push('')

out.push('## Per task')
out.push('')
out.push(
  table(
    ['task', ...arms.map(a => `${a.arm} tokens`), ...arms.map(a => `${a.arm} orientation`), ...arms.map(a => `${a.arm} wall min`)],
    TASKS.map(id => [
      id,
      ...arms.map(a => cell(a.tasks[id].tokens)),
      ...arms.map(a => cell(a.tasks[id].orientationTokens)),
      ...arms.map(a => cell(a.tasks[id].minutes, one)),
    ])
  )
)
out.push('')
out.push(
  'The orientation column is the one the scale argument turns on: whether re-deriving what the existing code means ' +
    'grows with the codebase, or stays flat because the anchors already say it. Read it down the increments, not across.'
)
out.push('')

out.push('## Outcome')
out.push('')
out.push(
  table(
    ['measure', ...arms.map(a => a.arm)],
    [
      ['runs all-green', ...arms.map(a => `${a.outcomes.allGreen}/${a.outcomes.withOutcome || a.runs.length}`)],
      ['@Test methods', ...arms.map(a => cell(a.outcomes.testMethods))],
      ['production lines', ...arms.map(a => cell(a.outcomes.productionLines))],
      ['line coverage %', ...arms.map(a => cell(a.outcomes.coverage, one))],
      ['confirmed review findings', ...arms.map(a => cell(a.outcomes.confirmedFindings, one))],
    ]
  )
)
out.push('')
out.push(
  'Cost without outcome is not a comparison. An arm that spends less and arrives with fewer tests, lower coverage, ' +
    'or a failed increment has not won anything.'
)
out.push('')

const mdPath = args.out || join(root, 'aggregate.md')
const jsonPath = args.json || join(root, 'aggregate.json')
for (const p of [mdPath, jsonPath]) mkdirSync(dirname(p), { recursive: true })
writeFileSync(mdPath, out.join('\n') + '\n')
writeFileSync(jsonPath, JSON.stringify({ collectedAt: new Date().toISOString(), root, arms }, null, 2))

console.log(`runs: ${runs.length}  arms: ${arms.map(a => `${a.arm}(${a.runs.length})`).join(' ')}`)
console.log(`wrote ${mdPath}`)
console.log(`wrote ${jsonPath}`)
