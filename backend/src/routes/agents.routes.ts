import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import * as mem from '../services/agentMemory.service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const router = Router()

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO  = process.env.GITHUB_REPO || 'himprapatel-rgb/kinderspark-pro'
const GH_API       = `https://api.github.com/repos/${GITHUB_REPO}`
const AGENT_SECRET = process.env.AGENT_SECRET?.trim()
const AGENT_TRIGGER_WORKFLOWS = new Set(
  (process.env.AGENT_TRIGGER_WORKFLOWS || 'agent-localization.yml')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
)
const AGENT_ALLOWED_ISSUE_LABELS = new Set(
  (process.env.AGENT_ALLOWED_ISSUE_LABELS || 'agent-auto,critical,weekly-report,security,performance')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
)

const GH_HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
}

type AnyRecord = Record<string, unknown>

// ── Agent auth middleware (workflows use AGENT_SECRET, not JWT) ────────────
function agentAuth(req: any, res: any, next: any) {
  if (!AGENT_SECRET) return res.status(503).json({ error: 'Agent auth not configured' })
  const secret = req.headers['x-agent-secret']
  if (secret === AGENT_SECRET) return next()
  return res.status(401).json({ error: 'Unauthorized' })
}

// ── Dev/dashboard read access — agent secret OR JWT admin/teacher ───────────
function dashboardAuth(req: any, res: any, next: any) {
  const secret = req.headers['x-agent-secret']
  if (AGENT_SECRET && secret === AGENT_SECRET) return next()
  return requireAuth(req, res, () => requireRole('admin', 'teacher')(req, res, next))
}

function dashboardAdminOrAgentAuth(req: any, res: any, next: any) {
  const secret = req.headers['x-agent-secret']
  if (AGENT_SECRET && secret === AGENT_SECRET) return next()
  return requireAuth(req, res, () => requireRole('admin')(req, res, next))
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function parseLimitedInt(input: unknown, fallback: number, max: number): number {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), max)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isMemoryType(value: unknown): value is 'observation' | 'decision' | 'finding' | 'action' | 'summary' | 'error' {
  return typeof value === 'string' && ['observation', 'decision', 'finding', 'action', 'summary', 'error'].includes(value)
}

function isMessageType(value: unknown): value is 'alert' | 'handoff' | 'question' | 'update' | 'broadcast' | 'fix' {
  return typeof value === 'string' && ['alert', 'handoff', 'question', 'update', 'broadcast', 'fix'].includes(value)
}

function isImportance(value: unknown): value is 1 | 2 | 3 | 4 {
  const num = Number(value)
  return Number.isInteger(num) && num >= 1 && num <= 4
}

// ────────────────────────────────────────────────────────────────────────────
// MEMORY ENDPOINTS
// ────────────────────────────────────────────────────────────────────────────

// POST /api/agents/memory — agent writes a memory entry
router.post('/memory', agentAuth, async (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid request body' })
  const { agentId, agentName, agentIcon, agentColor,
          type, content, metadata, runId, importance } = req.body as AnyRecord
  if (!isNonEmptyString(agentId) || !isNonEmptyString(content)) {
    return res.status(400).json({ error: 'agentId + content required' })
  }
  if (!isOptionalString(agentName) || !isOptionalString(agentIcon) || !isOptionalString(agentColor) || !isOptionalString(runId)) {
    return res.status(400).json({ error: 'Invalid request fields' })
  }
  if (type !== undefined && !isMemoryType(type)) return res.status(400).json({ error: 'Invalid memory type' })
  if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata))) {
    return res.status(400).json({ error: 'metadata must be an object' })
  }
  if (importance !== undefined && !isImportance(importance)) {
    return res.status(400).json({ error: 'importance must be an integer from 1 to 4' })
  }
  const safeType: 'observation' | 'decision' | 'finding' | 'action' | 'summary' | 'error' = isMemoryType(type) ? type : 'observation'
  const safeImportance: 1 | 2 | 3 | 4 = isImportance(importance) ? importance : 1
  try {
    const entry = await mem.writeMemory({
      agentId, agentName: agentName || agentId,
      agentIcon: agentIcon || '🤖', agentColor: agentColor || '#5E5CE6',
      type: safeType, content,
      metadata: metadata as Record<string, unknown> | undefined,
      runId,
      importance: safeImportance,
    })
    res.json(entry)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/agents/memory/:agentId — agent reads its own memory
router.get('/memory/:agentId', agentAuth, async (req, res) => {
  if (!isNonEmptyString(req.params.agentId)) return res.status(400).json({ error: 'agentId required' })
  const limit = parseLimitedInt(req.query.limit, 20, 50)
  try {
    res.json(await mem.readMemory(req.params.agentId, limit))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/agents/memory — all memories (Mission Control)
router.get('/memory', dashboardAuth, async (req, res) => {
  const limit = parseLimitedInt(req.query.limit, 100, 200)
  try {
    res.json(await mem.getAllMemories(limit))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/agents/critical — high-importance memories across all agents
router.get('/critical', agentAuth, async (_req, res) => {
  try {
    res.json(await mem.readCriticalMemories(3, 10))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────
// CONVERSATION ENDPOINTS
// ────────────────────────────────────────────────────────────────────────────

// POST /api/agents/message — agent sends a message to another agent
router.post('/message', agentAuth, async (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid request body' })
  const { fromAgentId, fromName, fromIcon, fromColor,
          toAgentId, toName, message, msgType } = req.body as AnyRecord
  if (!isNonEmptyString(fromAgentId) || !isNonEmptyString(message)) {
    return res.status(400).json({ error: 'fromAgentId + message required' })
  }
  if (!isOptionalString(fromName) || !isOptionalString(fromIcon) || !isOptionalString(fromColor) ||
      !isOptionalString(toAgentId) || !isOptionalString(toName) || !isOptionalString(msgType)) {
    return res.status(400).json({ error: 'Invalid request fields' })
  }
  if (msgType !== undefined && !isMessageType(msgType)) return res.status(400).json({ error: 'Invalid message type' })
  const safeMessageType: 'alert' | 'handoff' | 'question' | 'update' | 'broadcast' | 'fix' = isMessageType(msgType) ? msgType : 'update'
  try {
    const msg = await mem.sendMessage({
      fromAgentId, fromName: fromName || fromAgentId,
      fromIcon: fromIcon || '🤖', fromColor: fromColor || '#5E5CE6',
      toAgentId: toAgentId || 'all', toName: toName || 'All Agents',
      message, msgType: safeMessageType,
    })
    res.json(msg)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/agents/broadcast — broadcast to all agents
router.post('/broadcast', agentAuth, async (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid request body' })
  const { fromAgentId, fromName, fromIcon, fromColor, message, msgType } = req.body as AnyRecord
  if (!isNonEmptyString(fromAgentId) || !isNonEmptyString(message)) {
    return res.status(400).json({ error: 'fromAgentId + message required' })
  }
  if (!isOptionalString(fromName) || !isOptionalString(fromIcon) || !isOptionalString(fromColor) || !isOptionalString(msgType)) {
    return res.status(400).json({ error: 'Invalid request fields' })
  }
  if (msgType !== undefined && !isMessageType(msgType)) return res.status(400).json({ error: 'Invalid message type' })
  const safeBroadcastType: 'alert' | 'handoff' | 'question' | 'update' | 'broadcast' | 'fix' = isMessageType(msgType) ? msgType : 'broadcast'
  try {
    const msg = await mem.broadcast(
      { id: fromAgentId, name: fromName || fromAgentId, icon: fromIcon || '🤖', color: fromColor || '#5E5CE6' },
      message, safeBroadcastType
    )
    res.json(msg)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/agents/inbox/:agentId — agent reads its inbox
router.get('/inbox/:agentId', agentAuth, async (req, res) => {
  if (!isNonEmptyString(req.params.agentId)) return res.status(400).json({ error: 'agentId required' })
  try {
    res.json(await mem.getInbox(req.params.agentId, 20))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/agents/conversations — all conversations (Mission Control)
router.get('/conversations', dashboardAuth, async (req, res) => {
  const limit = parseLimitedInt(req.query.limit, 50, 200)
  try {
    res.json(await mem.getAllConversations(limit))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/agents/conversations/:id/resolve
router.patch('/conversations/:id/resolve', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    res.json(await mem.resolveConversation(req.params.id, req.user!.id))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/agents/stats — agent activity stats
router.get('/stats', dashboardAuth, async (_req, res) => {
  try {
    res.json(await mem.getAgentStats())
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ────────────────────────────────────────────────────────────────────────────
// GITHUB ACTIONS PROXY ENDPOINTS
// ────────────────────────────────────────────────────────────────────────────

// GET /api/agents/runs
router.get('/runs', dashboardAuth, async (_req, res) => {
  if (!GITHUB_TOKEN) return res.json([])
  try {
    const r = await fetch(`${GH_API}/actions/runs?per_page=50`, { headers: GH_HEADERS })
    const data = await r.json() as any
    res.json(data.workflow_runs || [])
  } catch { res.json([]) }
})

// GET /api/agents/issues
router.get('/issues', dashboardAuth, async (req, res) => {
  if (!GITHUB_TOKEN) return res.json([])
  const requestedState = req.query.state
  const allowedStates = new Set(['open', 'closed', 'all'])
  const state = typeof requestedState === 'string' && allowedStates.has(requestedState) ? requestedState : 'all'
  try {
    const r = await fetch(
      `${GH_API}/issues?state=${state}&per_page=30&labels=agent-auto,critical,weekly-report,security,performance`,
      { headers: GH_HEADERS }
    )
    res.json(await r.json())
  } catch { res.json([]) }
})

// GET /api/agents/feed — SSE real-time stream (memories + runs + conversations)
router.get('/feed', requireAuth, requireRole('admin', 'teacher'), async (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)

  const poll = async () => {
    try {
      const [memories, conversations, criticals] = await Promise.all([
        mem.getAllMemories(30),
        mem.getAllConversations(30),
        mem.readCriticalMemories(4, 5),
      ])
      let runs: any[] = [], issues: any[] = []
      if (GITHUB_TOKEN) {
        const [runsRes, issuesRes] = await Promise.all([
          fetch(`${GH_API}/actions/runs?per_page=20`, { headers: GH_HEADERS }),
          fetch(`${GH_API}/issues?state=open&per_page=10&labels=agent-auto,critical`, { headers: GH_HEADERS }),
        ])
        runs   = (await runsRes.json() as any).workflow_runs || []
        issues = (await issuesRes.json()) as any[]
      }
      send('update', { memories, conversations, criticals, runs, issues, ts: Date.now() })
    } catch {
      send('ping', { ts: Date.now() })
    }
  }

  await poll()
  const interval = setInterval(poll, 15_000)
  _req.on('close', () => { clearInterval(interval); res.end() })
})

// POST /api/agents/trigger — manually trigger a workflow
router.post('/trigger', dashboardAdminOrAgentAuth, async (req, res) => {
  if (!GITHUB_TOKEN) return res.status(503).json({ error: 'GitHub token not configured' })
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid request body' })
  const { workflow, inputs = {} } = req.body as { workflow?: unknown; inputs?: unknown }
  if (!isNonEmptyString(workflow)) return res.status(400).json({ error: 'workflow required' })
  if (!AGENT_TRIGGER_WORKFLOWS.has(workflow)) {
    return res.status(403).json({ error: 'workflow not allowed' })
  }
  if (typeof inputs !== 'object' || inputs === null || Array.isArray(inputs)) {
    return res.status(400).json({ error: 'inputs must be an object' })
  }
  const inputValues = Object.values(inputs as Record<string, unknown>)
  if (!inputValues.every((value) => typeof value === 'string')) {
    return res.status(400).json({ error: 'inputs values must be strings' })
  }
  const safeInputs = inputs as Record<string, string>
  try {
    const r = await fetch(`${GH_API}/actions/workflows/${workflow}/dispatches`, {
      method: 'POST', headers: GH_HEADERS,
      body: JSON.stringify({ ref: 'main', inputs: safeInputs }),
    })
    if (r.status === 204) {
      // Log trigger in memory
      await mem.broadcast(
        { id: 'mission-control', name: 'Mission Control', icon: '🛸', color: '#5E5CE6' },
        `Manually triggered **${workflow}** ${safeInputs.task ? `with task: "${safeInputs.task.slice(0, 80)}"` : ''}`,
        'update'
      )
      res.json({ ok: true })
    } else {
      res.status(r.status).json({ error: await r.text() })
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/agents/ask — commander sends a message to a specific agent.
// Agent responds instantly via Claude API. If the message is a task/command,
// Claude appends [TRIGGER_WORKFLOW] and we dispatch the real agent workflow.
router.post('/ask', dashboardAuth, async (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid request body' })
  const { agentId, agentName, agentIcon, agentColor, message,
          agentDesc, agentTrigger, agentWorkflow } = req.body as AnyRecord
  if (!isNonEmptyString(agentId) || !isNonEmptyString(message)) {
    return res.status(400).json({ error: 'agentId + message required' })
  }
  if (!isOptionalString(agentName) || !isOptionalString(agentIcon) || !isOptionalString(agentColor) ||
      !isOptionalString(agentDesc) || !isOptionalString(agentTrigger) || !isOptionalString(agentWorkflow)) {
    return res.status(400).json({ error: 'Invalid request fields' })
  }

  // Return immediately so the UI feels snappy — all AI work is fire-and-forget
  res.json({ ok: true })

  try {
    // 1. Save the user's message
    await mem.sendMessage({
      fromAgentId: 'commander',
      fromName: 'You',
      fromIcon: '🧑‍💻',
      fromColor: '#5E5CE6',
      toAgentId: agentId,
      toName: agentName || agentId,
      message,
      msgType: 'question',
    })

    if (!process.env.ANTHROPIC_API_KEY) return

    // 2. Ask Claude to respond in-character, marking tasks with [TRIGGER_WORKFLOW]
    const aiRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are ${agentName || agentId} (${agentIcon || '🤖'}), an autonomous AI agent for KinderSpark Pro.
Your role: ${agentDesc || 'autonomous AI agent'}. Triggered by: ${agentTrigger || 'scheduled jobs and commands'}.
You are talking directly with the commander (the human developer/owner of the app).

CRITICAL RULES:
- If the commander sends a TASK or COMMAND ("check X", "fix Y", "make Z better", "improve", "work away", "complete", "audit", "optimize", "review", "analyse", "run X") — respond with a short confirmation of what you're starting RIGHT NOW (1 sentence), then on a new line write exactly: [TRIGGER_WORKFLOW]
- If they ask a QUESTION ("what are you doing?", "how does X work?", "what's your status?") — answer directly in 1-2 sentences, no [TRIGGER_WORKFLOW].
- NEVER ask for clarification. If a task is vague, make a sensible assumption and start.
- Do not use markdown, headers, or bullet points. Write naturally.
- Stay in character as ${agentName}.`,
      messages: [{ role: 'user', content: message }],
    })

    let reply = ((aiRes.content[0] as any).text || '').trim()
    const shouldTrigger = reply.includes('[TRIGGER_WORKFLOW]')
    reply = reply.replace('[TRIGGER_WORKFLOW]', '').trim()

    // 3. Post the agent's reply to chat
    if (reply) {
      await mem.sendMessage({
        fromAgentId: agentId,
        fromName: agentName || agentId,
        fromIcon: agentIcon || '🤖',
        fromColor: agentColor || '#5E5CE6',
        toAgentId: 'commander',
        toName: 'You',
        message: reply,
        msgType: 'update',
      })
    }

    // 4. If it was a task, trigger the real agent workflow
    if (shouldTrigger && GITHUB_TOKEN && agentWorkflow) {
      await fetch(`${GH_API}/actions/workflows/${agentWorkflow}/dispatches`, {
        method: 'POST', headers: GH_HEADERS,
        body: JSON.stringify({
          ref: 'main',
          // send both keys — different workflows use different input names
          inputs: { task: message, agent_task: message, triggered_by: 'commander' },
        }),
      }).catch(() => {/* non-blocking */})
    }
  } catch (e: any) {
    // Response is already sent, so surface async failures through logs and agent feed.
    const message = e instanceof Error ? e.message : String(e)
    console.error('[agents:/ask] async failure', { agentId, error: message })
    try {
      await mem.broadcast(
        { id: 'mission-control', name: 'Mission Control', icon: '🛸', color: '#5E5CE6' },
        `Agent ask failed for ${agentName || agentId}: ${message.slice(0, 180)}`,
        'alert'
      )
    } catch {
      // Avoid recursive failure loops from observability path.
    }
  }
})

// POST /api/agents/issue — create a GitHub issue → agent picks it up
router.post('/issue', dashboardAdminOrAgentAuth, async (req, res) => {
  if (!GITHUB_TOKEN) return res.status(503).json({ error: 'GitHub token not configured' })
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid request body' })
  const { title, body, labels = [] } = req.body as { title?: unknown; body?: unknown; labels?: unknown }
  if (!isNonEmptyString(title)) return res.status(400).json({ error: 'title required' })
  if (title.length > 160) return res.status(400).json({ error: 'title too long' })
  if (body !== undefined && typeof body !== 'string') return res.status(400).json({ error: 'body must be a string' })
  if (typeof body === 'string' && body.length > 10_000) return res.status(400).json({ error: 'body too long' })
  if (!isStringArray(labels)) return res.status(400).json({ error: 'labels must be a string array' })
  if (labels.length > 10) return res.status(400).json({ error: 'too many labels' })
  if (!labels.every((label) => AGENT_ALLOWED_ISSUE_LABELS.has(label))) {
    return res.status(400).json({ error: 'one or more labels are not allowed' })
  }
  try {
    const r = await fetch(`${GH_API}/issues`, {
      method: 'POST', headers: GH_HEADERS,
      body: JSON.stringify({ title, body, labels }),
    })
    const issue = await r.json() as any
    // Broadcast to relevant agents
    await mem.broadcast(
      { id: 'mission-control', name: 'Mission Control', icon: '🛸', color: '#5E5CE6' },
      `New task created: "${title}" (Issue #${issue.number}) — labels: ${(labels as string[]).join(', ')}`,
      'handoff'
    )
    res.json(issue)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

export default router
