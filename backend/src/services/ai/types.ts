// ── Shared AI provider types ───────────────────────────────────────────────

export type AIProviderName = 'claude' | 'openai' | 'perplexity'

export interface AICallOptions {
  maxTokens?: number
  temperature?: number
  /** Override the default provider for this specific call */
  provider?: AIProviderName
}

export interface AIProvider {
  name: AIProviderName
  available: () => boolean
  complete(prompt: string, opts?: AICallOptions): Promise<string>
}

// ── Task → preferred provider mapping ────────────────────────────────────
// Perplexity = web-search-backed, great for recommendations & reports
// Claude = best for structured JSON generation, tutoring, curriculum
// OpenAI = good general fallback
export const TASK_PROVIDERS: Record<string, AIProviderName[]> = {
  'generate-lesson':    ['openai', 'claude', 'perplexity'],
  'generate-homework':  ['openai', 'claude', 'perplexity'],
  'generate-syllabus':  ['openai', 'claude', 'perplexity'],
  'tutor-feedback':     ['openai', 'claude', 'perplexity'],
  'weekly-report':      ['openai', 'claude', 'perplexity'],
  'student-report':     ['openai', 'claude', 'perplexity'],
  'recommendations':    ['openai', 'claude', 'perplexity'],
}
