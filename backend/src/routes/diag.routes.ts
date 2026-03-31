import { Router, Request, Response } from 'express'

const router = Router()

// In-memory ring buffer of recent events (non-persistent; for debugging)
const RECENT: Array<{ ts: number; location?: string; message?: string; hypothesisId?: string; data?: any }> = []
const MAX_EVENTS = 200

// POST /api/diag — lightweight client instrumentation sink
router.post('/', async (req: Request, res: Response) => {
  try {
    const { location, message, data, hypothesisId, timestamp } = req.body || {}
    // Print a compact, single-line log for Railway
    console.log('[DIAG]', JSON.stringify({ location, message, hypothesisId, timestamp: timestamp || Date.now(), data }))
    // Push into ring buffer
    const entry = { ts: timestamp || Date.now(), location, message, hypothesisId, data }
    RECENT.push(entry)
    if (RECENT.length > MAX_EVENTS) RECENT.splice(0, RECENT.length - MAX_EVENTS)
    return res.json({ ok: true })
  } catch (err) {
    console.error('[DIAG_ERROR]', err)
    return res.status(500).json({ ok: false })
  }
})

// GET /api/diag/recent — fetch recent instrumentation (last 200)
router.get('/recent', (_req: Request, res: Response) => {
  res.json({ ok: true, count: RECENT.length, events: RECENT.slice(-MAX_EVENTS) })
})

export default router
