#!/usr/bin/env node
/**
 * KinderSpark Agent Memory CLI
 * Used by GitHub Actions workflows to give agents persistent memory.
 *
 * Usage:
 *   node agent-memory.js read  <agentId>
 *   node agent-memory.js write <agentId> <type> <importance> <content>
 *   node agent-memory.js message <fromId> <toId> <msgType> <message>
 *   node agent-memory.js broadcast <fromId> <message>
 *   node agent-memory.js inbox <agentId>
 *   node agent-memory.js critical
 *
 * Env vars:
 *   BACKEND_URL    - KinderSpark backend URL
 *   AGENT_SECRET   - shared secret for agent auth
 */

const BACKEND  = process.env.BACKEND_URL  || 'https://kinderspark-backend.up.railway.app'
const SECRET   = process.env.AGENT_SECRET || 'ks-agent-secret'
const HEADERS  = { 'Content-Type': 'application/json', 'x-agent-secret': SECRET }

const AGENT_META = {
  'health-monitor':       { name: 'Health Monitor',       icon: '🔍', color: '#30D158' },
  'auto-dev':             { name: 'Auto-Dev',             icon: '🤖', color: '#5E5CE6' },
  'frontend-designer':    { name: 'Frontend Designer',    icon: '🎨', color: '#BF5AF2' },
  'backend-engineer':     { name: 'Backend Engineer',     icon: '⚙️', color: '#FF9F0A' },
  'database-agent':       { name: 'Database Agent',       icon: '🗄️', color: '#FFD60A' },
  'marketing-agent':      { name: 'Marketing Agent',      icon: '📣', color: '#FF2D55' },
  'localization-agent':   { name: 'Localization Agent',   icon: '🌍', color: '#32ADE6' },
  'weekly-improvement':   { name: 'Weekly Improvement',   icon: '🔁', color: '#64D2FF' },
  'security-auditor':     { name: 'Security Auditor',     icon: '🛡️', color: '#FF453A' },
  'child-safety':         { name: 'Child Safety Monitor', icon: '👶', color: '#FF6B35' },
  'dependency-updater':   { name: 'Dependency Updater',   icon: '📦', color: '#30D158' },
  'secret-scanner':       { name: 'Secret Scanner',       icon: '🔑', color: '#FF9F0A' },
  'gdpr-agent':           { name: 'GDPR Compliance',      icon: '📋', color: '#5AC8FA' },
  'pr-reviewer':          { name: 'PR Code Reviewer',     icon: '👁️', color: '#BF5AF2' },
  'test-generator':       { name: 'Test Generator',       icon: '🧪', color: '#5E5CE6' },
  'performance-auditor':  { name: 'Performance Auditor',  icon: '🔬', color: '#FF9F0A' },
  'accessibility':        { name: 'Accessibility Auditor',icon: '📐', color: '#34C759' },
  'curriculum-builder':   { name: 'Curriculum Builder',   icon: '📖', color: '#FFD60A' },
  'difficulty-calibrator':{ name: 'Difficulty Calibrator',icon: '🎯', color: '#FF6B35' },
  'badge-designer':       { name: 'Badge Designer',       icon: '🌟', color: '#FFD60A' },
  'mini-game-developer':  { name: 'Mini-Game Developer',  icon: '🧩', color: '#BF5AF2' },
  'seasonal-content':     { name: 'Seasonal Content',     icon: '📅', color: '#FF2D55' },
  'analytics-reporter':   { name: 'Analytics Reporter',   icon: '📈', color: '#30D158' },
  'churn-detector':       { name: 'Churn Detector',       icon: '📉', color: '#FF453A' },
  'trend-analyser':       { name: 'Trend Analyser',       icon: '🔮', color: '#5E5CE6' },
  'ab-testing':           { name: 'A/B Testing',          icon: '🧪', color: '#FF9F0A' },
  'parent-report':        { name: 'Parent Report',        icon: '📧', color: '#64D2FF' },
  'teacher-insight':      { name: 'Teacher Insight',      icon: '👩‍🏫', color: '#30D158' },
  'achievement-notifier': { name: 'Achievement Notifier', icon: '🎉', color: '#FFD60A' },
  'support-agent':        { name: 'Support Agent',        icon: '🆘', color: '#FF453A' },
  'onboarding-watcher':   { name: 'Onboarding Watcher',   icon: '🧭', color: '#32ADE6' },
  'cost-monitor':         { name: 'Cost Monitor',         icon: '💸', color: '#FF9F0A' },
  'backup-verifier':      { name: 'Backup Verifier',      icon: '💾', color: '#30D158' },
  'api-latency':          { name: 'API Latency Monitor',  icon: '📡', color: '#64D2FF' },
  'log-analyser':         { name: 'Log Analyser',         icon: '📊', color: '#BF5AF2' },
  'theme-designer':       { name: 'Theme Designer',       icon: '🎨', color: '#FF2D55' },
  'pwa-agent':            { name: 'PWA Agent',            icon: '📱', color: '#5E5CE6' },
  'colour-accessibility': { name: 'Colour Accessibility', icon: '🌈', color: '#34C759' },
  'seo-agent':            { name: 'SEO Agent',            icon: '🌐', color: '#5AC8FA' },
  'launch-agent':         { name: 'Launch Agent',         icon: '🚀', color: '#FF2D55' },
  'mission-control':      { name: 'Mission Control',      icon: '🛸', color: '#5E5CE6' },
}

function meta(agentId) {
  return AGENT_META[agentId] || { name: agentId, icon: '🤖', color: '#5E5CE6' }
}

async function api(method, path, body) {
  const url = `${BACKEND}/api/agents${path}`
  try {
    const res = await fetch(url, {
      method,
      headers: HEADERS,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`API ${method} ${path} → ${res.status}: ${text}`)
      return null
    }
    return await res.json()
  } catch (err) {
    console.error(`API error (${path}): ${err.message}`)
    return null
  }
}

async function readMemory(agentId) {
  process.stderr.write(`\nMemory for ${meta(agentId).name}:\n`)
  const memories = await api('GET', `/memory/${agentId}?limit=10`)
  if (!memories?.length) { process.stderr.write('  (no memories yet)\n'); return '' }

  const summary = memories.map(m =>
    `[${m.type.toUpperCase()} importance:${m.importance} ${new Date(m.createdAt).toLocaleDateString()}]\n${m.content}`
  ).join('\n\n---\n\n')

  process.stderr.write(summary + '\n')

  // Write to $GITHUB_OUTPUT using multiline heredoc format (no emojis in key)
  const ghOutput = process.env.GITHUB_OUTPUT
  if (ghOutput) {
    const fs = require('fs')
    const safe = summary.replace(/\r/g, '').slice(0, 2000)
    fs.appendFileSync(ghOutput, `memory_context<<MEMORY_EOF\n${safe}\nMEMORY_EOF\n`)
  }
  return summary
}

async function writeMemory(agentId, type, importance, content) {
  const m = meta(agentId)
  const runId = process.env.GITHUB_RUN_ID || undefined
  const result = await api('POST', '/memory', {
    agentId, agentName: m.name, agentIcon: m.icon, agentColor: m.color,
    type, importance: Number(importance), content, runId,
  })
  if (result) console.log(`✅ Memory saved (${type}, importance:${importance})`)
  else console.log('⚠️ Memory save failed — continuing without memory')
}

async function sendMessage(fromId, toId, msgType, message) {
  const from = meta(fromId)
  const to   = meta(toId)
  const result = await api('POST', '/message', {
    fromAgentId: fromId, fromName: from.name, fromIcon: from.icon, fromColor: from.color,
    toAgentId: toId, toName: to.name,
    message, msgType,
  })
  if (result) console.log(`✅ Message sent: ${from.icon} ${from.name} → ${to.icon} ${to.name}`)
}

async function broadcast(fromId, message) {
  const from = meta(fromId)
  const result = await api('POST', '/broadcast', {
    fromAgentId: fromId, fromName: from.name, fromIcon: from.icon, fromColor: from.color,
    message, msgType: 'broadcast',
  })
  if (result) console.log(`📡 Broadcast from ${from.icon} ${from.name}: "${message.slice(0, 80)}"`)
}

async function readInbox(agentId) {
  process.stderr.write(`\nInbox for ${meta(agentId).name}:\n`)
  const msgs = await api('GET', `/inbox/${agentId}`)
  if (!msgs?.length) { process.stderr.write('  (no messages)\n'); return '' }

  const summary = msgs.slice(0, 5).map(m =>
    `[FROM: ${m.fromName} type:${m.msgType} ${new Date(m.createdAt).toLocaleDateString()}]\n${m.message}`
  ).join('\n\n---\n\n')
  process.stderr.write(summary + '\n')

  // Write to $GITHUB_OUTPUT using multiline heredoc format
  const ghOutput = process.env.GITHUB_OUTPUT
  if (ghOutput) {
    const fs = require('fs')
    const safe = summary.replace(/\r/g, '').slice(0, 1000)
    fs.appendFileSync(ghOutput, `inbox_context<<INBOX_EOF\n${safe}\nINBOX_EOF\n`)
  }
  return summary
}

async function readCritical() {
  console.log('\n🚨 Critical memories across all agents:\n')
  const items = await api('GET', '/critical')
  if (!items?.length) { console.log('  (no critical issues)'); return }
  items.forEach(m => console.log(`${m.agentIcon} ${m.agentName}: ${m.content.slice(0, 200)}`))
}

// ── Main ────────────────────────────────────────────────────────────────────
const [,, cmd, ...args] = process.argv

;(async () => {
  switch (cmd) {
    case 'read':      await readMemory(args[0]); break
    case 'write':     await writeMemory(args[0], args[1], args[2], args.slice(3).join(' ')); break
    case 'message':   await sendMessage(args[0], args[1], args[2], args.slice(3).join(' ')); break
    case 'broadcast': await broadcast(args[0], args.slice(1).join(' ')); break
    case 'inbox':     await readInbox(args[0]); break
    case 'critical':  await readCritical(); break
    default:
      console.log(`
KinderSpark Agent Memory CLI

Commands:
  read  <agentId>                        — Read agent's memory
  write <agentId> <type> <importance> <content>  — Write a memory
  message <fromId> <toId> <type> <msg>   — Send message to agent
  broadcast <fromId> <message>           — Broadcast to all agents
  inbox <agentId>                        — Read agent's inbox
  critical                               — Show all critical memories

Types: observation | decision | finding | action | summary | error
Importance: 1 (info) | 2 (medium) | 3 (high) | 4 (critical)
      `)
  }
})().catch(err => { console.error(err.message); process.exit(0) }) // never block CI
