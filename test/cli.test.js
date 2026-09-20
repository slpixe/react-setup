import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { parseArgs } from '../src/cli.js'

test('parses an explicit setup', () => {
  assert.deepEqual(parseArgs([
    'app', '--pm=pnpm', '--dom', 'happy-dom', '--browsers=desktop', '--yes', '--skip-browsers', '--force',
  ]), {
    target: 'app',
    domEnvironment: 'happy-dom',
    browsers: ['desktop'],
    dryRun: false,
    yes: true,
    skipInstall: false,
    skipBrowsers: true,
    force: true,
    packageManager: 'pnpm',
  })
})

test('rejects unsupported DOM environments and unknown flags', () => {
  assert.throws(() => parseArgs(['--dom=browser']), /jsdom or happy-dom/)
  assert.throws(() => parseArgs(['--browsers=firefox']), /desktop, mobile/)
  assert.throws(() => parseArgs(['--wat']), /Unknown option/)
})

test('dry-run on a missing target makes no directory', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'react-setup-cli-'))
  const target = join(parent, 'new-app')
  try {
    const result = spawnSync(process.execPath, [
      new URL('../bin/react-setup.js', import.meta.url).pathname,
      target,
      '--dry-run',
      '--pm=npm',
    ], { encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Project:\s+new/)
    assert.equal(existsSync(target), false)
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})
