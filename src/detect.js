import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, parse, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { LOCKFILES, PACKAGE_MANAGERS } from './constants.js'

function packageManagerFromField(value) {
  const match = typeof value === 'string' && value.match(/^(npm|pnpm|yarn|bun)@/)
  return match?.[1]
}

function packageManagerFromUserAgent(value) {
  const match = typeof value === 'string' && value.match(/^(npm|pnpm|yarn|bun)\//)
  return match?.[1]
}

function readPackageJson(directory) {
  try {
    return JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
  } catch {
    return undefined
  }
}

function ancestors(start) {
  const result = []
  let current = resolve(start)
  const root = parse(current).root

  while (true) {
    result.push(current)
    if (current === root) break
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  return result
}

export function detectRuntime(versions = process.versions) {
  if (versions?.bun) return { name: 'bun', version: versions.bun }
  return { name: 'node', version: versions?.node ?? 'unknown' }
}

export function detectPackageManager(directory, options = {}) {
  const explicit = options.explicit
  if (explicit) {
    if (!PACKAGE_MANAGERS.includes(explicit)) {
      throw new Error(`Unsupported package manager: ${explicit}`)
    }
    return { name: explicit, source: '--pm' }
  }

  for (const current of ancestors(directory)) {
    const packageJson = readPackageJson(current)
    const fromField = packageManagerFromField(packageJson?.packageManager)
    if (fromField) return { name: fromField, source: join(current, 'package.json') }

    const matches = LOCKFILES.filter(([, file]) => existsSync(join(current, file)))
    if (matches.length > 0) {
      return {
        name: matches[0][0],
        source: join(current, matches[0][1]),
        ambiguous: matches.length > 1 ? matches.map(([, file]) => join(current, file)) : [],
      }
    }

    if (existsSync(join(current, '.git')) && current !== resolve(directory)) break
  }

  const fromUserAgent = packageManagerFromUserAgent(options.userAgent ?? process.env.npm_config_user_agent)
  if (fromUserAgent) return { name: fromUserAgent, source: 'npm_config_user_agent' }

  return { name: detectRuntime(options.versions).name === 'bun' ? 'bun' : 'npm', source: 'runtime default' }
}

export function executableVersion(name) {
  const result = spawnSync(name, ['--version'], { encoding: 'utf8' })
  if (result.error || result.status !== 0) return undefined
  return result.stdout.trim()
}

export function installCommand(packageManager) {
  if (packageManager === 'pnpm') {
    return ['pnpm', 'install', '--config.confirmModulesPurge=false']
  }
  return [packageManager, 'install']
}

export function browserInstallCommand(packageManager, targets = ['desktop', 'mobile']) {
  const browsers = [
    ...(targets.includes('desktop') ? ['chromium'] : []),
    ...(targets.includes('mobile') ? ['webkit'] : []),
  ]
  if (packageManager === 'pnpm') return ['pnpm', 'exec', 'playwright', 'install', ...browsers]
  if (packageManager === 'yarn') return ['yarn', 'exec', 'playwright', 'install', ...browsers]
  if (packageManager === 'bun') return ['bunx', 'playwright', 'install', ...browsers]
  return ['npm', 'exec', '--', 'playwright', 'install', ...browsers]
}
