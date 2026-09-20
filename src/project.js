import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage'])
const REACT_EXTENSIONS = new Set(['.jsx', '.tsx'])

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot parse ${path}: ${error.message}`)
  }
}

function collectFiles(directory, limit = 300) {
  const files = []
  const pending = [{ directory, depth: 0 }]

  while (pending.length > 0 && files.length < limit) {
    const current = pending.shift()
    let entries = []
    try {
      entries = readdirSync(current.directory, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (files.length >= limit) break
      if (entry.isDirectory()) {
        if (current.depth < 3 && !IGNORED_DIRECTORIES.has(entry.name)) {
          pending.push({ directory: join(current.directory, entry.name), depth: current.depth + 1 })
        }
      } else {
        files.push(join(current.directory, entry.name))
      }
    }
  }

  return files
}

export function analyzeProject(directory) {
  const target = resolve(directory)
  const packagePath = join(target, 'package.json')
  const packageJson = existsSync(packagePath) ? readJson(packagePath) : undefined
  const dependencies = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies,
    ...packageJson?.peerDependencies,
  }
  const files = existsSync(target) ? collectFiles(target) : []
  const relativeFiles = files.map((file) => relative(target, file))
  const hasReactDependency = Boolean(dependencies.react || dependencies['react-dom'])
  const hasReactFiles = files.some((file) => REACT_EXTENSIONS.has(extname(file)))
  const hasVite = Boolean(dependencies.vite) || relativeFiles.some((file) => /^vite\.config\.[cm]?[jt]s$/.test(file))
  const meaningfulFiles = relativeFiles.filter((file) => !['.DS_Store'].includes(file) && !file.startsWith('.git/'))

  let kind = 'existing'
  if (!packageJson && meaningfulFiles.length === 0) kind = 'new'
  else if (hasReactDependency || hasReactFiles) kind = 'react'

  return {
    target,
    kind,
    packageJson,
    hasReactDependency,
    hasReactFiles,
    hasVite,
    files: relativeFiles,
  }
}
