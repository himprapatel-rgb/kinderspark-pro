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
  'generate-lesson':    ['claude', 'openai', 'perplexity'],
  'generate-homework':  ['claude', 'openai', 'perplexity'],
  'generate-syllabus':  ['claude', 'openai', 'perplexity'],
  'tutor-feedback':     ['claude', 'openai', 'perplexity'],
  'weekly-report':      ['claude', 'openai', 'perplexity'],
  'student-report':     ['claude', 'openai', 'perplexity'],
  'recommendations':    ['claude', 'openai', 'perplexity'],
}
