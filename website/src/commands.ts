export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
export type DomEnvironment = 'jsdom' | 'happy-dom'
export type BrowserTarget = 'desktop' | 'mobile'
export type ProjectMode = 'new' | 'existing'
export type Runtime = 'node' | 'bun'

export type SetupOptions = {
  packageManager: PackageManager
  domEnvironment: DomEnvironment
  browsers: BrowserTarget[]
  mode: ProjectMode
  projectName: string
  runtime: Runtime
}

export type ManualSnippet = {
  code: string
  label: string
}

export type ManualReference = {
  label: string
  url: string
}

export type ManualStep = {
  description: string
  references: ManualReference[]
  snippets: ManualSnippet[]
  title: string
}

const packageRunner: Record<PackageManager, string> = {
  npm: 'npx @slpixe/react-setup',
  pnpm: 'pnpm dlx @slpixe/react-setup',
  yarn: 'yarn dlx @slpixe/react-setup',
  bun: 'bunx @slpixe/react-setup',
}

const tigedRunner: Record<PackageManager, string> = {
  npm: 'npx tiged',
  pnpm: 'pnpm dlx tiged',
  yarn: 'yarn dlx tiged',
  bun: 'bunx tiged',
}

const installCommand: Record<PackageManager, string> = {
  npm: 'npm install',
  pnpm: 'pnpm install',
  yarn: 'yarn install',
  bun: 'bun install',
}

const playwrightRunner: Record<PackageManager, string> = {
  npm: 'npx playwright',
  pnpm: 'pnpm exec playwright',
  yarn: 'yarn exec playwright',
  bun: 'bunx playwright',
}

const addDevCommand: Record<PackageManager, string> = {
  npm: 'npm install --save-dev',
  pnpm: 'pnpm add --save-dev',
  yarn: 'yarn add --dev',
  bun: 'bun add --dev',
}

const testCommand: Record<PackageManager, string> = {
  npm: 'npm test',
  pnpm: 'pnpm test',
  yarn: 'yarn test',
  bun: 'bun run test',
}

const e2eCommand: Record<PackageManager, string> = {
  npm: 'npm run e2e',
  pnpm: 'pnpm e2e',
  yarn: 'yarn e2e',
  bun: 'bun run e2e',
}

const devServerCommand: Record<PackageManager, string> = {
  npm: 'npm run dev -- --host 127.0.0.1',
  pnpm: 'pnpm run dev --host 127.0.0.1',
  yarn: 'yarn dev --host 127.0.0.1',
  bun: 'bun run dev -- --host 127.0.0.1',
}

const viteCreator: Record<PackageManager, (name: string) => string> = {
  npm: (name) => `npm create vite@latest ${name} -- --template react-compiler-ts`,
  pnpm: (name) => `pnpm create vite ${name} --template react-compiler-ts`,
  yarn: (name) => `yarn create vite ${name} --template react-compiler-ts`,
  bun: (name) => `bun create vite ${name} --template react-compiler-ts`,
}

export function normalizedProjectName(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-') || 'my-app'
}

export function browserNames(targets: BrowserTarget[]) {
  return [
    ...(targets.includes('desktop') ? ['chromium'] : []),
    ...(targets.includes('mobile') ? ['webkit'] : []),
  ]
}

export function buildCliCommand(options: SetupOptions) {
  const target = options.mode === 'new' ? `./${normalizedProjectName(options.projectName)}` : '.'
  return [
    packageRunner[options.packageManager],
    target,
    `--pm=${options.packageManager}`,
    `--dom=${options.domEnvironment}`,
    `--browsers=${options.browsers.join(',')}`,
    '--yes',
  ].join(' ')
}

export function buildSkillPrompt(options: SetupOptions) {
  const projectInstruction = options.mode === 'new'
    ? `Create a new React project in ./${normalizedProjectName(options.projectName)}.`
    : 'Configure this existing React project in place, preserving its current application code and conventions.'
  const runtimeInstruction = options.runtime === 'bun'
    ? `Use Bun as the runtime and ${options.packageManager} for dependency management.`
    : `Use Node.js with ${options.packageManager} for dependency management.`
  const browserInstruction = options.browsers.length === 2
    ? 'Configure Playwright projects for desktop Chromium and mobile WebKit using the iPhone 15 device profile.'
    : options.browsers.includes('desktop')
      ? 'Configure a Playwright project for desktop Chromium only.'
      : 'Configure a Playwright project for mobile WebKit using the iPhone 15 device profile only.'

  return [
    'Use the react-setup skill for this task.',
    '',
    projectInstruction,
    runtimeInstruction,
    'Set up Vite, TypeScript, and stable React Compiler.',
    `Use ${options.domEnvironment} for Vitest with React Testing Library.`,
    browserInstruction,
    'Add the automatic Playwright fixture and make the example E2E spec import the extended test.',
    '',
    'Install what is needed, run the relevant checks, and summarize the files you changed.',
  ].join('\n')
}

export function buildTemplateCommands(options: SetupOptions) {
  const name = normalizedProjectName(options.projectName)
  return [
    `${tigedRunner[options.packageManager]} slpixe/react-setup/template ${name}`,
    `cd ${name}`,
    installCommand[options.packageManager],
    `${playwrightRunner[options.packageManager]} install ${browserNames(options.browsers).join(' ')}`,
  ]
}

function playwrightProjects(targets: BrowserTarget[]) {
  return [
    ...(targets.includes('desktop')
      ? ["    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },"]
      : []),
    ...(targets.includes('mobile')
      ? ["    { name: 'mobile-webkit', use: { ...devices['iPhone 15'] } },"]
      : []),
  ].join('\n')
}

export function buildManualSteps(options: SetupOptions): ManualStep[] {
  const name = normalizedProjectName(options.projectName)
  const viteSnippets: ManualSnippet[] = options.mode === 'new'
    ? [
        { code: viteCreator[options.packageManager](name), label: 'Create the app' },
        { code: `cd ${name}\n${installCommand[options.packageManager]}`, label: 'Enter and install' },
      ]
    : [{
        code: `${addDevCommand[options.packageManager]} vite @vitejs/plugin-react typescript @types/react @types/react-dom`,
        label: 'Add missing Vite packages',
      }]

  const domPackage = options.domEnvironment
  const selectedBrowsers = browserNames(options.browsers).join(' ')
  const compilerConfig = `import react, { reactCompilerPreset } from '@vitejs/plugin-react'\nimport babel from '@rolldown/plugin-babel'\nimport { defineConfig } from 'vite'\n\nexport default defineConfig({\n  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],\n})`
  const compilerSnippets: ManualSnippet[] = options.mode === 'new'
    ? [{ code: compilerConfig, label: 'vite.config.ts — generated by Vite' }]
    : [
        {
          code: `${addDevCommand[options.packageManager]} @rolldown/plugin-babel @babel/core @types/babel__core babel-plugin-react-compiler`,
          label: 'Install compiler packages',
        },
        { code: compilerConfig, label: 'vite.config.ts' },
      ]

  return [
    {
      title: options.mode === 'new'
        ? 'Start with Vite, React Compiler, and TypeScript'
        : 'Start with Vite, React, and TypeScript',
      description: options.mode === 'new'
        ? 'Use Vite’s official React Compiler + TypeScript template. It creates the React app and enables the stable compiler in one scaffold; the following steps add the test layers.'
        : 'Keep the existing application source. Add only missing Vite dependencies, then merge the configuration below with what the project already has.',
      references: [
        { label: 'Vite scaffolding guide', url: 'https://vite.dev/guide/#scaffolding-your-first-vite-project' },
      ],
      snippets: viteSnippets,
    },
    {
      title: options.mode === 'new' ? 'React Compiler is already enabled' : 'Enable stable React Compiler',
      description: options.mode === 'new'
        ? 'The react-compiler-ts template already installs the compiler and Vite’s Babel bridge. The generated configuration is shown here for reference; do not install the compiler a second time.'
        : 'Vite 8 and @vitejs/plugin-react 6 use the compiler preset through Rolldown’s Babel bridge. The older react({ babel: … }) form no longer applies. For React 17 or 18, pass the matching target and add react-compiler-runtime.',
      references: [
        { label: 'Vite React Compiler template', url: 'https://github.com/vitejs/vite/tree/main/packages/create-vite#readme' },
        { label: 'Vite React plugin', url: 'https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#babel-react-compiler' },
        { label: 'React Compiler options', url: 'https://react.dev/reference/react-compiler/configuration' },
      ],
      snippets: compilerSnippets,
    },
    {
      title: `Add Vitest, Testing Library, and ${domPackage}`,
      description: `${domPackage} supplies browser-like APIs while tests run in the project’s JavaScript runtime. The shared setup adds DOM matchers and cleans up rendered React trees after every test.`,
      references: [
        { label: 'Vitest environments', url: 'https://vitest.dev/guide/environment.html' },
        { label: 'jest-dom with Vitest', url: 'https://github.com/testing-library/jest-dom#with-vitest' },
        { label: 'React Testing Library', url: 'https://testing-library.com/docs/react-testing-library/intro/' },
      ],
      snippets: [
        {
          code: `${addDevCommand[options.packageManager]} vitest ${domPackage} @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event`,
          label: 'Install unit-test packages',
        },
        {
          label: 'vitest.config.ts',
          code: `import { defineConfig, mergeConfig } from 'vitest/config'\nimport viteConfig from './vite.config.ts'\n\nexport default mergeConfig(\n  viteConfig,\n  defineConfig({\n    test: {\n      environment: '${domPackage}',\n      setupFiles: ['./src/test/setup.ts'],\n      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],\n    },\n  }),\n)`,
        },
        {
          label: 'src/test/setup.ts',
          code: `import '@testing-library/jest-dom/vitest'\nimport { cleanup } from '@testing-library/react'\nimport { afterEach } from 'vitest'\n\nafterEach(() => cleanup())`,
        },
        {
          label: 'package.json scripts',
          code: `"test": "vitest run",\n"test:watch": "vitest"`,
        },
      ],
    },
    {
      title: 'Add Playwright for desktop and mobile',
      description: `Projects apply Playwright’s maintained device settings. The automatic fixture wraps every test that imports the local extended test.${options.runtime === 'bun' ? ' Bun can manage these packages, but Playwright Test officially supports Node as its runtime, so keep a supported Node release installed.' : ''}`,
      references: [
        { label: 'Browser installation', url: 'https://playwright.dev/docs/browsers#install-browsers' },
        { label: 'Projects and devices', url: 'https://playwright.dev/docs/test-projects' },
        { label: 'Automatic fixtures', url: 'https://playwright.dev/docs/test-fixtures#automatic-fixtures' },
      ],
      snippets: [
        {
          code: `${addDevCommand[options.packageManager]} @playwright/test\n${playwrightRunner[options.packageManager]} install ${selectedBrowsers}`,
          label: 'Install Playwright and browsers',
        },
        {
          label: 'playwright.config.ts',
          code: `import { defineConfig, devices } from '@playwright/test'\n\nexport default defineConfig({\n  testDir: './e2e',\n  use: { baseURL: 'http://127.0.0.1:5173', trace: 'on-first-retry' },\n  projects: [\n${playwrightProjects(options.browsers)}\n  ],\n  webServer: {\n    command: '${devServerCommand[options.packageManager]}',\n    url: 'http://127.0.0.1:5173',\n    reuseExistingServer: !process.env.CI,\n  },\n})`,
        },
        {
          label: 'e2e/test.ts — import this in every spec',
          code: `import { test as base, expect } from '@playwright/test'\n\ntype AutomaticFixtures = { autoTestSetup: void }\n\nexport const test = base.extend<AutomaticFixtures>({\n  autoTestSetup: [\n    async ({}, use) => {\n      // setup before this line\n      await use()\n      // teardown after this line\n    },\n    { auto: true },\n  ],\n})\n\nexport { expect }`,
        },
        {
          label: 'e2e/app.spec.ts — use the extended test',
          code: `import { expect, test } from './test'\n\ntest('renders on desktop and mobile', async ({ page }) => {\n  await page.goto('/')\n  await expect(page.getByRole('heading')).toBeVisible()\n})`,
        },
        {
          label: 'package.json scripts',
          code: `"e2e": "playwright test",\n"e2e:ui": "playwright test --ui"`,
        },
      ],
    },
    {
      title: 'Run both test layers',
      description: 'Run fast component tests first, then exercise the app through each selected Playwright project.',
      references: [
        { label: 'Vitest CLI', url: 'https://vitest.dev/guide/cli.html' },
        { label: 'Playwright test CLI', url: 'https://playwright.dev/docs/test-cli' },
      ],
      snippets: [
        { code: `${testCommand[options.packageManager]}\n${e2eCommand[options.packageManager]}`, label: 'Verify the setup' },
      ],
    },
  ]
}

export const skillCommands = [
  'npx skills find react-setup --owner slpixe',
  'npx skills add slpixe/react-setup --skill react-setup',
]
