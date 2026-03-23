import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AICallOptions } from '../types'

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  return _client
}

export const claudeProvider: AIProvider = {
  name: 'claude',

  available() {
    return !!process.env.ANTHROPIC_API_KEY
  },

  async complete(prompt: string, opts: AICallOptions = {}): Promise<string> {
    const msg = await getClient().messages.create({
      model: DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    return msg.content.map((b: any) => b.text || '').join('').trim()
  },
}
