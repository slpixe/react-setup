import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { PACKAGE_VERSIONS } from './constants.js'
import {
  exampleE2eTest,
  FRESH_FILES,
  patchViteConfig,
  playwrightConfig,
  playwrightFixture,
  testSetup,
  viteConfig,
  vitestConfig,
} from './templates.js'

const VITE_CONFIG_NAMES = [
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mts',
  'vite.config.mjs',
  'vite.config.cts',
  'vite.config.cjs',
]

function projectName(target) {
  return basename(target)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'react-app'
}

function addChange(changes, target, path, content, options = {}) {
  const absolutePath = join(target, path)
  if (existsSync(absolutePath) && !options.overwrite) return false
  changes.push({ path, content, action: existsSync(absolutePath) ? 'update' : 'create' })
  return true
}

function reactTarget(analysis) {
  const version = analysis.packageJson?.dependencies?.react
    ?? analysis.packageJson?.devDependencies?.react
    ?? analysis.packageJson?.peerDependencies?.react
  const match = typeof version === 'string' && version.match(/(?:^|\D)(\d{2})(?:\D|$)/)
  if (!match) return undefined
  const major = Number(match[1])
  if (major < 17) throw new Error(`React Compiler supports React 17 and newer; detected React ${major}.`)
  return major < 19 ? String(major) : undefined
}

function mergedPackageJson(analysis, domEnvironment, compilerTarget) {
  const original = analysis.packageJson ?? {
    name: projectName(analysis.target),
    private: true,
    version: '0.0.0',
    type: 'module',
  }
  const result = structuredClone(original)
  const scripts = {
    dev: 'vite',
    build: 'tsc -b && vite build',
    preview: 'vite preview',
    test: 'vitest run',
    'test:watch': 'vitest',
    e2e: 'playwright test',
    'e2e:ui': 'playwright test --ui',
  }

  result.scripts = { ...scripts, ...result.scripts }
  result.dependencies = { ...PACKAGE_VERSIONS.dependencies, ...result.dependencies }
  if (compilerTarget) result.dependencies['react-compiler-runtime'] ??= '^1.0.0'
  result.devDependencies = {
    ...PACKAGE_VERSIONS.devDependencies,
    [domEnvironment]: domEnvironment === 'jsdom' ? '^30.1.0' : '^20.14.5',
    ...result.devDependencies,
  }

  return `${JSON.stringify(result, null, 2)}\n`
}

function findViteConfig(target) {
  return VITE_CONFIG_NAMES.find((file) => existsSync(join(target, file)))
}

export function planSetup(analysis, options) {
  const {
    packageManager,
    domEnvironment = 'jsdom',
    browsers = ['desktop', 'mobile'],
    force = false,
  } = options
  const changes = []
  const warnings = []
  const compilerTarget = reactTarget(analysis)

  if (analysis.kind === 'existing' && !force) {
    throw new Error(
      'This directory contains an existing non-React project. Inspect it first, then rerun with --force to add React without overwriting existing source files.',
    )
  }

  addChange(
    changes,
    analysis.target,
    'package.json',
    mergedPackageJson(analysis, domEnvironment, compilerTarget),
    { overwrite: true },
  )

  const existingViteConfig = findViteConfig(analysis.target)
  if (existingViteConfig) {
    const original = readFileSync(join(analysis.target, existingViteConfig), 'utf8')
    const patched = patchViteConfig(original, compilerTarget)
    if (patched.changed) {
      addChange(changes, analysis.target, existingViteConfig, patched.content, { overwrite: true })
    } else if (patched.reason) {
      warnings.push(`${existingViteConfig}: ${patched.reason}; React Compiler was not injected.`)
    }
  } else {
    addChange(changes, analysis.target, 'vite.config.ts', viteConfig(compilerTarget))
  }

  if (!addChange(
    changes,
    analysis.target,
    'vitest.config.ts',
    vitestConfig(existingViteConfig ?? 'vite.config.ts').replace('__DOM_ENVIRONMENT__', domEnvironment),
  )) {
    warnings.push('vitest.config.ts already exists and was preserved; verify its environment and setupFiles.')
  }

  addChange(changes, analysis.target, 'src/test/setup.ts', testSetup())

  if (!addChange(changes, analysis.target, 'playwright.config.ts', playwrightConfig(packageManager, browsers))) {
    warnings.push('playwright.config.ts already exists and was preserved; verify its desktop/mobile projects and webServer.')
  }
  addChange(changes, analysis.target, 'e2e/test.ts', playwrightFixture())
  addChange(changes, analysis.target, 'e2e/app.spec.ts', exampleE2eTest())

  if (analysis.kind === 'new' || analysis.kind === 'existing') {
    for (const [path, content] of Object.entries(FRESH_FILES)) {
      if (!addChange(changes, analysis.target, path, content)) {
        warnings.push(`${path} already exists and was preserved.`)
      }
    }
  }

  return { changes, warnings }
}
