import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { browserInstallCommand, detectPackageManager, detectRuntime, installCommand } from '../src/detect.js'

async function sandbox(run) {
  const directory = await mkdtemp(join(tmpdir(), 'react-setup-detect-'))
  try {
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('detects Bun and Node runtimes', () => {
  assert.deepEqual(detectRuntime({ node: '24.0.0' }), { name: 'node', version: '24.0.0' })
  assert.deepEqual(detectRuntime({ node: '24.0.0', bun: '1.3.0' }), { name: 'bun', version: '1.3.0' })
})

test('explicit package manager wins', async () => sandbox(async (directory) => {
  writeFileSync(join(directory, 'package-lock.json'), '{}')
  assert.deepEqual(detectPackageManager(directory, { explicit: 'pnpm' }), { name: 'pnpm', source: '--pm' })
}))

test('packageManager field wins over lockfiles', async () => sandbox(async (directory) => {
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ packageManager: 'yarn@4.9.0' }))
  writeFileSync(join(directory, 'pnpm-lock.yaml'), '')
  assert.equal(detectPackageManager(directory).name, 'yarn')
}))

test('finds the nearest workspace lockfile', async () => sandbox(async (directory) => {
  const child = join(directory, 'packages', 'app')
  mkdirSync(child, { recursive: true })
  writeFileSync(join(directory, 'pnpm-lock.yaml'), '')
  const result = detectPackageManager(child)
  assert.equal(result.name, 'pnpm')
  assert.equal(result.source, join(directory, 'pnpm-lock.yaml'))
}))

test('reports multiple lockfiles', async () => sandbox(async (directory) => {
  writeFileSync(join(directory, 'pnpm-lock.yaml'), '')
  writeFileSync(join(directory, 'yarn.lock'), '')
  const result = detectPackageManager(directory)
  assert.equal(result.name, 'pnpm')
  assert.equal(result.ambiguous.length, 2)
}))

test('installs only browsers selected by the user', () => {
  assert.deepEqual(
    browserInstallCommand('pnpm', ['desktop']),
    ['pnpm', 'exec', 'playwright', 'install', 'chromium'],
  )
  assert.deepEqual(
    browserInstallCommand('bun', ['mobile']),
    ['bunx', 'playwright', 'install', 'webkit'],
  )
})

test('allows pnpm installs to replace node_modules without a TTY', () => {
  assert.deepEqual(
    installCommand('pnpm'),
    ['pnpm', 'install', '--config.confirmModulesPurge=false'],
  )
  assert.deepEqual(installCommand('npm'), ['npm', 'install'])
})
