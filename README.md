# react-setup

One setup command for a current React toolchain, plus an AI skill that knows when and how to use it safely.

`react-setup` detects the runtime, package manager, and project shape before it changes anything. It can scaffold a new app or augment an existing React app with:

- Vite 8, TypeScript, and stable React Compiler configuration
- Vitest, Testing Library, `user-event`, and either jsdom or happy-dom
- Playwright projects for desktop Chromium and mobile WebKit
- An automatic per-test Playwright fixture in `e2e/test.ts`

Existing source and unrecognized configs are preserved. Run a dry run first to see the exact plan.

Run the CLI with no options for an interactive wizard. Arrow keys choose a single option; Space toggles Playwright targets and Enter moves to the next step.

## Which entry point?

- Use the CLI for an existing project, runtime/package-manager detection, or choosing between jsdom and happy-dom.
- Use the Vite starter template for a brand-new project when you want to inspect or clone the complete baseline directly.

Vite does not load arbitrary third-party names through `create-vite --template`. Community templates are cloned from their repositories instead:

```sh
npx tiged slpixe/react-setup/template my-app
cd my-app
npm install
npx playwright install chromium webkit
npm test
```

The template deliberately has no lockfile or `packageManager` field, so npm, pnpm, Yarn, and Bun users can choose their own installer.

## CLI

The package is scoped because the unrelated unscoped `react-setup` name is already occupied on npm.

```sh
npx @slpixe/react-setup --dry-run
npx @slpixe/react-setup --yes
```

With pnpm, Yarn, or Bun:

```sh
pnpm dlx @slpixe/react-setup --dry-run
yarn dlx @slpixe/react-setup --dry-run
bunx @slpixe/react-setup --dry-run
```

Pass a directory to set up another location:

```sh
npx @slpixe/react-setup ./my-app --yes
```

Useful options:

```text
--pm <npm|pnpm|yarn|bun>  Override detection
--dom <jsdom|happy-dom>    Select the Vitest DOM (jsdom is the default)
--browsers <targets>       Select desktop, mobile, or desktop,mobile
--dry-run                  Show the complete plan without writing
--yes                      Skip the confirmation
--skip-install             Write configuration without installing packages
--skip-browsers            Skip Chromium and WebKit downloads
--force                    Opt in to adding React to a non-React directory
```

Detection order is explicit `--pm`, `packageManager` in `package.json`, the nearest lockfile, the invoking package manager, and finally the active runtime. Multiple lockfiles are reported.

## New and existing projects

In an empty directory, the CLI creates the minimal Vite React TypeScript application and example unit/E2E tests. In an existing React project it preserves application source, merges only missing package scripts and dependencies, patches a standard Vite React config for React Compiler, and leaves custom test configs in place with a warning.

A populated non-React directory requires `--force`. The flag permits adding the setup but still does not overwrite existing source files.

## Automatic Playwright test setup

Generated E2E specs import from `e2e/test.ts` instead of directly from `@playwright/test`:

```ts
import { expect, test } from './test'
```

That module defines an automatic fixture. Add per-test setup before `await use()` and teardown after it; every test importing this extended `test` receives the fixture automatically.

## AI skill

The skill is at [`skills/react-setup/SKILL.md`](skills/react-setup/SKILL.md). Once the repository is public, install it through the Skills CLI:

```sh
npx skills add slpixe/react-setup --skill react-setup
```

Discover it by owner after skills.sh has indexed the public repository:

```sh
npx skills find react-setup --owner slpixe
```

## Website

The interactive setup bench lives in [`website/`](website/) and is designed for Cloudflare Pages at [react-setup.slpixe.com](https://react-setup.slpixe.com). It produces copyable commands for Node or Bun and npm, pnpm, Yarn, or Bun, and includes a complete manual path with individually copyable Vite, React Compiler, Vitest, Testing Library, and Playwright configuration. Every manual section links to its upstream documentation; the supporting source audit is in [`docs/manual-setup-research.md`](docs/manual-setup-research.md).

## Development

```sh
pnpm test
pnpm run check
pnpm pack --dry-run
```

The CLI keeps project detection and file generation dependency-free; `@clack/prompts` provides the interactive wizard.
