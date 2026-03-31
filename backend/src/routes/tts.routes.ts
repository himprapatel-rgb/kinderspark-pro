import { Router, Request, Response } from 'express'
import { synthesize, TTSProfile } from '../services/tts.service'
import { sanitizePromptInput } from '../utils/sanitize'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

/**
 * POST /api/tts
 * Body: { text, language?, profile? }
 * Returns: { dataUrl, provider } or 404 if no TTS provider configured
 *
 * dataUrl is a data:audio/mp3;base64,... string ready for new Audio(dataUrl).play()
 * Cached in AIResponseCache — same inputs never hit the API twice.
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const { text, language = 'en', profile = 'auto' } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })

  const safeText = sanitizePromptInput(text, 300)
  if (!safeText) return res.status(400).json({ error: 'text required' })

  const safeProfile: TTSProfile =
    profile === 'girl' || profile === 'boy' ? profile : 'auto'
  const safeLang = typeof language === 'string' ? language.slice(0, 5) : 'en'

  try {
    const result = await synthesize(safeText, safeLang, safeProfile)
    if (!result) {
      // No TTS providers configured — tell frontend to use Web Speech API
      return res.status(503).json({ error: 'no_tts_provider', fallback: true })
    }
    return res.json(result)
  } catch (err) {
    console.error('[TTS route]', err)
    return res.status(503).json({ error: 'tts_failed', fallback: true })
  }
})

export default router
