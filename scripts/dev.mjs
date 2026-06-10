import { spawn } from 'node:child_process'

const processes = [
  { args: ['run', 'start:dev', '-w', 'backend'], name: 'backend' },
  { args: ['run', 'dev', '-w', 'frontend'], name: 'frontend' },
]

const children = processes.map(({ args, name }) => {
  const child = spawn('npm', args, {
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', (data) => writeWithPrefix(name, data))
  child.stderr.on('data', (data) => writeWithPrefix(name, data, true))
  child.on('exit', (code, signal) => {
    if (signal || code === 0) return
    process.stderr.write(`[${name}] exited with code ${code}\n`)
    shutdown()
  })

  return child
})

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

function writeWithPrefix(name, data, error = false) {
  const stream = error ? process.stderr : process.stdout
  const lines = data.toString().split(/(?<=\n)/)

  for (const line of lines) {
    if (line.length > 0) stream.write(`[${name}] ${line}`)
  }
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
}
