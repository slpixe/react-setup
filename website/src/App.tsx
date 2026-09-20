import { useMemo, useState } from 'react'
import {
  buildCliCommand,
  buildTemplateCommands,
  skillCommands,
  type BrowserTarget,
  type DomEnvironment,
  type PackageManager,
  type ProjectMode,
} from './commands'

type EntryPoint = 'template' | 'cli' | 'skill'

const packageManagers: PackageManager[] = ['npm', 'pnpm', 'yarn', 'bun']

function Choice<T extends string>({
  checked,
  label,
  name,
  onChange,
  value,
}: {
  checked: boolean
  label: string
  name: string
  onChange: (value: T) => void
  value: T
}) {
  return (
    <label className="choice">
      <input
        checked={checked}
        name={name}
        onChange={() => onChange(value)}
        type="radio"
        value={value}
      />
      <span>{label}</span>
    </label>
  )
}

function CommandBlock({ command, label }: { command: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="command-block">
      <div className="command-meta">
        <span>{label}</span>
        <button onClick={copy} type="button">{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre><code>{command}</code></pre>
    </div>
  )
}

export function App() {
  const [mode, setMode] = useState<ProjectMode>('new')
  const [runtime, setRuntime] = useState<'node' | 'bun'>('node')
  const [packageManager, setPackageManager] = useState<PackageManager>('npm')
  const [domEnvironment, setDomEnvironment] = useState<DomEnvironment>('jsdom')
  const [browsers, setBrowsers] = useState<BrowserTarget[]>(['desktop', 'mobile'])
  const [projectName, setProjectName] = useState('my-app')
  const [entryPoint, setEntryPoint] = useState<EntryPoint>('template')

  const options = useMemo(() => ({
    packageManager,
    domEnvironment,
    browsers,
    mode,
    projectName,
  }), [packageManager, domEnvironment, browsers, mode, projectName])

  function chooseMode(value: ProjectMode) {
    setMode(value)
    if (value === 'existing' && entryPoint === 'template') setEntryPoint('cli')
  }

  function toggleBrowser(target: BrowserTarget) {
    setBrowsers((current) => {
      if (!current.includes(target)) return [...current, target]
      if (current.length === 1) return current
      return current.filter((item) => item !== target)
    })
  }

  const templateCommands = buildTemplateCommands(options)
  const cliCommand = buildCliCommand(options)

  return (
    <div className="page-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="react-setup home">
          <span className="brand-mark">r/</span>
          <span>react-setup</span>
        </a>
        <nav aria-label="Project links">
          <a href="https://github.com/slpixe/react-setup">GitHub</a>
          <a href="https://www.npmjs.com/package/@slpixe/react-setup">npm</a>
          <a href="https://skills.sh/slpixe/react-setup/react-setup">AI skill</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <p className="hero-index">Template / CLI / skill / website</p>
          <h1>One React setup.<br />Four ways in.</h1>
          <p className="hero-copy">
            Vite, TypeScript, React Compiler, Testing Library, and desktop plus mobile Playwright—without reconstructing the toolchain every time.
          </p>
        </section>

        <section className="workbench" aria-labelledby="builder-title">
          <aside className="controls">
            <div className="controls-heading">
              <p>Configure</p>
              <h2 id="builder-title">Your project</h2>
            </div>

            <fieldset>
              <legend>Starting point</legend>
              <div className="choice-row">
                <Choice checked={mode === 'new'} label="New project" name="mode" onChange={chooseMode} value="new" />
                <Choice checked={mode === 'existing'} label="Existing project" name="mode" onChange={chooseMode} value="existing" />
              </div>
              {mode === 'new' && (
                <label className="text-field">
                  <span>Project directory</span>
                  <input onChange={(event) => setProjectName(event.target.value)} value={projectName} />
                </label>
              )}
            </fieldset>

            <fieldset>
              <legend>Runtime</legend>
              <div className="choice-row compact">
                <Choice checked={runtime === 'node'} label="Node.js" name="runtime" onChange={setRuntime} value="node" />
                <Choice checked={runtime === 'bun'} label="Bun" name="runtime" onChange={setRuntime} value="bun" />
              </div>
            </fieldset>

            <fieldset>
              <legend>Package manager</legend>
              <div className="choice-grid four">
                {packageManagers.map((manager) => (
                  <Choice
                    checked={packageManager === manager}
                    key={manager}
                    label={manager === 'yarn' ? 'Yarn' : manager}
                    name="package-manager"
                    onChange={setPackageManager}
                    value={manager}
                  />
                ))}
              </div>
              {runtime === 'bun' && packageManager !== 'bun' && (
                <p className="hint">The CLI will detect Bun while still using {packageManager} for dependencies.</p>
              )}
            </fieldset>

            <fieldset>
              <legend>Vitest DOM</legend>
              <div className="choice-row compact">
                <Choice checked={domEnvironment === 'jsdom'} label="jsdom" name="dom" onChange={setDomEnvironment} value="jsdom" />
                <Choice checked={domEnvironment === 'happy-dom'} label="happy-dom" name="dom" onChange={setDomEnvironment} value="happy-dom" />
              </div>
            </fieldset>

            <fieldset>
              <legend>Playwright projects</legend>
              <div className="check-list">
                <label>
                  <input checked={browsers.includes('desktop')} onChange={() => toggleBrowser('desktop')} type="checkbox" />
                  <span>Desktop Chromium</span>
                </label>
                <label>
                  <input checked={browsers.includes('mobile')} onChange={() => toggleBrowser('mobile')} type="checkbox" />
                  <span>Mobile WebKit</span>
                </label>
              </div>
            </fieldset>
          </aside>

          <div className="command-sheet">
            <div className="sheet-heading">
              <div>
                <p>Your exact setup</p>
                <h2>Copy, paste, build.</h2>
              </div>
              <span className="runtime-readout">{runtime} + {packageManager}</span>
            </div>

            <div className="entry-tabs" role="tablist" aria-label="Setup entry point">
              <button
                aria-selected={entryPoint === 'template'}
                disabled={mode === 'existing'}
                onClick={() => setEntryPoint('template')}
                role="tab"
                type="button"
              >Template</button>
              <button aria-selected={entryPoint === 'cli'} onClick={() => setEntryPoint('cli')} role="tab" type="button">CLI</button>
              <button aria-selected={entryPoint === 'skill'} onClick={() => setEntryPoint('skill')} role="tab" type="button">AI skill</button>
            </div>

            <div className="sheet-body" role="tabpanel">
              {entryPoint === 'template' && (
                <>
                  <p className="entry-explainer">Clone the complete default starter. Best when the directory does not exist yet.</p>
                  {templateCommands.map((command, index) => (
                    <CommandBlock command={command} key={command} label={['Clone', 'Enter', 'Install', 'Browsers'][index]} />
                  ))}
                </>
              )}

              {entryPoint === 'cli' && (
                <>
                  <p className="entry-explainer">
                    {mode === 'new'
                      ? 'Create a configured project with explicit, repeatable options.'
                      : 'Inspect and merge into this project without replacing its application source.'}
                  </p>
                  <CommandBlock command={cliCommand} label="Run setup" />
                  <p className="quiet-note">Remove the flags to use the interactive terminal wizard.</p>
                  <CommandBlock command={packageManager === 'npm' ? 'npx @slpixe/react-setup' : `${packageManager === 'pnpm' ? 'pnpm dlx' : packageManager === 'yarn' ? 'yarn dlx' : 'bunx'} @slpixe/react-setup`} label="Interactive" />
                </>
              )}

              {entryPoint === 'skill' && (
                <>
                  <p className="entry-explainer">Let a compatible coding agent choose the template or CLI path and verify the result.</p>
                  <CommandBlock command={skillCommands[0]} label="Discover" />
                  <CommandBlock command={skillCommands[1]} label="Install" />
                  <p className="quiet-note">Direct installation works as soon as the GitHub repository is public. Search indexing may follow later.</p>
                </>
              )}
            </div>

            <div className="sheet-footer">
              <span>React Compiler stable</span>
              <span>Existing files preserved</span>
              <span>Desktop + mobile tested</span>
            </div>
          </div>
        </section>

        <section className="routes" aria-label="Four ways to use react-setup">
          <article><strong>Template</strong><p>See every file up front and start clean.</p></article>
          <article><strong>CLI</strong><p>Detect, configure, and merge safely.</p></article>
          <article><strong>AI skill</strong><p>Give agents the decision process.</p></article>
          <article><strong>Website</strong><p>Turn choices into an exact command.</p></article>
        </section>
      </main>

      <footer>
        <span>react-setup.slpixe.com</span>
        <span>Public, inspectable, MIT licensed.</span>
      </footer>
    </div>
  )
}
