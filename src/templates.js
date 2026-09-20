function compilerPreset(reactTarget) {
  return reactTarget ? `reactCompilerPreset({ target: '${reactTarget}' })` : 'reactCompilerPreset()'
}

function insertPluginAtEnd(source, plugin) {
  const pluginsMatch = /plugins\s*:\s*\[/.exec(source)
  if (!pluginsMatch) return undefined
  const start = pluginsMatch.index + pluginsMatch[0].length
  let depth = 1
  let quote
  let escaped = false

  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = undefined
      continue
    }
    if (character === "'" || character === '"' || character === '`') quote = character
    else if (character === '[') depth += 1
    else if (character === ']') {
      depth -= 1
      if (depth === 0) {
        const inside = source.slice(start, index)
        const trimmed = inside.trimEnd()
        const separator = trimmed && !trimmed.endsWith(',') ? ',' : ''
        return `${source.slice(0, start)}${inside}${separator}\n    ${plugin},\n  ${source.slice(index)}`
      }
    }
  }
  return undefined
}

export function viteConfig(reactTarget) {
  return `import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), babel({ presets: [${compilerPreset(reactTarget)}] })],
})
`
}

export function patchViteConfig(source, reactTarget) {
  if (source.includes('reactCompilerPreset')) {
    if (reactTarget && source.includes('reactCompilerPreset()')) {
      return {
        content: source.replace('reactCompilerPreset()', compilerPreset(reactTarget)),
        changed: true,
      }
    }
    return { content: source, changed: false }
  }
  if (!source.includes("'@vitejs/plugin-react'") && !source.includes('"@vitejs/plugin-react"')) {
    return { content: source, changed: false, reason: 'Vite config does not use @vitejs/plugin-react' }
  }
  if (!/plugins\s*:\s*\[/.test(source)) {
    return { content: source, changed: false, reason: 'Could not find a static plugins array' }
  }

  let content = source.replace(
    /import\s+react\s+from\s+(['"]@vitejs\/plugin-react['"])/,
    'import react, { reactCompilerPreset } from $1',
  )

  if (!content.includes('reactCompilerPreset')) {
    return { content: source, changed: false, reason: 'Could not safely extend the React plugin import' }
  }

  if (!content.includes("'@rolldown/plugin-babel'") && !content.includes('"@rolldown/plugin-babel"')) {
    const firstImport = content.match(/^import .*$/m)
    const babelImport = "import babel from '@rolldown/plugin-babel'\n"
    if (firstImport) {
      content = `${content.slice(0, firstImport.index)}${babelImport}${content.slice(firstImport.index)}`
    } else {
      content = `${babelImport}${content}`
    }
  }

  content = insertPluginAtEnd(content, `babel({ presets: [${compilerPreset(reactTarget)}] })`)
  if (!content) return { content: source, changed: false, reason: 'Could not safely update the plugins array' }
  return { content, changed: true }
}

export function vitestConfig(viteConfigFile = 'vite.config.ts') {
  return `import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './${viteConfigFile}'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: '__DOM_ENVIRONMENT__',
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      coverage: { reporter: ['text', 'html'] },
    },
  }),
)
`
}

export function testSetup() {
  return `import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())
`
}

export function playwrightConfig(packageManager, targets = ['desktop', 'mobile']) {
  const command = packageManager === 'npm'
    ? 'npm run dev -- --host 127.0.0.1'
    : `${packageManager} run dev --host 127.0.0.1`

  const projects = [
    ...(targets.includes('desktop')
      ? ["    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },"]
      : []),
    ...(targets.includes('mobile')
      ? ["    { name: 'mobile-webkit', use: { ...devices['iPhone 15'] } },"]
      : []),
  ].join('\n')

  return `import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
${projects}
  ],
  webServer: {
    command: '${command}',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
})
`
}

export function playwrightFixture() {
  return `import { test as base, expect } from '@playwright/test'

type AutomaticFixtures = { autoTestSetup: void }

export const test = base.extend<AutomaticFixtures>({
  autoTestSetup: [
    async ({}, use) => {
      // Put setup before use() and teardown after it. This fixture runs for every
      // test that imports { test } from this module.
      await use()
    },
    { auto: true },
  ],
})

export { expect }
`
}

export function exampleE2eTest() {
  return `import { expect, test } from './test'

test('renders the app on desktop and mobile projects', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /react/i })).toBeVisible()
})
`
}

export const FRESH_FILES = {
  'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React app</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  'src/main.tsx': `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
  'src/App.tsx': `export function App() {
  return (
    <main>
      <h1>React setup is ready</h1>
      <p>Vite, React Compiler, Vitest, and Playwright are configured.</p>
    </main>
  )
}
`,
  'src/styles.css': `:root {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: #172033;
  background: #f6f7fb;
}

body { margin: 0; }
main { max-width: 48rem; margin: 12vh auto; padding: 2rem; }
`,
  'src/App.test.tsx': `import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the ready state', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /react setup is ready/i })).toBeInTheDocument()
  })
})
`,
  'tsconfig.json': `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
`,
  'tsconfig.app.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
`,
  'tsconfig.node.json': `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "strict": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
`,
}
