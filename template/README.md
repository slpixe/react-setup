# Vite React TypeScript starter

A small React application with the intended `react-setup` baseline:

- Vite and TypeScript
- stable React Compiler through `reactCompilerPreset`
- Vitest, Testing Library, `user-event`, and jsdom
- Playwright desktop Chromium and mobile WebKit projects
- an automatic per-test fixture in `e2e/test.ts`

Choose your package manager, then install dependencies and Playwright browsers. For example:

```sh
npm install
npx playwright install chromium webkit
npm run dev
```

Run the checks with:

```sh
npm test
npm run build
npm run e2e
```

E2E tests should import `test` and `expect` from `./test`, not directly from `@playwright/test`, so the automatic fixture runs for each test.
