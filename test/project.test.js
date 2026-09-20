import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { analyzeProject } from '../src/project.js'

async function sandbox(run) {
  const directory = await mkdtemp(join(tmpdir(), 'react-setup-project-'))
  try {
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('classifies an empty directory as new', async () => sandbox(async (directory) => {
  assert.equal(analyzeProject(directory).kind, 'new')
}))

test('classifies React from dependencies', async () => sandbox(async (directory) => {
  writeFileSync(join(directory, 'package.json'), JSON.stringify({ dependencies: { react: '^19.0.0' } }))
  const result = analyzeProject(directory)
  assert.equal(result.kind, 'react')
  assert.equal(result.hasReactDependency, true)
}))

test('classifies React from TSX files', async () => sandbox(async (directory) => {
  mkdirSync(join(directory, 'src'))
  writeFileSync(join(directory, 'src', 'App.tsx'), 'export function App() {}')
  assert.equal(analyzeProject(directory).kind, 'react')
}))

test('classifies a populated non-React directory as existing', async () => sandbox(async (directory) => {
  writeFileSync(join(directory, 'README.md'), '# Existing')
  assert.equal(analyzeProject(directory).kind, 'existing')
}))
