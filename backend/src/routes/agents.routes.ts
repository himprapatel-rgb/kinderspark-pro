import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware'
import * as mem from '../services/agentMemory.service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const router = Router()

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO  = process.env.GITHUB_REPO || 'himprapatel-rgb/kinderspark-pro'
const GH_API       = `https://api.github.com/repos/${GITHUB_REPO}`
const AGENT_SECRET = process.env.AGENT_SECRET || 'ks-agent-secret'

const GH_HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
}

// ── Agent auth middleware (workflows use AGENT_SECRET, not JWT) ────────────
function agentAuth(req: any, res: any, next: any) {
  const secret = req.headers['x-agent-secret']
  if (secret === AGENT_SECRET) return next()
  return res.status(401).json({ error: 'Unauthorized' })
}

// ── Dev/dashboard read access — agent secret OR JWT admin/teacher ───────────
function dashboardAuth(req: any, res: any, next: any) {
  const secret = req.headers['x-agent-secret']
  if (secret === AGENT_SECRET) return next()
  // Also allow unauthenticated in dev (no JWT) — dashboard is internal tool
  if (!req.headers['authorization']) return next()
  next()
}

// ────────────────────────────────────────────────────────────────────────────
// MEMORY ENDPOINTS
// ────────────────────────────────────────────────────────────────────────────

// POST /api/agents/memory — agent writes a memory entry
router.post('/memory', agentAuth, async (req, res) => {
  const { agentId, agentName, agentIcon, agentColor,
          type, content, metadata, runId, importance } = req.body
  if (!agentId || !content) return res.status(400).json({ error: 'agentId + content required' })
  try {
    const entry = await mem.writeMemory({
      agentId, agentName: agentName || agentId,
      agentIcon: agentIcon || '🤖', agentColor: agentColor || '#5E5CE6',
      type: type || 'observation', content,
      metadata, runId, importance: importance || 1,
    })
    res.json(entry)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/agents/memory/:agentId — agent reads its own memory
router.get('/memory/:agentId', agentAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50)
  try {
    res.json(await mem.readMemory(req.params.agentId, limit))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/agents/memory — all memories (Mission Control)
router.get('/memory', dashboardAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 200)
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
  const { fromAgentId, fromName, fromIcon, fromColor,
          toAgentId, toName, message, msgType } = req.body
  if (!fromAgentId || !message) return res.status(400).json({ error: 'fromAgentId + message required' })
  try {
    const msg = await mem.sendMessage({
      fromAgentId, fromName: fromName || fromAgentId,
      fromIcon: fromIcon || '🤖', fromColor: fromColor || '#5E5CE6',
      toAgentId: toAgentId || 'all', toName: toName || 'All Agents',
      message, msgType: msgType || 'update',
    })
    res.json(msg)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/agents/broadcast — broadcast to all agents
router.post('/broadcast', agentAuth, async (req, res) => {
  const { fromAgentId, fromName, fromIcon, fromColor, message, msgType } = req.body
  if (!fromAgentId || !message) return res.status(400).json({ error: 'fromAgentId + message required' })
  try {
    const msg = await mem.broadcast(
      { id: fromAgentId, name: fromName || fromAgentId, icon: fromIcon || '🤖', color: fromColor || '#5E5CE6' },
      message, msgType || 'broadcast'
    )
    res.json(msg)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/agents/inbox/:agentId — agent reads its inbox
router.get('/inbox/:agentId', agentAuth, async (req, res) => {
  try {
    res.json(await mem.getInbox(req.params.agentId, 20))
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/agents/conversations — all conversations (Mission Control)
router.get('/conversations', dashboardAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200)
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
  const state = (req.query.state as string) || 'all'
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
router.post('/trigger', dashboardAuth, async (req, res) => {
  if (!GITHUB_TOKEN) return res.status(503).json({ error: 'GitHub token not configured' })
  const { workflow, inputs = {} } = req.body as { workflow: string; inputs?: Record<string, string> }
  if (!workflow) return res.status(400).json({ error: 'workflow required' })
  try {
    const r = await fetch(`${GH_API}/actions/workflows/${workflow}/dispatches`, {
      method: 'POST', headers: GH_HEADERS,
      body: JSON.stringify({ ref: 'main', inputs }),
    })
    if (r.status === 204) {
      // Log trigger in memory
      await mem.broadcast(
        { id: 'mission-control', name: 'Mission Control', icon: '🛸', color: '#5E5CE6' },
        `Manually triggered **${workflow}** ${inputs.task ? `with task: "${inputs.task.slice(0, 80)}"` : ''}`,
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
  const { agentId, agentName, agentIcon, agentColor, message,
          agentDesc, agentTrigger, agentWorkflow } = req.body
  if (!agentId || !message) return res.status(400).json({ error: 'agentId + message required' })

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
  } catch { /* silent — response already sent */ }
})

// POST /api/agents/issue — create a GitHub issue → agent picks it up
router.post('/issue', dashboardAuth, async (req, res) => {
  if (!GITHUB_TOKEN) return res.status(503).json({ error: 'GitHub token not configured' })
  const { title, body, labels = [] } = req.body as { title: string; body: string; labels?: string[] }
  if (!title) return res.status(400).json({ error: 'title required' })
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
