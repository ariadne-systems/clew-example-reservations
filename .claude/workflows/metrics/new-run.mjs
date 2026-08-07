#!/usr/bin/env node
// Prepare one isolated, repeatable run of an experiment arm.
//
// Repeats only mean something if each starts from the same place and cannot see the others. This
// creates a fresh git worktree at a fixed base ref, a branch to hold the run's commits, and a
// results directory in the main repo for the metrics to land in — then prints the exact command
// to launch the run. Nothing about the previous run's tree, branch, or state is visible to it.
//
//   node .claude/workflows/metrics/new-run.mjs --arm <name> [--base <ref>] [--dry-run]
//
// The run index is chosen as the next free one for that arm, so repeated invocations produce
// <arm>-01, <arm>-02, … without the caller tracking a counter.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

function parseArgs(argv) {
  const args = { 'dry-run': false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args['dry-run'] = true
    else if (a.startsWith('--')) args[a.slice(2)] = argv[++i]
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const repoRoot = process.cwd()

if (!args.arm) {
  console.error('usage: new-run.mjs --arm <name> [--base <ref>] [--workflow <name>] [--root <dir>] [--dry-run]')
  process.exit(2)
}

const arm = args.arm
const base = args.base || `${arm}-setup`
const workflow = args.workflow || `reservations-${arm}-full-run`
// Worktrees live beside the repo, not inside it: a worktree under the repo would be swept into
// the very git status, builds and greps the run is being measured on.
const worktreeRoot = resolve(args.root || join(repoRoot, '..', 'clew-experiment-runs'))
const experimentsDir = join(repoRoot, 'experiments', arm)

function git(...cliArgs) {
  return execFileSync('git', cliArgs, { cwd: repoRoot, encoding: 'utf8' }).trim()
}

function nextIndex() {
  if (!existsSync(experimentsDir)) return 1
  const used = readdirSync(experimentsDir)
    .map(name => {
      const m = name.match(new RegExp(`^${arm}-(\\d+)$`))
      return m ? Number(m[1]) : 0
    })
    .filter(Boolean)
  return used.length ? Math.max(...used) + 1 : 1
}

const index = args.index ? Number(args.index) : nextIndex()
const label = `${arm}-${String(index).padStart(2, '0')}`
const branch = `exp/${label}`
const worktree = join(worktreeRoot, label)
const resultsDir = join(experimentsDir, label)

// Resolve the base to a commit now and print it: a moving tag would silently make two runs
// incomparable, and the recorded hash is what proves they were not.
let baseCommit = null
try {
  baseCommit = git('rev-parse', '--short', `${base}^{commit}`)
} catch {
  console.error(`base ref '${base}' does not resolve — pass --base <ref>`)
  process.exit(2)
}

const commands = [
  ['git', 'worktree', 'add', '-b', branch, worktree, baseCommit],
]

console.log(`arm         ${arm}`)
console.log(`label       ${label}`)
console.log(`base        ${base} -> ${baseCommit}`)
console.log(`branch      ${branch}`)
console.log(`worktree    ${worktree}`)
console.log(`results     ${resultsDir}`)
console.log('')

if (args['dry-run']) {
  console.log('dry run — would execute:')
  for (const c of commands) console.log('  ' + c.join(' '))
  console.log(`  mkdir -p ${resultsDir}`)
} else {
  if (existsSync(worktree)) {
    console.error(`worktree ${worktree} already exists — pass --index to pick a different run number`)
    process.exit(2)
  }
  mkdirSync(worktreeRoot, { recursive: true })
  for (const c of commands) execFileSync(c[0], c.slice(1), { cwd: repoRoot, stdio: 'inherit' })
  mkdirSync(resultsDir, { recursive: true })
  console.log('worktree and results directory created.')
}

console.log('')
console.log('Then, with the working directory set to the worktree, launch:')
console.log('')
console.log(
  `  Workflow({ name: "${workflow}", args: ${JSON.stringify({ runLabel: label, resultsDir, baseRev: baseCommit })} })`
)
console.log('')
console.log('When every run is done, aggregate them:')
console.log('')
console.log('  node .claude/workflows/metrics/aggregate-runs.mjs --dir experiments')
