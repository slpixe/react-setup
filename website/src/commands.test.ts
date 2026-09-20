import { describe, expect, it } from 'vitest'
import { buildCliCommand, buildTemplateCommands, skillCommands } from './commands'

describe('command builder', () => {
  it('builds a pnpm command for an existing happy-dom project', () => {
    expect(buildCliCommand({
      packageManager: 'pnpm',
      domEnvironment: 'happy-dom',
      browsers: ['desktop'],
      mode: 'existing',
      projectName: 'ignored',
    })).toBe('pnpm dlx @slpixe/react-setup . --pm=pnpm --dom=happy-dom --browsers=desktop --yes')
  })

  it('builds Bun template commands with selected browsers', () => {
    expect(buildTemplateCommands({
      packageManager: 'bun',
      domEnvironment: 'jsdom',
      browsers: ['mobile'],
      mode: 'new',
      projectName: 'My App',
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
})
