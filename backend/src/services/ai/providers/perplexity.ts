// Perplexity uses an OpenAI-compatible API — sonar models have live web search built in
import OpenAI from 'openai'
import type { AIProvider, AICallOptions } from '../types'

const DEFAULT_MODEL = process.env.PERPLEXITY_MODEL || 'llama-3.1-sonar-small-128k-online'
const BASE_URL = 'https://api.perplexity.ai'

let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY!,
      baseURL: BASE_URL,
    })
  }
  return _client
}

export const perplexityProvider: AIProvider = {
  name: 'perplexity',

  available() {
    return !!process.env.PERPLEXITY_API_KEY
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
