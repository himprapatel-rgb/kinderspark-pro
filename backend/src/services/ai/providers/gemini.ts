import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider, AICallOptions } from '../types'

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

let _client: GoogleGenerativeAI | null = null
function getClient(): GoogleGenerativeAI {
  if (!_client) _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  return _client
}

// Circuit breaker: after 1 quota error, disable for 30 minutes
// (limit:0 means the API isn't enabled — retrying is pointless)
let consecutiveFailures = 0
let disabledUntil = 0
const MAX_FAILURES = 1
const COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes

export const geminiProvider: AIProvider = {
  name: 'gemini',

  available() {
    if (!process.env.GEMINI_API_KEY) return false
    if (Date.now() < disabledUntil) return false // circuit open
    return true
  },

  async complete(prompt: string, opts: AICallOptions = {}): Promise<string> {
    const model = getClient().getGenerativeModel({
      model: DEFAULT_MODEL,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
      },
    })
    try {
      const result = await model.generateContent(prompt)
      consecutiveFailures = 0 // reset on success
      return result.response.text().trim()
    } catch (err: any) {
      const msg = err?.message || ''
      // 429 or quota errors → increment circuit breaker
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        consecutiveFailures++
        if (consecutiveFailures >= MAX_FAILURES) {
          disabledUntil = Date.now() + COOLDOWN_MS
          console.log(`[Gemini] ⚡ Circuit breaker open — disabled for 10 min after ${consecutiveFailures} failures`)
          consecutiveFailures = 0
        }
      }
      throw err // re-throw so router tries next provider
    }
  },
}
