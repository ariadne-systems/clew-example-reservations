#!/usr/bin/env node
// Repo-metrics collector.
//
// The transcript tells you what a run SPENT; this tells you what it PRODUCED. Both halves are
// needed to compare two methods: tokens per increment mean nothing without the size and shape
// of the artefact they bought.
//
// Everything here is read out of git, so it is reproducible from the repository alone and can
// be re-run against any branch — including one that built the same work a different way.
//
//   node .claude/workflows/metrics/collect-repo-metrics.mjs \
//     [--label <runLabel>] [--rev <startRev>] [--head <endRev>] [--out <jsonPath>] [--md <mdPath>]
//
// Increments are recognised by the "(STR-N)" / "(STR-N ...)" marker every increment commit
// subject carries; commits that carry none are grouped under "unassigned".

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const repoRoot = process.cwd()

function git(...cliArgs) {
  return execFileSync('git', cliArgs, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
}

function gitOrEmpty(...cliArgs) {
  try {
    return git(...cliArgs)
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------------------------
// path classes — the axis that separates "wrote a spec" from "wrote code"
// ---------------------------------------------------------------------------------------------

const PATH_CLASSES = [
  ['spec', /^docs\/spec\/(specs|stories|drafts)\//],
  ['adr', /^docs\/spec\/adr\//],
  ['spec-scaffold', /^docs\/spec\//],
  ['production', /^src\/main\/.*\.java$/],
  ['generated', /^src\/main\/java\/clew\/traceables\//],
  ['test', /^src\/test\//],
  ['governance', /^(\.claude\/|CLAUDE\.md)/],
  ['build', /^(pom\.xml|package\.json|pnpm-lock\.yaml|\.clewrc\.json|mvnw|mvnw\.cmd|\.mvn\/)/],
  ['docs', /^docs\//],
]

function classOf(path) {
  // Generated traceables live under src/main but nobody wrote them; check that first.
  if (/^src\/main\/java\/clew\/traceables\//.test(path)) return 'generated'
  for (const [name, re] of PATH_CLASSES) {
    if (name === 'generated') continue
    if (re.test(path)) return name
  }
  return 'other'
}

// ---------------------------------------------------------------------------------------------
// commits
// ---------------------------------------------------------------------------------------------

const head = args.head || 'HEAD'

// Without an explicit start the range is the run itself: everything from the parent of the
// earliest increment commit reachable from head. Anchoring on a tag instead would silently
// measure the wrong lineage whenever a run was built on a different base than the tag.
function autoStartRev() {
  const all = gitOrEmpty('log', '--reverse', '--format=%H%x1f%s', head).split('\n').filter(Boolean)
  const first = all.find(line => /\(str-\d/i.test(line.split('\x1f')[1] || ''))
  if (!first) return null
  const hash = first.split('\x1f')[0]
  const parent = gitOrEmpty('rev-parse', '--verify', '--quiet', `${hash}^`).trim()
  return parent || null
}

const startRev = args.rev || autoStartRev()
const range = startRev ? `${startRev}..${head}` : head

const log = gitOrEmpty('log', '--reverse', '--format=%H%x1f%s%x1f%aI', range)
  .split('\n')
  .filter(Boolean)
  .map(line => {
    const [hash, subject, date] = line.split('\x1f')
    return { hash, short: hash.slice(0, 7), subject, date }
  })

// Case-insensitive so the demo's own `demo(str-6): ...` reveal commit is charged to the
// increment it belongs to rather than drifting into an out-of-order "unassigned" group.
function incrementOf(subject) {
  const m = subject.match(/\(str-(\d+)/i)
  return m ? `STR-${m[1]}` : 'unassigned'
}

function commitKind(subject) {
  if (/^docs: draft|^chore: scaffold/.test(subject)) return 'draft'
  if (/^feat:/.test(subject)) return 'implement'
  if (/^fix: anchoring review/.test(subject)) return 'review-fix'
  if (/^chore: close increment/.test(subject)) return 'close'
  return 'other'
}

for (const commit of log) {
  commit.increment = incrementOf(commit.subject)
  commit.kind = commitKind(commit.subject)
  commit.byClass = {}
  commit.filesChanged = 0
  commit.insertions = 0
  commit.deletions = 0

  const numstat = gitOrEmpty('show', '--numstat', '--format=', '-m', '--first-parent', commit.hash)
  for (const line of numstat.split('\n')) {
    if (!line.trim()) continue
    const [addedRaw, removedRaw, path] = line.split('\t')
    if (!path) continue
    // Binary files report "-"; they carry no line count to attribute.
    const added = addedRaw === '-' ? 0 : Number(addedRaw)
    const removed = removedRaw === '-' ? 0 : Number(removedRaw)
    const cls = classOf(path.replace(/\\/g, '/'))
    if (!commit.byClass[cls]) commit.byClass[cls] = { files: 0, insertions: 0, deletions: 0 }
    commit.byClass[cls].files += 1
    commit.byClass[cls].insertions += added
    commit.byClass[cls].deletions += removed
    commit.filesChanged += 1
    commit.insertions += added
    commit.deletions += removed
  }
}

// ---------------------------------------------------------------------------------------------
// snapshots — the state of the tree at the end of each increment
// ---------------------------------------------------------------------------------------------

const ANCHOR_RE = /@(Realizes|Verifies|Concerns)\w*\s*\(/g

function snapshotAt(rev) {
  const files = gitOrEmpty('ls-tree', '-r', '--name-only', rev)
    .split('\n')
    .map(f => f.trim().replace(/\\/g, '/'))
    .filter(Boolean)

  const snapshot = {
    productionFiles: 0,
    productionLines: 0,
    testFiles: 0,
    testLines: 0,
    generatedFiles: 0,
    generatedLines: 0,
    specFiles: 0,
    specLines: 0,
    adrFiles: 0,
    testMethods: 0,
    realizesAnchors: 0,
    verifiesAnchors: 0,
    concernsAnchors: 0,
  }

  for (const path of files) {
    const cls = classOf(path)
    const interesting =
      cls === 'production' || cls === 'test' || cls === 'generated' || cls === 'spec' || cls === 'adr'
    if (!interesting) continue
    if (cls === 'test' && !/\.java$/.test(path)) continue

    const content = gitOrEmpty('show', `${rev}:${path}`)
    const lines = content ? content.split('\n').length : 0

    if (cls === 'production') {
      snapshot.productionFiles += 1
      snapshot.productionLines += lines
    } else if (cls === 'generated') {
      snapshot.generatedFiles += 1
      snapshot.generatedLines += lines
    } else if (cls === 'test') {
      snapshot.testFiles += 1
      snapshot.testLines += lines
      snapshot.testMethods += (content.match(/@Test\b/g) || []).length
    } else if (cls === 'spec') {
      snapshot.specFiles += 1
      snapshot.specLines += lines
    } else if (cls === 'adr') {
      snapshot.adrFiles += 1
    }

    if (cls === 'production' || cls === 'test') {
      for (const match of content.match(ANCHOR_RE) || []) {
        if (/Realizes/.test(match)) snapshot.realizesAnchors += 1
        else if (/Verifies/.test(match)) snapshot.verifiesAnchors += 1
        else snapshot.concernsAnchors += 1
      }
    }
  }
  return snapshot
}

// ---------------------------------------------------------------------------------------------
// per increment
// ---------------------------------------------------------------------------------------------

const order = []
const byIncrement = new Map()
for (const commit of log) {
  if (!byIncrement.has(commit.increment)) {
    byIncrement.set(commit.increment, [])
    order.push(commit.increment)
  }
  byIncrement.get(commit.increment).push(commit)
}

const increments = order.map(name => {
  const commits = byIncrement.get(name)
  const last = commits[commits.length - 1]
  const byClass = {}
  const byKind = {}
  for (const commit of commits) {
    for (const [cls, stat] of Object.entries(commit.byClass)) {
      if (!byClass[cls]) byClass[cls] = { files: 0, insertions: 0, deletions: 0 }
      byClass[cls].files += stat.files
      byClass[cls].insertions += stat.insertions
      byClass[cls].deletions += stat.deletions
    }
    if (!byKind[commit.kind]) byKind[commit.kind] = { commits: 0, insertions: 0, deletions: 0 }
    byKind[commit.kind].commits += 1
    byKind[commit.kind].insertions += commit.insertions
    byKind[commit.kind].deletions += commit.deletions
  }
  return {
    increment: name,
    commits: commits.map(c => ({
      short: c.short,
      subject: c.subject,
      date: c.date,
      kind: c.kind,
      filesChanged: c.filesChanged,
      insertions: c.insertions,
      deletions: c.deletions,
      byClass: c.byClass,
    })),
    commitCount: commits.length,
    firstCommitAt: commits[0].date,
    lastCommitAt: last.date,
    insertions: commits.reduce((n, c) => n + c.insertions, 0),
    deletions: commits.reduce((n, c) => n + c.deletions, 0),
    byClass,
    byKind,
    snapshot: snapshotAt(last.hash),
  }
})

// Coverage is the one number git cannot answer; take it from the last JaCoCo report on disk if
// the build has been run, and say so plainly when it has not.
function jacocoCoverage() {
  const csv = join(repoRoot, 'target', 'site', 'jacoco', 'jacoco.csv')
  if (!existsSync(csv)) return null
  const rows = readFileSync(csv, 'utf8').split('\n').slice(1).filter(Boolean)
  let missed = 0
  let covered = 0
  for (const row of rows) {
    const cells = row.split(',')
    missed += Number(cells[7] || 0)
    covered += Number(cells[8] || 0)
  }
  const total = missed + covered
  return total ? { linesMissed: missed, linesCovered: covered, linePercent: (covered / total) * 100 } : null
}

const repo = {
  label: args.label || 'run',
  collectedAt: new Date().toISOString(),
  repoRoot,
  range,
  head: gitOrEmpty('rev-parse', '--short', head).trim(),
  branch: gitOrEmpty('rev-parse', '--abbrev-ref', 'HEAD').trim(),
  commitCount: log.length,
  increments,
  final: increments.length ? increments[increments.length - 1].snapshot : null,
  coverage: jacocoCoverage(),
}

// ---------------------------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------------------------

const n = v => (v == null ? '' : Number(v).toLocaleString('en-US'))
const cls = (byClass, name, field) => n((byClass[name] || {})[field] || 0)

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ].join('\n')
}

function renderMarkdown(data) {
  const out = []
  out.push(`# Repo metrics — ${data.label}`)
  out.push('')
  out.push(`Branch \`${data.branch}\` at \`${data.head}\`, ${data.commitCount} commits over ${data.increments.length} increments.`)
  out.push('')

  out.push('## Lines written per increment, by what they are')
  out.push('')
  out.push(
    table(
      ['increment', 'commits', 'spec +', 'adr +', 'production +', 'test +', 'build/gov +', 'generated +', 'total +', 'total −'],
      data.increments.map(inc => [
        inc.increment,
        n(inc.commitCount),
        cls(inc.byClass, 'spec', 'insertions'),
        cls(inc.byClass, 'adr', 'insertions'),
        cls(inc.byClass, 'production', 'insertions'),
        cls(inc.byClass, 'test', 'insertions'),
        n(
          (inc.byClass.build ? inc.byClass.build.insertions : 0) +
            (inc.byClass.governance ? inc.byClass.governance.insertions : 0)
        ),
        cls(inc.byClass, 'generated', 'insertions'),
        n(inc.insertions),
        n(inc.deletions),
      ])
    )
  )
  out.push('')
  out.push('`generated` is the clew traceables — emitted by the tool, not written by an agent, and excluded from any hand-written total.')
  out.push('')

  out.push('## State of the tree at the end of each increment')
  out.push('')
  out.push(
    table(
      ['increment', 'prod files', 'prod lines', 'test files', 'test lines', '@Test', 'spec files', 'spec lines', 'ADRs', '@Realizes', '@Verifies'],
      data.increments.map(inc => {
        const s = inc.snapshot
        return [
          inc.increment,
          n(s.productionFiles),
          n(s.productionLines),
          n(s.testFiles),
          n(s.testLines),
          n(s.testMethods),
          n(s.specFiles),
          n(s.specLines),
          n(s.adrFiles),
          n(s.realizesAnchors),
          n(s.verifiesAnchors),
        ]
      })
    )
  )
  out.push('')

  out.push('## Commits')
  out.push('')
  out.push(
    table(
      ['increment', 'commit', 'kind', 'subject', 'files', '+', '−'],
      data.increments.flatMap(inc =>
        inc.commits.map(c => [inc.increment, c.short, c.kind, c.subject, n(c.filesChanged), n(c.insertions), n(c.deletions)])
      )
    )
  )
  out.push('')

  if (data.coverage) {
    out.push('## Coverage')
    out.push('')
    out.push(
      `JaCoCo line coverage at the last local build: **${data.coverage.linePercent.toFixed(1)}%** ` +
        `(${n(data.coverage.linesCovered)} covered / ${n(data.coverage.linesMissed + data.coverage.linesCovered)} total).`
    )
    out.push('')
  } else {
    out.push('## Coverage')
    out.push('')
    out.push('No JaCoCo report on disk — run `mvn -B verify` before collecting if the coverage figure is wanted.')
    out.push('')
  }
  return out.join('\n')
}

const jsonPath = args.out || join(repoRoot, 'docs', 'metrics', `repo-metrics-${repo.label}.json`)
const mdPath = args.md || join(repoRoot, 'docs', 'metrics', `repo-metrics-${repo.label}.md`)
for (const p of [jsonPath, mdPath]) mkdirSync(dirname(p), { recursive: true })
writeFileSync(jsonPath, JSON.stringify(repo, null, 2))
writeFileSync(mdPath, renderMarkdown(repo) + '\n')

console.log(`commits: ${repo.commitCount}  increments: ${repo.increments.length}`)
console.log(`wrote ${jsonPath}`)
console.log(`wrote ${mdPath}`)
