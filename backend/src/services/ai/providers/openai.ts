import OpenAI from 'openai'
import type { AIProvider, AICallOptions } from '../types'

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  return _client
}

export const openaiProvider: AIProvider = {
  name: 'openai',

  available() {
    return !!process.env.OPENAI_API_KEY
  },

  async complete(prompt: string, opts: AICallOptions = {}): Promise<string> {
    const res = await getClient().chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.7,
      messages: [{ role: 'user', content: prompt }],
    })
    return res.choices[0]?.message?.content?.trim() ?? ''
  },
}
