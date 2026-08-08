#!/usr/bin/env node
// Promote a finished run to its checkpoint tags.
//
// After a run, the branch holds every increment up to the redesign. Publishing it means moving
// four refs, and the ORDER matters: the branch has to be rewound to the story-5 commit, but the
// story-6 commits above it must be tagged first or they become unreachable the moment it moves.
// That is the whole reason this exists rather than four hand-typed commands.
//
//   node .claude/workflows/promote-run.mjs [--arm cas-dd|baseline]      # show the plan
//   node .claude/workflows/promote-run.mjs [--arm cas-dd|baseline] --apply
//
// Prints what it found and changes nothing unless --apply is given.

import { execFileSync } from 'node:child_process'

const args = {}
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (a === '--apply') args.apply = true
  else if (a.startsWith('--')) args[a.slice(2)] = process.argv[++i]
}

const ARMS = {
  'cas-dd': {
    base: 'initial-setup',
    branch: 'main',
    tags: { tip: 'full-run', reveal: 'str6-requirement', story5: 'single-item-complete' },
  },
  baseline: {
    base: 'baseline-setup',
    branch: 'baseline-main',
    tags: { tip: 'baseline-full-run', reveal: 'baseline-str6-requirement', story5: 'baseline-single-item-complete' },
  },
}

const armName = args.arm || 'cas-dd'
const arm = ARMS[armName]
if (!arm) {
  console.error(`unknown arm '${armName}' — expected one of: ${Object.keys(ARMS).join(', ')}`)
  process.exit(2)
}

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim()
const gitOk = (...a) => {
  try {
    git(...a)
    return true
  } catch {
    return false
  }
}

// --- preconditions -----------------------------------------------------------------------------

if (!gitOk('rev-parse', '--verify', '--quiet', arm.base)) {
  console.error(`base ref '${arm.base}' does not exist — is this the right arm?`)
  process.exit(2)
}

const head = git('rev-parse', 'HEAD')
const branch = gitOk('symbolic-ref', '-q', '--short', 'HEAD') ? git('symbolic-ref', '-q', '--short', 'HEAD') : null

if (branch !== arm.branch) {
  console.error(`HEAD is on '${branch ?? 'a detached commit'}', expected '${arm.branch}'.`)
  console.error(`Check out ${arm.branch} at the finished run's tip first.`)
  process.exit(2)
}
if (git('status', '--porcelain', '--untracked-files=no')) {
  console.error('working tree has uncommitted changes — commit or stash them first.')
  process.exit(2)
}
if (!gitOk('merge-base', '--is-ancestor', arm.base, head)) {
  console.error(`'${arm.base}' is not an ancestor of HEAD — this branch did not start from it.`)
  process.exit(2)
}

// --- locate the commits ------------------------------------------------------------------------

const log = git('log', '--format=%H%x1f%s', `${arm.base}..HEAD`)
  .split('\n')
  .filter(Boolean)
  .map(l => {
    const [hash, subject] = l.split('\x1f')
    return { hash, subject }
  })

if (!log.length) {
  console.error(`no commits between ${arm.base} and HEAD — has the run happened yet?`)
  process.exit(2)
}

const findOne = (label, re) => {
  const hits = log.filter(c => re.test(c.subject))
  if (hits.length > 1) {
    console.error(`ambiguous: ${hits.length} commits match ${label}:`)
    for (const h of hits) console.error(`  ${h.hash.slice(0, 8)} ${h.subject}`)
    process.exit(2)
  }
  return hits[0] || null
}

const tip = { hash: head, subject: log[0].subject }
const reveal = findOne('the STR-6 reveal', /reveal the multi-item redesign requirement/i)
const story5 = findOne('the story-5 close', /story done \(STR-5/i)

if (!story5) {
  console.error('could not find the story-5 close commit — the run may not have got that far.')
  console.error('Nothing changed. Inspect the branch and tag by hand if the run ended early.')
  process.exit(2)
}

// --- plan --------------------------------------------------------------------------------------

const short = h => h.slice(0, 7)
const plan = [
  [arm.tags.tip, tip, 'the run tip — tagged FIRST so rewinding the branch cannot orphan it'],
  reveal ? [arm.tags.reveal, reveal, 'the redesign requirement, cherry-picked into this run'] : null,
  [arm.tags.story5, story5, 'the finished single-item system'],
].filter(Boolean)

console.log(`arm      ${armName}`)
console.log(`branch   ${arm.branch}`)
console.log(`base     ${arm.base} (${short(git('rev-parse', arm.base))})`)
console.log(`commits  ${log.length} on top of the base`)
console.log('')
for (const [tag, commit, why] of plan) {
  const before = gitOk('rev-parse', '--verify', '--quiet', tag) ? short(git('rev-parse', tag)) : '(new)'
  console.log(`  tag ${tag.padEnd(28)} ${before} -> ${short(commit.hash)}   ${commit.subject}`)
  console.log(`      ${why}`)
}
console.log('')
console.log(`  reset ${arm.branch} to ${short(story5.hash)} — the branch ends at story 5 so a reader can build story 6`)
if (!reveal) {
  console.log('')
  console.log('  NOTE: no STR-6 reveal commit found; that tag is left untouched.')
}

if (!args.apply) {
  console.log('')
  console.log('Dry run — nothing changed. Re-run with --apply to carry this out.')
  process.exit(0)
}

// --- apply -------------------------------------------------------------------------------------

for (const [tag, commit] of plan) git('tag', '-f', tag, commit.hash)
git('reset', '--hard', story5.hash)

console.log('')
console.log('Applied. Now push:')
console.log(`  git push --force-with-lease origin ${arm.branch}`)
console.log(`  git push --force origin ${plan.map(p => p[0]).join(' ')}`)
