import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { planSetup } from '../src/planner.js'
import { analyzeProject } from '../src/project.js'

const repositoryRoot = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))

test('the standalone template matches the default fresh-project plan', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'react-setup-template-'))
  try {
    const plan = planSetup(analyzeProject(directory), {
      packageManager: 'npm',
      domEnvironment: 'jsdom',
    })

    for (const change of plan.changes) {
      const templateContent = readFileSync(join(repositoryRoot, 'template', change.path), 'utf8')
      if (change.path === 'package.json') {
        const generated = JSON.parse(change.content)
        const template = JSON.parse(templateContent)
        generated.name = template.name
        assert.deepEqual(generated, template)
      } else {
        assert.equal(change.content, templateContent, `${change.path} drifted from the CLI output`)
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
