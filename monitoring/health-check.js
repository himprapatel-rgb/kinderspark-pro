#!/usr/bin/env node
/**
 * KinderSpark Pro — 24/7 Health Monitor
 * Runs as a Railway Cron Service every 5 minutes.
 * Checks backend + frontend, posts to webhook if degraded.
 */

const BACKEND_URL  = process.env.BACKEND_URL  || 'https://kinderspark-backend.up.railway.app'
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://kinderspark-frontend.up.railway.app'
const WEBHOOK_URL  = process.env.ALERT_WEBHOOK_URL  // optional: Slack/Discord webhook
const GH_TOKEN     = process.env.GITHUB_TOKEN
const GH_REPO      = process.env.GITHUB_REPO || 'himprapatel-rgb/kinderspark-pro'

const results = []

async function check(name, url, expectJson = false) {
  const start = Date.now()
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const ms  = Date.now() - start
    let data  = null
    if (expectJson) {
      try { data = await res.json() } catch {}
    }
    const ok = res.status < 500
    results.push({ name, url, ok, status: res.status, ms, data })
    console.log(`[${ok ? '✅' : '❌'}] ${name} — ${res.status} in ${ms}ms`)
    return ok
  } catch (err) {
    const ms = Date.now() - start
    results.push({ name, url, ok: false, status: 0, ms, error: err.message })
    console.error(`[❌] ${name} — ERROR: ${err.message} (${ms}ms)`)
    return false
  }
}

async function openGitHubIssue(title, body) {
  if (!GH_TOKEN) { console.warn('No GITHUB_TOKEN — skipping issue creation'); return }
  try {
    const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title, body, labels: ['critical', 'agent-auto'] }),
    })
    const data = await res.json()
    console.log(`📋 GitHub issue created: ${data.html_url}`)
  } catch (err) {
    console.error('Failed to create GitHub issue:', err.message)
  }
}

async function sendWebhook(message) {
  if (!WEBHOOK_URL) return
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    })
  } catch {}
}

async function main() {
  console.log(`\n🔍 KinderSpark Health Check — ${new Date().toISOString()}\n`)

  const backendOk  = await check('Backend  /health', `${BACKEND_URL}/health`, true)
  const frontendOk = await check('Frontend /       ', `${FRONTEND_URL}/`)

  const failed = results.filter(r => !r.ok)

  if (failed.length === 0) {
    console.log('\n✅ All systems operational\n')
    return
  }

  // Build alert payload
  const summary = failed.map(r =>
    `- **${r.name}**: ${r.error || `HTTP ${r.status}`} (${r.ms}ms)`
  ).join('\n')

  const backendHealth = results.find(r => r.name.includes('Backend'))?.data
  const dbStatus = backendHealth?.db || 'unknown'

  const issueBody = `## 🚨 Health Check Failure — ${new Date().toISOString()}

### Failed Services
${summary}

### Backend Health Data
\`\`\`json
${JSON.stringify(backendHealth, null, 2)}
\`\`\`

### DB Status
\`${dbStatus}\`

### Action Required
The autonomous agent should investigate:
1. Check Railway logs for errors
2. Verify DB connection string is valid
3. Restart the affected service if needed
4. Check for recent deployments that may have caused the issue

*Auto-created by KinderSpark Health Monitor*`

  const alertMsg = `🚨 KinderSpark ALERT — ${failed.length} service(s) down!\n${summary}\nDB: ${dbStatus}`

  // Fire both in parallel
  await Promise.all([
    openGitHubIssue(`🚨 [Health] ${failed.map(r => r.name.trim()).join(', ')} — down`, issueBody),
    sendWebhook(alertMsg),
  ])

  console.error('\n❌ Health check FAILED — alert sent\n')
  process.exit(1)
}

main().catch(err => {
  console.error('Monitor crashed:', err)
  process.exit(1)
})
