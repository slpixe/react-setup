---
name: react-setup
description: Configure or audit a Vite React TypeScript project with React Compiler, Vitest and Testing Library, and Playwright desktop/mobile tests. Use for new React app setup or for safely adding this toolchain to an existing React project; do not use for framework-managed builds such as Next.js or Expo.
---

# React Setup

Use the repository's `@slpixe/react-setup` CLI for safe project detection and upgrades, or its community Vite template for a clean, cloneable starter. The CLI detects Node versus Bun, the package manager, and whether the target is empty, an existing React app, or an unrelated project.

## Choose an entry point

- Run the CLI with no flags in an interactive terminal when the user wants a guided setup. Arrow keys choose one option, Space toggles Playwright projects, and Enter advances.
- Use the CLI for any existing directory, for happy-dom, or when package-manager/runtime detection matters.
- For a new default jsdom project, the user may clone the standalone template with `npx tiged slpixe/react-setup/template my-app`. Vite's built-in `--template` flag does not accept third-party template names.
- Do not clone the template over a populated directory. Use the CLI's previewed merge behavior instead.

## Workflow

1. Inspect the target's `package.json`, lockfiles, build config, and framework. Stop if the project is managed by Next.js, Remix, Expo, or another framework whose build/test conventions would conflict with a Vite application setup.
2. Run a preview from the target:

   ```sh
   npx @slpixe/react-setup --dry-run
   ```

   Use `pnpm dlx`, `yarn dlx`, or `bunx` when that matches the project. The CLI also detects the nearest lockfile and `packageManager` field.
3. Review every warning. Existing source and custom Vitest or Playwright configs are deliberately preserved. Resolve custom config integration manually when the CLI says it could not safely patch one.
4. Apply only after the plan matches the request:

   ```sh
   npx @slpixe/react-setup --yes
   ```

5. Run the generated unit and E2E tests, then inspect the diff. Do not remove existing test scripts, dependencies, or application files merely to make the generated examples pass.

## Decisions

- Prefer `jsdom` for browser-API fidelity. Use `--dom happy-dom` when speed matters more or the active Node version cannot run current jsdom.
- Use `--pm` only to override incorrect or ambiguous detection.
- Use `--skip-install` when dependency installation is outside the task's authorization or the environment has no network access.
- Use `--skip-browsers` when Playwright browser downloads should be deferred.
- A populated non-React directory requires `--force`. Explain that conversion before using the flag; it permits scaffolding but still does not authorize overwriting unrelated files.

## Playwright setup

The generated `e2e/test.ts` extends Playwright's base test with an automatic fixture. E2E specs must import `test` and `expect` from that module, not directly from `@playwright/test`, so setup before `use()` and teardown after it run for every test. Keep device behavior in the desktop and mobile projects in `playwright.config.ts`; do not hard-code viewport changes in the automatic fixture.

## Local development fallback

Before the npm package is published, run the GitHub package directly or use a local checkout:

```sh
npx github:slpixe/react-setup --dry-run
node /path/to/react-setup/bin/react-setup.js --dry-run
```

Preserve the same preview, review, apply, and verify sequence.
