import { Router, Request, Response } from 'express'

const router = Router()

// POST /api/diag — lightweight client instrumentation sink
router.post('/', async (req: Request, res: Response) => {
  try {
    const { location, message, data, hypothesisId, timestamp } = req.body || {}
    // Print a compact, single-line log for Railway
    console.log('[DIAG]', JSON.stringify({ location, message, hypothesisId, timestamp: timestamp || Date.now(), data }))
    return res.json({ ok: true })
  } catch (err) {
    console.error('[DIAG_ERROR]', err)
    return res.status(500).json({ ok: false })
  }
})

export default router
