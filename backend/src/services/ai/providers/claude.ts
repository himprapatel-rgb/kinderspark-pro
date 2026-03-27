import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AICallOptions } from '../types'

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  return _client
}

// Circuit breaker: after 3 consecutive billing errors, disable for 30 minutes
let consecutiveFailures = 0
let disabledUntil = 0
const MAX_FAILURES = 3
const COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes

export const claudeProvider: AIProvider = {
  name: 'claude',

  available() {
    if (!process.env.ANTHROPIC_API_KEY) return false
    if (Date.now() < disabledUntil) return false
    return true
  },

  async complete(prompt: string, opts: AICallOptions = {}): Promise<string> {
    try {
      const msg = await getClient().messages.create({
        model: DEFAULT_MODEL,
        max_tokens: opts.maxTokens ?? 1024,
        messages: [{ role: 'user', content: prompt }],
      })
      consecutiveFailures = 0
      return msg.content.map((b: any) => b.text || '').join('').trim()
    } catch (err: any) {
      const errMsg = err?.message || ''
      // Billing / credit errors → circuit breaker
      if (errMsg.includes('credit balance') || errMsg.includes('billing') || errMsg.includes('402')) {
        consecutiveFailures++
        if (consecutiveFailures >= MAX_FAILURES) {
          disabledUntil = Date.now() + COOLDOWN_MS
          console.log(`[Claude] ⚡ Circuit breaker open — disabled for 30 min (no credits)`)
          consecutiveFailures = 0
        }
      }
      throw err
    }
  },
}
