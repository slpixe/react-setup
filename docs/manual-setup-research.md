# Manual React setup research

Verified against primary documentation on 2026-09-20. This is the source material for a website path that lets someone assemble the stack by hand instead of using this repository's template or CLI.

## Compatibility baseline

- Current Vite requires Node `20.19+` or `22.12+`; current Vitest requires Node `22.12+`, so Node `22.12+` is the practical shared floor for this stack. Current Playwright lists the latest Node 22, 24, or 26 releases as supported. Sources: [Vite: Getting Started](https://vite.dev/guide/), [Vitest: Getting Started](https://vitest.dev/guide/), [Playwright: Installation](https://playwright.dev/docs/intro#system-requirements).
- Bun can be used to scaffold Vite and install/run Vitest. Playwright's official Test installation guide documents npm, Yarn, and pnpm and lists Node as its runtime requirement; it does not currently document Bun as a supported Playwright Test runtime. A Bun-oriented page should therefore describe Bun as the package manager while retaining a supported Node runtime for Playwright. Sources: [Vite: Getting Started](https://vite.dev/guide/), [Vitest: Getting Started](https://vitest.dev/guide/), [Playwright: Installation](https://playwright.dev/docs/intro).

## 1. Create a Vite React TypeScript app

Vite currently ships both `react-ts` and `react-compiler-ts` templates. For the shortest new-project route, use `react-compiler-ts`. To teach the pieces individually, start from `react-ts`, then apply the compiler step below. Vite accepts `.` instead of `my-app` to scaffold into the current directory. Source: [Vite: Scaffolding Your First Project](https://vite.dev/guide/#scaffolding-your-first-vite-project).

```sh
# npm
npm create vite@latest my-app -- --template react-ts

# pnpm
pnpm create vite my-app --template react-ts

# Yarn
yarn create vite my-app --template react-ts

# Bun
bun create vite my-app --template react-ts
```

For a new project with the compiler already represented by the Vite template, change `react-ts` to `react-compiler-ts`.

## 2. Add React Compiler

Install the compiler and the Vite/Babel bridge:

```sh
# npm
npm install -D babel-plugin-react-compiler@latest @rolldown/plugin-babel

# pnpm
pnpm add -D babel-plugin-react-compiler@latest @rolldown/plugin-babel

# Yarn
yarn add -D babel-plugin-react-compiler@latest @rolldown/plugin-babel
```

React's current Vite instructions for `@vitejs/plugin-react` 6 or newer use `reactCompilerPreset()` and `@rolldown/plugin-babel`:

```ts
// vite.config.ts
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
```

Important version distinction: the old `react({ babel: { plugins: [...] } })` form applies to versions before `@vitejs/plugin-react@6.0.0`; v6 removed that inline Babel option. React 19 needs no compiler target option. React 17/18 additionally need `react-compiler-runtime@latest` and a compiler `target` of `'17'` or `'18'`. Sources: [React Compiler: Installation](https://react.dev/learn/react-compiler/installation#vite), [React Compiler: Configuration](https://react.dev/reference/react-compiler/configuration#version-compatibility).

## 3. Add Vitest and React Testing Library

Install Vitest, React Testing Library and its required DOM peer, jest-dom matchers, the optional-but-useful user-event package, and exactly one DOM emulator:

```sh
# jsdom, npm
npm install -D vitest @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event jsdom

# happy-dom, npm
npm install -D vitest @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event happy-dom
```

Package-manager substitutions are mechanical:

```sh
pnpm add -D <packages>
yarn add -D <packages>
bun add -D <packages>
```

`@testing-library/react` declares `@testing-library/dom` as a peer dependency, so both should be installed. Vitest provides `jsdom` and `happy-dom` environments but does not bundle either package. Vitest describes happy-dom as faster but missing some APIs compared with jsdom. Sources: [React Testing Library: Installation](https://testing-library.com/docs/react-testing-library/intro/#installation), [Vitest: Features](https://vitest.dev/guide/features.html#mocking), [Vitest: Test Environment](https://vitest.dev/guide/environment.html).

Use a dedicated Vitest config that preserves the Vite plugins by merging the Vite config:

```ts
// vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom', // or 'happy-dom'
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
  }),
)
```

Vitest reads `vite.config.*` by default. If a separate `vitest.config.*` is used, it takes priority rather than automatically extending the Vite config, which is why `mergeConfig` matters here. `setupFiles` run before every test file in the test process. Sources: [Vitest: Configuring Vitest](https://vitest.dev/guide/index.html#configuring-vitest), [Vitest: setupFiles](https://vitest.dev/config/setupfiles.html).

Register jest-dom's Vitest adapter and cleanup in the setup file:

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())
```

The explicit cleanup hook is the documented approach when Vitest globals are not enabled. Keep this setup file as TypeScript and ensure the applicable `tsconfig` includes it so matcher types are visible. Sources: [React Testing Library: Auto Cleanup in Vitest](https://testing-library.com/docs/react-testing-library/setup/#auto-cleanup-in-vitest), [jest-dom: With Vitest](https://github.com/testing-library/jest-dom#with-vitest).

Suggested scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

With Bun, invoke these as `bun run test` and `bun run test:watch`; `bun test` selects Bun's own test runner instead of Vitest. Source: [Vitest: Getting Started](https://vitest.dev/guide/).

## 4. Add Playwright desktop and mobile projects

Playwright can scaffold itself into a new or existing project:

```sh
npm init playwright@latest
yarn create playwright
pnpm create playwright
```

For a fully manual setup, install the runner and only the two browser engines needed here:

```sh
npm install -D @playwright/test@latest
npx playwright install chromium webkit
```

Equivalent documented runners are `yarn playwright ...` and `pnpm exec playwright ...`. The Playwright installer can also add OS dependencies in CI with `playwright install --with-deps chromium webkit`. Sources: [Playwright: Installation](https://playwright.dev/docs/intro), [Playwright: Browsers](https://playwright.dev/docs/browsers), [Playwright: CLI install examples](https://playwright.dev/docs/test-cli#install-browsers).

Configure one desktop Chromium project and one WebKit-backed mobile Safari emulation project. `webServer` starts Vite for the test run and `baseURL` allows relative navigation:

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

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
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

The official project example maps `Desktop Chrome` to Chromium and the iPhone device preset to a `Mobile Safari` project. Projects are the supported mechanism for running the same tests under multiple browser/device configurations. Sources: [Playwright: Projects](https://playwright.dev/docs/test-projects), [Playwright: Web server](https://playwright.dev/docs/test-webserver).

Suggested scripts:

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui"
  }
}
```

## 5. Per-test automatic Playwright setup

Playwright distinguishes once-per-run global setup from setup that runs automatically for every test. Per-test automatic setup should be an automatic fixture:

```ts
// e2e/test.ts
import { expect, test as base } from '@playwright/test'

type AutomaticFixtures = {
  autoTestSetup: void
}

export const test = base.extend<AutomaticFixtures>({
  autoTestSetup: [
    async ({}, use) => {
      // Setup before each test.

      await use()

      // Teardown after each test.
    },
    { auto: true },
  ],
})

export { expect }
```

Each spec imports this extended `test` and `expect` instead of importing from `@playwright/test` directly:

```ts
// e2e/app.spec.ts
import { expect, test } from './test'

test('renders on desktop and mobile', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading')).toBeVisible()
})
```

The fixture is automatic for every test declared with that extended `test`; importing the local test module is still required. Code before `await use()` is setup and code after it is teardown. Use a worker-scoped automatic fixture instead when setup should run once per worker rather than once per test. Source: [Playwright: Automatic fixtures](https://playwright.dev/docs/test-fixtures#automatic-fixtures).

## Recommended website framing

Present this as a fourth, genuinely separate route named **Manual setup** alongside Template, CLI, and AI skill. Keep each section independently copyable and attach its primary-source link next to the heading. The page should make two current caveats conspicuous:

1. `@vitejs/plugin-react` 6+ uses `reactCompilerPreset()` with `@rolldown/plugin-babel`, not the removed inline Babel option.
2. A Playwright auto fixture only applies to specs importing the locally extended `test`; `globalSetup` is not a per-test replacement.
