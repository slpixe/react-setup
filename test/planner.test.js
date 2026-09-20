import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { applyPlan } from '../src/apply.js'
import { planSetup } from '../src/planner.js'
import { analyzeProject } from '../src/project.js'
import { patchViteConfig } from '../src/templates.js'

async function sandbox(run) {
  const directory = await mkdtemp(join(tmpdir(), 'react-setup-plan-'))
  try {
    await run(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('plans a complete new project with a chosen DOM and package manager', async () => sandbox(async (directory) => {
  const plan = planSetup(analyzeProject(directory), {
    packageManager: 'pnpm',
    domEnvironment: 'happy-dom',
  })
  const paths = plan.changes.map((change) => change.path)
  assert.ok(paths.includes('vite.config.ts'))
  assert.ok(paths.includes('vitest.config.ts'))
  assert.ok(paths.includes('playwright.config.ts'))
  assert.ok(paths.includes('e2e/test.ts'))
  assert.ok(paths.includes('src/App.tsx'))

  await applyPlan(directory, plan)
  const packageJson = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
  assert.equal(packageJson.devDependencies['happy-dom'], '^20.14.5')
  assert.equal(packageJson.devDependencies.jsdom, undefined)
  assert.match(readFileSync(join(directory, 'playwright.config.ts'), 'utf8'), /pnpm run dev/)
  assert.match(readFileSync(join(directory, 'vitest.config.ts'), 'utf8'), /exclude: \['e2e\/\*\*'/)
  assert.match(readFileSync(join(directory, 'tsconfig.app.json'), 'utf8'), /vite\/client/)
}))

test('preserves dependency versions and existing source in a React project', async () => sandbox(async (directory) => {
  mkdirSync(join(directory, 'src'))
  writeFileSync(join(directory, 'src', 'App.tsx'), 'export const App = () => <p>mine</p>\n')
  writeFileSync(join(directory, 'package.json'), JSON.stringify({
    scripts: { test: 'custom-test' },
    dependencies: { react: '^18.3.0' },
  }))

  const plan = planSetup(analyzeProject(directory), { packageManager: 'npm', domEnvironment: 'jsdom' })
  assert.equal(plan.changes.some((change) => change.path === 'src/App.tsx'), false)
  const nextPackage = JSON.parse(plan.changes.find((change) => change.path === 'package.json').content)
  assert.equal(nextPackage.dependencies.react, '^18.3.0')
  assert.equal(nextPackage.dependencies['react-compiler-runtime'], '^1.0.0')
  assert.equal(nextPackage.scripts.test, 'custom-test')
  const vite = plan.changes.find((change) => change.path === 'vite.config.ts').content
  assert.match(vite, /target: '18'/)
}))

test('requires force for a populated non-React project', async () => sandbox(async (directory) => {
  writeFileSync(join(directory, 'README.md'), '# Existing')
  assert.throws(
    () => planSetup(analyzeProject(directory), { packageManager: 'npm' }),
    /--force/,
  )
}))

test('patches a standard Vite React config idempotently', () => {
  const source = `import react from '@vitejs/plugin-react'\nimport { defineConfig } from 'vite'\nexport default defineConfig({ plugins: [react()] })\n`
  const first = patchViteConfig(source)
  assert.equal(first.changed, true)
  assert.match(first.content, /reactCompilerPreset/)
  assert.match(first.content, /@rolldown\/plugin-babel/)
  assert.ok(first.content.indexOf('react()') < first.content.indexOf('babel({'))
  assert.equal(patchViteConfig(first.content).changed, false)
})

test('adds the React 17 compiler target to an existing compiler config', () => {
  const source = `const config = reactCompilerPreset()\n`
  const result = patchViteConfig(source, '17')
  assert.equal(result.changed, true)
  assert.match(result.content, /target: '17'/)
})

test('emits only selected Playwright projects', async () => sandbox(async (directory) => {
  const plan = planSetup(analyzeProject(directory), {
    packageManager: 'npm',
    domEnvironment: 'jsdom',
    browsers: ['mobile'],
  })
  const config = plan.changes.find((change) => change.path === 'playwright.config.ts').content
  assert.doesNotMatch(config, /Desktop Chrome/)
  assert.match(config, /iPhone 15/)
}))
