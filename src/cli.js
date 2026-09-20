import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import * as prompts from '@clack/prompts'
import { applyPlan, runCommand } from './apply.js'
import {
  browserInstallCommand,
  detectPackageManager,
  detectRuntime,
  executableVersion,
  installCommand,
} from './detect.js'
import { analyzeProject } from './project.js'
import { planSetup } from './planner.js'

const HELP = `Usage: react-setup [directory] [options]

Add Vite + React Compiler + TypeScript, Vitest + Testing Library, and
Playwright desktop/mobile projects to a new or existing React project.

Options:
  --pm <npm|pnpm|yarn|bun>  Override package-manager detection
  --dom <jsdom|happy-dom>    Choose the Vitest DOM (default: jsdom)
  --browsers <targets>       Playwright targets: desktop,mobile
  --dry-run                  Analyze and print the plan without writing
  --yes                      Apply without an interactive confirmation
  --skip-install             Write files without installing dependencies
  --skip-browsers            Skip Playwright browser downloads
  --force                    Allow setup in an existing non-React directory
  -h, --help                 Show this help
  -v, --version              Show the package version
`

function takeValue(args, index, name) {
  const value = args[index + 1]
  if (!value || value.startsWith('-')) throw new Error(`${name} needs a value`)
  return value
}

export function parseArgs(args) {
  const options = {
    target: '.',
    domEnvironment: undefined,
    browsers: undefined,
    dryRun: false,
    yes: false,
    skipInstall: false,
    skipBrowsers: false,
    force: false,
  }
  const positional = []

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--pm') options.packageManager = takeValue(args, index++, '--pm')
    else if (argument.startsWith('--pm=')) options.packageManager = argument.slice(5)
    else if (argument === '--dom') options.domEnvironment = takeValue(args, index++, '--dom')
    else if (argument.startsWith('--dom=')) options.domEnvironment = argument.slice(6)
    else if (argument === '--browsers') options.browsers = takeValue(args, index++, '--browsers').split(',')
    else if (argument.startsWith('--browsers=')) options.browsers = argument.slice(11).split(',')
    else if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--yes') options.yes = true
    else if (argument === '--skip-install') options.skipInstall = true
    else if (argument === '--skip-browsers') options.skipBrowsers = true
    else if (argument === '--force') options.force = true
    else if (argument === '--help' || argument === '-h') options.help = true
    else if (argument === '--version' || argument === '-v') options.version = true
    else if (argument.startsWith('-')) throw new Error(`Unknown option: ${argument}`)
    else positional.push(argument)
  }

  if (positional.length > 1) throw new Error('Expected at most one target directory')
  if (positional[0]) options.target = positional[0]
  if (options.domEnvironment && !['jsdom', 'happy-dom'].includes(options.domEnvironment)) {
    throw new Error('--dom must be jsdom or happy-dom')
  }
  if (options.browsers) {
    options.browsers = [...new Set(options.browsers.map((value) => value.trim()).filter(Boolean))]
    if (options.browsers.length === 0 || options.browsers.some((value) => !['desktop', 'mobile'].includes(value))) {
      throw new Error('--browsers must contain desktop, mobile, or both')
    }
  }
  return options
}

function cancelled(value) {
  if (!prompts.isCancel(value)) return false
  prompts.cancel('No changes made.')
  return true
}

function defaultDomForRuntime(runtime) {
  return runtimeWarning(runtime, 'jsdom') ? 'happy-dom' : 'jsdom'
}

async function runWizard(options, context) {
  prompts.intro('react-setup')

  if (!options.packageManager) {
    const packageManager = await prompts.select({
      message: 'Package manager',
      initialValue: context.detectedPackageManager.name,
      options: [
        { value: 'npm', label: 'npm' },
        { value: 'pnpm', label: 'pnpm' },
        { value: 'yarn', label: 'Yarn' },
        { value: 'bun', label: 'Bun' },
      ],
    })
    if (cancelled(packageManager)) return false
    options.packageManager = packageManager
  }

  if (!options.domEnvironment) {
    const domEnvironment = await prompts.select({
      message: 'Vitest DOM environment',
      initialValue: defaultDomForRuntime(context.runtime),
      options: [
        { value: 'jsdom', label: 'jsdom', hint: 'higher browser fidelity' },
        { value: 'happy-dom', label: 'happy-dom', hint: 'lighter and faster' },
      ],
    })
    if (cancelled(domEnvironment)) return false
    options.domEnvironment = domEnvironment
  }

  if (!options.browsers) {
    const browsers = await prompts.multiselect({
      message: 'Playwright projects',
      initialValues: ['desktop', 'mobile'],
      required: true,
      options: [
        { value: 'desktop', label: 'Desktop Chromium' },
        { value: 'mobile', label: 'Mobile WebKit (iPhone 15)' },
      ],
    })
    if (cancelled(browsers)) return false
    options.browsers = browsers
  }

  if (context.analysis.kind === 'existing' && !options.force) {
    const force = await prompts.confirm({
      message: 'This populated directory is not currently a React project. Add the React setup?',
      initialValue: false,
    })
    if (cancelled(force) || !force) return false
    options.force = true
  }

  if (!options.skipInstall) {
    const install = await prompts.confirm({
      message: 'Install project dependencies after writing files?',
      initialValue: true,
    })
    if (cancelled(install)) return false
    options.skipInstall = !install
  }

  if (!options.skipInstall && !options.skipBrowsers) {
    const installBrowsers = await prompts.confirm({
      message: 'Download the selected Playwright browsers?',
      initialValue: true,
    })
    if (cancelled(installBrowsers)) return false
    options.skipBrowsers = !installBrowsers
  }

  return true
}

function runtimeWarning(runtime, domEnvironment) {
  if (runtime.name === 'bun') return undefined
  const [major, minor = 0, patch = 0] = runtime.version.split('.').map(Number)
  const supportsVitest = (
    (major === 22 && minor >= 12) ||
    major === 24 ||
    major >= 26
  )
  if (!supportsVitest) {
    return `Vitest 5 requires Node 22.12+, Node 24, or Node 26+; detected Node ${runtime.version}.`
  }
  const supportsJsdom = (
    (major === 22 && (minor > 22 || (minor === 22 && patch >= 2))) ||
    (major === 24 && minor >= 15) ||
    major >= 26
  )
  if (domEnvironment === 'jsdom' && !supportsJsdom) {
    return `jsdom 30 requires Node 22.22.2+, 24.15+, or 26+; detected Node ${runtime.version}. Use --dom happy-dom or upgrade Node.`
  }
  return undefined
}

function printPlan(analysis, runtime, packageManager, managerVersion, plan, options) {
  console.log(`\nTarget:          ${analysis.target}`)
  console.log(`Project:         ${analysis.kind}${analysis.hasVite ? ' + Vite' : ''}`)
  console.log(`Runtime:         ${runtime.name} ${runtime.version}`)
  console.log(`Package manager: ${packageManager.name}${managerVersion ? ` ${managerVersion}` : ''} (${packageManager.source})`)
  console.log(`DOM environment: ${options.domEnvironment}`)
  console.log(`Playwright:      ${options.browsers.join(', ')}`)
  console.log('\nChanges:')
  for (const change of plan.changes) console.log(`  ${change.action.padEnd(6)} ${change.path}`)
  if (plan.warnings.length > 0) {
    console.log('\nWarnings:')
    for (const warning of plan.warnings) console.log(`  - ${warning}`)
  }
}

async function confirm() {
  const readline = createInterface({ input: stdin, output: stdout })
  try {
    const answer = await readline.question('\nApply these changes? [y/N] ')
    return /^y(es)?$/i.test(answer.trim())
  } finally {
    readline.close()
  }
}

export async function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv)
  if (options.help) return console.log(HELP)
  if (options.version) return console.log('0.1.1')

  const target = resolve(options.target)
  const analysis = analyzeProject(target)
  const runtime = detectRuntime()
  const detectedPackageManager = detectPackageManager(target, { explicit: options.packageManager })
  const interactive = Boolean(stdin.isTTY && stdout.isTTY && !options.yes && !options.dryRun)
  if (interactive) {
    const shouldContinue = await runWizard(options, { analysis, runtime, detectedPackageManager })
    if (!shouldContinue) return
  }
  options.domEnvironment ??= 'jsdom'
  options.browsers ??= ['desktop', 'mobile']
  const packageManager = options.packageManager
    ? detectPackageManager(target, { explicit: options.packageManager })
    : detectedPackageManager
  const managerVersion = executableVersion(packageManager.name)
  if (!managerVersion && !options.skipInstall) {
    throw new Error(`${packageManager.name} was detected but is not available on PATH; use --pm or --skip-install`)
  }
  const warning = runtimeWarning(runtime, options.domEnvironment)
  if (warning) throw new Error(warning)
  const plan = planSetup(analysis, {
    packageManager: packageManager.name,
    domEnvironment: options.domEnvironment,
    browsers: options.browsers,
    force: options.force,
  })

  if (packageManager.ambiguous?.length) {
    plan.warnings.unshift(`Multiple lockfiles found: ${packageManager.ambiguous.join(', ')}`)
  }
  printPlan(analysis, runtime, packageManager, managerVersion, plan, options)

  if (options.dryRun) return
  if (!options.yes) {
    if (!stdin.isTTY) throw new Error('Non-interactive use requires --yes')
    if (!(await confirm())) return console.log('No changes made.')
  }

  await applyPlan(target, plan)
  if (!options.skipInstall) {
    const [install, ...installArgs] = installCommand(packageManager.name)
    await runCommand(install, installArgs, target)
    if (!options.skipBrowsers) {
      const [browserInstall, ...browserArgs] = browserInstallCommand(packageManager.name, options.browsers)
      await runCommand(browserInstall, browserArgs, target)
    }
  }

  console.log('\nReact setup complete.')
  console.log(`Run ${packageManager.name === 'npm' ? 'npm run test' : `${packageManager.name} test`} and ${packageManager.name === 'npm' ? 'npm run e2e' : `${packageManager.name} e2e`}.`)
  if (interactive) prompts.outro('Ready to build.')
}
