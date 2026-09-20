export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
export type DomEnvironment = 'jsdom' | 'happy-dom'
export type BrowserTarget = 'desktop' | 'mobile'
export type ProjectMode = 'new' | 'existing'

export type SetupOptions = {
  packageManager: PackageManager
  domEnvironment: DomEnvironment
  browsers: BrowserTarget[]
  mode: ProjectMode
  projectName: string
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

export function buildTemplateCommands(options: SetupOptions) {
  const name = normalizedProjectName(options.projectName)
  return [
    `${tigedRunner[options.packageManager]} slpixe/react-setup/template ${name}`,
    `cd ${name}`,
    installCommand[options.packageManager],
    `${playwrightRunner[options.packageManager]} install ${browserNames(options.browsers).join(' ')}`,
  ]
}

export const skillCommands = [
  'npx skills find react-setup --owner slpixe',
  'npx skills add slpixe/react-setup --skill react-setup',
]
