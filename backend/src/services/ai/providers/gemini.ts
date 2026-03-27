import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider, AICallOptions } from '../types'

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

let _client: GoogleGenerativeAI | null = null
function getClient(): GoogleGenerativeAI {
  if (!_client) _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  return _client
}

export const geminiProvider: AIProvider = {
  name: 'gemini',

  available() {
    return !!process.env.GEMINI_API_KEY
  },

  async complete(prompt: string, opts: AICallOptions = {}): Promise<string> {
    const model = getClient().getGenerativeModel({
      model: DEFAULT_MODEL,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
      },
    })
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  },
}
