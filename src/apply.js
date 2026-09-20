import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'

export async function applyPlan(target, plan) {
  for (const change of plan.changes) {
    const destination = join(target, change.path)
    await mkdir(dirname(destination), { recursive: true })
    const temporary = `${destination}.react-setup-${randomUUID()}`
    await writeFile(temporary, change.content, 'utf8')
    await rename(temporary, destination)
  }
}

export function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${[command, ...args].join(' ')} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`))
    })
  })
}
