import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware'

const router = Router()

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO  = process.env.GITHUB_REPO || 'himprapatel-rgb/kinderspark-pro'
const GH_API       = `https://api.github.com/repos/${GITHUB_REPO}`

const GH_HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
}

// ── GET /api/agents/runs  (recent workflow runs)
router.get('/runs', requireAuth, requireRole('admin', 'teacher'), async (_req, res) => {
  if (!GITHUB_TOKEN) return res.json([])
  try {
    const r = await fetch(`${GH_API}/actions/runs?per_page=50`, { headers: GH_HEADERS })
    const data = await r.json() as any
    res.json(data.workflow_runs || [])
  } catch {
    res.json([])
  }
})

// ── GET /api/agents/issues  (agent-created issues)
router.get('/issues', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  if (!GITHUB_TOKEN) return res.json([])
  const state = (req.query.state as string) || 'all'
  try {
    const r = await fetch(
      `${GH_API}/issues?state=${state}&per_page=30&labels=agent-auto,critical,weekly-report,security,performance`,
      { headers: GH_HEADERS }
    )
    res.json(await r.json())
  } catch {
    res.json([])
  }
})

// ── GET /api/agents/feed  (SSE real-time stream)
router.get('/feed', requireAuth, requireRole('admin', 'teacher'), async (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const poll = async () => {
    if (!GITHUB_TOKEN) { send('ping', { ts: Date.now() }); return }
    try {
      const [runsRes, issuesRes] = await Promise.all([
        fetch(`${GH_API}/actions/runs?per_page=20`, { headers: GH_HEADERS }),
        fetch(`${GH_API}/issues?state=open&per_page=10&labels=agent-auto,critical`, { headers: GH_HEADERS }),
      ])
      const runs   = (await runsRes.json() as any).workflow_runs || []
      const issues = await issuesRes.json()
      send('update', { runs, issues, ts: Date.now() })
    } catch {
      send('ping', { ts: Date.now() })
    }
  }

  // Send immediately, then every 30s
  await poll()
  const interval = setInterval(poll, 30_000)

  _req.on('close', () => {
    clearInterval(interval)
    res.end()
  })
})

// ── POST /api/agents/trigger  (manually trigger a workflow)
router.post('/trigger', requireAuth, requireRole('admin'), async (req, res) => {
  if (!GITHUB_TOKEN) return res.status(503).json({ error: 'GitHub token not configured' })
  const { workflow, inputs = {} } = req.body as { workflow: string; inputs?: Record<string, string> }
  if (!workflow) return res.status(400).json({ error: 'workflow required' })

  try {
    const r = await fetch(`${GH_API}/actions/workflows/${workflow}/dispatches`, {
      method: 'POST',
      headers: GH_HEADERS,
      body: JSON.stringify({ ref: 'main', inputs }),
    })
    if (r.status === 204) {
      res.json({ ok: true, message: `Triggered ${workflow}` })
    } else {
      const err = await r.text()
      res.status(r.status).json({ error: err })
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/agents/issue  (create an issue for an agent)
router.post('/issue', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
  if (!GITHUB_TOKEN) return res.status(503).json({ error: 'GitHub token not configured' })
  const { title, body, labels = [] } = req.body as { title: string; body: string; labels?: string[] }
  if (!title) return res.status(400).json({ error: 'title required' })

  try {
    const r = await fetch(`${GH_API}/issues`, {
      method: 'POST',
      headers: GH_HEADERS,
      body: JSON.stringify({ title, body, labels }),
    })
    res.json(await r.json())
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
