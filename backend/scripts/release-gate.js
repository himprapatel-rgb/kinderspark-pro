/* eslint-disable no-console */
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const REPORT_PATH = process.env.RELEASE_GATE_REPORT || path.join(process.cwd(), 'release-gate-report.json')

function runStep(name, command, args) {
  return new Promise((resolve) => {
    const startedAt = new Date()
    console.log(`\n[release-gate] ${name}: ${command} ${args.join(' ')}`)
    let effectiveCommand = command
    let effectiveArgs = args
    if (process.platform === 'win32' && command === 'npm') {
      effectiveCommand = 'cmd.exe'
      effectiveArgs = ['/d', '/s', '/c', `npm ${args.join(' ')}`]
    }

    const child = spawn(effectiveCommand, effectiveArgs, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      env: process.env,
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => {
      const text = String(d)
      stdout += text
      process.stdout.write(text)
    })
    child.stderr.on('data', (d) => {
      const text = String(d)
      stderr += text
      process.stderr.write(text)
    })

    child.on('close', (code) => {
      const endedAt = new Date()
      resolve({
        name,
        command: `${command} ${args.join(' ')}`,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMs: endedAt.getTime() - startedAt.getTime(),
        status: code === 0 ? 'pass' : 'fail',
        exitCode: code,
        stdoutTail: stdout.slice(-4000),
        stderrTail: stderr.slice(-4000),
      })
    })
  })
}

async function main() {
  const steps = []

  // 1) API smoke checks
  steps.push(await runStep('smoke', 'node', ['scripts/release-smoke.js']))

  // 2) Security-focused regression tests (targeted, fast)
  steps.push(
    await runStep('test:messages.permissions', 'npm', [
      'test',
      '--',
      'messages.permissions.test.ts',
      '--runInBand',
    ])
  )
  steps.push(
    await runStep('test:accessControl.ecosystem', 'npm', [
      'test',
      '--',
      'accessControl.ecosystem.test.ts',
      '--runInBand',
    ])
  )

  const failed = steps.filter((s) => s.status === 'fail')
  const report = {
    generatedAt: new Date().toISOString(),
    ok: failed.length === 0,
    failedCount: failed.length,
    passedCount: steps.length - failed.length,
    steps,
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  console.log(`\n[release-gate] report written: ${REPORT_PATH}`)

  if (failed.length > 0) {
    console.error(`[release-gate] FAILED (${failed.length}/${steps.length} steps failed)`)
    process.exit(1)
  }
  console.log('[release-gate] PASSED')
}

main().catch((err) => {
  console.error(`[release-gate] fatal: ${err.message}`)
  process.exit(1)
})

