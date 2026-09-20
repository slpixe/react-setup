import { describe, expect, it } from 'vitest'
import { buildCliCommand, buildManualSteps, buildSkillPrompt, buildTemplateCommands, skillCommands } from './commands'

describe('command builder', () => {
  it('builds a pnpm command for an existing happy-dom project', () => {
    expect(buildCliCommand({
      packageManager: 'pnpm',
      domEnvironment: 'happy-dom',
      browsers: ['desktop'],
      mode: 'existing',
      projectName: 'ignored',
      runtime: 'node',
    })).toBe('pnpm dlx @slpixe/react-setup . --pm=pnpm --dom=happy-dom --browsers=desktop --yes')
  })

  it('builds Bun template commands with selected browsers', () => {
    expect(buildTemplateCommands({
      packageManager: 'bun',
      domEnvironment: 'jsdom',
      browsers: ['mobile'],
      mode: 'new',
      projectName: 'My App',
      runtime: 'bun',
    })).toEqual([
      'bunx tiged slpixe/react-setup/template My-App',
      'cd My-App',
      'bun install',
      'bunx playwright install webkit',
    ])
  })

  it('provides discovery and direct skill installation', () => {
    expect(skillCommands).toHaveLength(2)
    expect(skillCommands[1]).toContain('--skill react-setup')
  })

  it('builds an AI prompt from the selected setup options', () => {
    const prompt = buildSkillPrompt({
      packageManager: 'bun',
      domEnvironment: 'happy-dom',
      browsers: ['desktop'],
      mode: 'existing',
      projectName: 'ignored',
      runtime: 'bun',
    })

    expect(prompt).toContain('Use the react-setup skill')
    expect(prompt).toContain('\n\nConfigure this existing React project')
    expect(prompt).toContain('existing React project in place')
    expect(prompt).toContain('Bun as the runtime and bun for dependency management')
    expect(prompt).toContain('Use happy-dom for Vitest')
    expect(prompt).toContain('desktop Chromium only')
    expect(prompt).not.toContain('mobile WebKit')
  })

  it('builds a package-manager and environment aware manual', () => {
    const steps = buildManualSteps({
      packageManager: 'pnpm',
      domEnvironment: 'happy-dom',
      browsers: ['mobile'],
      mode: 'new',
      projectName: 'My App',
      runtime: 'node',
    })

    expect(steps).toHaveLength(5)
    expect(steps[0].snippets[0].code).toBe('pnpm create vite My-App --template react-compiler-ts')
    expect(steps[1].snippets).toHaveLength(1)
    expect(steps[1].snippets[0].label).toContain('generated')
    expect(steps[1].snippets[0].code).toContain('reactCompilerPreset')
    expect(steps[1].snippets[0].code).not.toContain('pnpm add')
    expect(steps[2].snippets[0].code).toContain('happy-dom')
    expect(steps[2].snippets[1].code).toContain("environment: 'happy-dom'")
    expect(steps[3].snippets[0].code).toContain('pnpm exec playwright install webkit')
    expect(steps[3].snippets[1].code).toContain("devices['iPhone 15']")
    expect(steps[3].snippets[1].code).not.toContain("devices['Desktop Chrome']")
    expect(steps[3].snippets[1].code).toContain("command: 'pnpm run dev --host 127.0.0.1'")
    expect(steps[3].snippets[1].code).not.toContain('pnpm dev -- --host')
    expect(steps.every((step) => step.references.length > 0)).toBe(true)
  })

  it('keeps the compiler installation instructions for existing projects', () => {
    const steps = buildManualSteps({
      packageManager: 'pnpm',
      domEnvironment: 'jsdom',
      browsers: ['desktop', 'mobile'],
      mode: 'existing',
      projectName: 'ignored',
      runtime: 'node',
    })

    expect(steps[1].snippets[0].label).toBe('Install compiler packages')
    expect(steps[1].snippets[0].code).toContain('pnpm add --save-dev')
    expect(steps[1].snippets[1].code).toContain('reactCompilerPreset')
  })
})
