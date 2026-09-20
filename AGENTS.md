# Repository guidance

## Scope

- The root package publishes `bin/`, `src/`, `skills/`, `template/`, `README.md`, and `LICENSE` as `@slpixe/react-setup`.
- `website/` is a separate Vite application deployed to Cloudflare and is not part of the npm tarball.
- Preserve existing-project source and custom configuration unless the requested change explicitly alters that behavior.
- Keep the generated fresh-project files and `template/` aligned; `test/template.test.js` checks their parity.

## Validation

- Install root dependencies with `pnpm install`.
- Run `pnpm test` and `pnpm run check` for package changes.
- Run `npm test` and `npm run build` from `website/` for website changes.
- Use the fixtures in `/Users/slpixe/web/js/react-setup-test` for full generated-project checks when setup output changes.

## Releases

- Do not run `npm publish` locally. `.github/workflows/publish.yml` publishes through npm Trusted Publishing after a push to `main`.
- Do not bump a version unless the user explicitly requests a release.
- Use `pnpm run release:patch`, `pnpm run release:minor`, or `pnpm run release:major` according to semantic-versioning impact. These commands validate, commit, and tag locally.
- Push the resulting commit and tag explicitly with `git push origin main --follow-tags`; do not hide pushes in package lifecycle scripts.
- Never add an `NPM_TOKEN` secret or long-lived npm credential. The workflow uses GitHub OIDC.
