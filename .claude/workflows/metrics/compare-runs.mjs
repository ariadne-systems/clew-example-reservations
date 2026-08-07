#!/usr/bin/env node
// Side-by-side comparison of two measured runs.
//
// Built for the question the metrics exist to answer: what did one way of working cost, and what
// did it buy, against another that produced the same thing? It compares only the axes
// that mean the same thing on both sides — activity buckets and produced artefacts — and states
// where a row exists on one side only rather than reporting a zero that reads like a measurement.
//
//   node .claude/workflows/metrics/compare-runs.mjs \
//     --a docs/metrics/run-metrics-alpha.json --b docs/metrics/run-metrics-beta.json \
//     [--repo-a docs/metrics/repo-metrics-alpha.json] [--repo-b docs/metrics/repo-metrics-beta.json] \
//     [--out docs/metrics/comparison.md]

import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) args[a.slice(2)] = argv[++i]
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
if (!args.a || !args.b) {
  console.error('usage: compare-runs.mjs --a <run-metrics.json> --b <run-metrics.json> [--repo-a ...] [--repo-b ...] [--out ...]')
  process.exit(2)
}

const load = p => JSON.parse(readFileSync(p, 'utf8'))
const runA = load(args.a)
const runB = load(args.b)
const repoA = args['repo-a'] && existsSync(args['repo-a']) ? load(args['repo-a']) : null
const repoB = args['repo-b'] && existsSync(args['repo-b']) ? load(args['repo-b']) : null

const n = v => (v == null ? '—' : Number(v).toLocaleString('en-US'))
const mins = ms => (ms == null ? '—' : (ms / 60000).toFixed(1))

// A ratio is only honest when both sides measured the same thing; a missing or zero denominator
// gets a dash, never an "∞" or a 100% that looks like a finding.
function delta(a, b) {
  if (!a || !b) return '—'
  const change = ((b - a) / a) * 100
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(0)}%`
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ].join('\n')
}

const out = []
out.push(`# ${runA.label} vs ${runB.label}`)
out.push('')
out.push(`A = **${runA.label}** (${runA.tasks.length} tasks) · B = **${runB.label}** (${runB.tasks.length} tasks)`)
out.push('')

out.push('## Totals')
out.push('')
const totalRows = [
  ['total tokens', runA.totals.totalTokens, runB.totals.totalTokens],
  ['output tokens', runA.totals.outputTokens, runB.totals.outputTokens],
  ['uncached input', runA.totals.inputTokens, runB.totals.inputTokens],
  ['cache write', runA.totals.cacheWriteTokens, runB.totals.cacheWriteTokens],
  ['cache read', runA.totals.cacheReadTokens, runB.totals.cacheReadTokens],
  ['model requests', runA.totals.requests, runB.totals.requests],
  ['tool calls', runA.totals.toolCalls, runB.totals.toolCalls],
]
out.push(
  table(
    ['measure', `A · ${runA.label}`, `B · ${runB.label}`, 'B vs A'],
    totalRows.map(([name, a, b]) => [name, n(a), n(b), delta(a, b)])
  )
)
out.push('')
out.push(
  table(
    ['time', `A · ${runA.label}`, `B · ${runB.label}`, 'B vs A'],
    [
      ['generating (min)', mins(runA.totals.genMs), mins(runB.totals.genMs), delta(runA.totals.genMs, runB.totals.genMs)],
      ['in tools (min)', mins(runA.totals.toolMs), mins(runB.totals.toolMs), delta(runA.totals.toolMs, runB.totals.toolMs)],
      ['agent wall (min)', mins(runA.totals.wallMs), mins(runB.totals.wallMs), delta(runA.totals.wallMs, runB.totals.wallMs)],
    ]
  )
)
out.push('')

out.push('## Where the tokens went')
out.push('')
const activityNames = [...new Set([...Object.keys(runA.activities), ...Object.keys(runB.activities)])]
out.push(
  table(
    ['activity', `A tokens`, 'A share', `B tokens`, 'B share', 'B vs A'],
    activityNames.map(name => {
      const a = runA.activities[name]
      const b = runB.activities[name]
      const share = (bucket, run) => (bucket ? ((bucket.totalTokens / run.totals.totalTokens) * 100).toFixed(1) + '%' : '—')
      return [
        name,
        a ? n(a.totalTokens) : '—',
        share(a, runA),
        b ? n(b.totalTokens) : '—',
        share(b, runB),
        delta(a && a.totalTokens, b && b.totalTokens),
      ]
    })
  )
)
out.push('')
out.push('A dash means the run never entered that bucket at all — not that it spent zero there.')
out.push('')

out.push('## Roll-up')
out.push('')
const rollupNames = [...new Set([...Object.keys(runA.rollups), ...Object.keys(runB.rollups)])]
out.push(
  table(
    ['roll-up', 'A tokens', 'B tokens', 'B vs A', 'A gen min', 'B gen min'],
    rollupNames.map(name => {
      const a = runA.rollups[name]
      const b = runB.rollups[name]
      return [
        name,
        a ? n(a.totalTokens) : '—',
        b ? n(b.totalTokens) : '—',
        delta(a && a.totalTokens, b && b.totalTokens),
        a ? mins(a.genMs) : '—',
        b ? mins(b.genMs) : '—',
      ]
    })
  )
)
out.push('')
out.push(
  `Method-specific spend — A: **${n(runA.methodSpecific.totalTokens)}** ` +
    `(${((runA.methodSpecific.totalTokens / runA.totals.totalTokens) * 100).toFixed(1)}%), ` +
    `B: **${n(runB.methodSpecific.totalTokens)}** ` +
    `(${((runB.methodSpecific.totalTokens / runB.totals.totalTokens) * 100).toFixed(1)}%).`
)
out.push('')

// Tasks only line up when both runs were driven by the same increment list; matching on the
// task id keeps a renamed or extra task from being paired with an unrelated one.
const taskIds = [...new Set([...runA.tasks.map(t => t.taskId), ...runB.tasks.map(t => t.taskId)])]
const pickTask = (run, id) => run.tasks.find(t => t.taskId === id)
out.push('## Per task')
out.push('')
out.push(
  table(
    ['task', 'A tokens', 'B tokens', 'B vs A', 'A out', 'B out', 'A wall min', 'B wall min'],
    taskIds.map(id => {
      const a = pickTask(runA, id)
      const b = pickTask(runB, id)
      return [
        id,
        a ? n(a.totalTokens) : '—',
        b ? n(b.totalTokens) : '—',
        delta(a && a.totalTokens, b && b.totalTokens),
        a ? n(a.outputTokens) : '—',
        b ? n(b.outputTokens) : '—',
        a ? mins(a.wallMs) : '—',
        b ? mins(b.wallMs) : '—',
      ]
    })
  )
)
out.push('')

if (repoA && repoB) {
  out.push('## What each run produced')
  out.push('')
  const finalA = repoA.final || {}
  const finalB = repoB.final || {}
  const rows = [
    ['production files', finalA.productionFiles, finalB.productionFiles],
    ['production lines', finalA.productionLines, finalB.productionLines],
    ['test files', finalA.testFiles, finalB.testFiles],
    ['test lines', finalA.testLines, finalB.testLines],
    ['@Test methods', finalA.testMethods, finalB.testMethods],
    ['spec files', finalA.specFiles, finalB.specFiles],
    ['spec lines', finalA.specLines, finalB.specLines],
    ['ADRs', finalA.adrFiles, finalB.adrFiles],
    ['@Realizes anchors', finalA.realizesAnchors, finalB.realizesAnchors],
    ['@Verifies anchors', finalA.verifiesAnchors, finalB.verifiesAnchors],
    ['commits', repoA.commitCount, repoB.commitCount],
  ]
  out.push(
    table(
      ['artefact', `A · ${repoA.label}`, `B · ${repoB.label}`, 'B vs A'],
      rows.map(([name, a, b]) => [name, n(a), n(b), delta(a, b)])
    )
  )
  out.push('')
  if (repoA.coverage || repoB.coverage) {
    out.push(
      `Line coverage — A: ${repoA.coverage ? repoA.coverage.linePercent.toFixed(1) + '%' : 'not measured'}, ` +
        `B: ${repoB.coverage ? repoB.coverage.linePercent.toFixed(1) + '%' : 'not measured'}.`
    )
    out.push('')
  }

  out.push('## Tokens per unit produced')
  out.push('')
  const perUnit = (run, final, field) => (final[field] ? Math.round(run.totals.totalTokens / final[field]) : null)
  out.push(
    table(
      ['ratio', `A · ${runA.label}`, `B · ${runB.label}`, 'B vs A'],
      [
        ['tokens per production line', perUnit(runA, finalA, 'productionLines'), perUnit(runB, finalB, 'productionLines')],
        ['tokens per test method', perUnit(runA, finalA, 'testMethods'), perUnit(runB, finalB, 'testMethods')],
        ['output tokens per production line', finalA.productionLines ? Math.round(runA.totals.outputTokens / finalA.productionLines) : null, finalB.productionLines ? Math.round(runB.totals.outputTokens / finalB.productionLines) : null],
      ].map(([name, a, b]) => [name, n(a), n(b), delta(a, b)])
    )
  )
  out.push('')
  out.push(
    'Lines produced is a size measure, not a quality one. It says what the tokens bought in bulk, ' +
      'and nothing about whether the result is correct — that is what the suites and the review findings are for.'
  )
  out.push('')
}

const outPath = args.out || join(process.cwd(), 'docs', 'metrics', 'comparison.md')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, out.join('\n') + '\n')
console.log(`wrote ${outPath}`)
