// ── Shared AI provider types ───────────────────────────────────────────────

export type AIProviderName = 'claude' | 'openai' | 'perplexity' | 'gemini'

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
// Gemini   = FREE tier (15 RPM, 1500 RPD) — preferred to save costs
// Claude   = best for structured JSON generation, tutoring, curriculum
// OpenAI   = good general fallback
// Perplexity = web-search-backed, great for recommendations & reports
export const TASK_PROVIDERS: Record<string, AIProviderName[]> = {
  'generate-lesson':    ['gemini', 'claude', 'openai', 'perplexity'],
  'generate-homework':  ['gemini', 'claude', 'openai', 'perplexity'],
  'generate-syllabus':  ['gemini', 'claude', 'openai', 'perplexity'],
  'tutor-feedback':     ['gemini', 'claude', 'openai', 'perplexity'],
  'weekly-report':      ['gemini', 'claude', 'openai', 'perplexity'],
  'student-report':     ['gemini', 'claude', 'openai', 'perplexity'],
  'recommendations':    ['gemini', 'claude', 'openai', 'perplexity'],
  /** Long-form creative text — Claude first for quality */
  'poem-listen-spark':  ['claude', 'gemini', 'openai', 'perplexity'],
  /** Short tutoring nudge from one-line learner spark */
  'tutor-hint-spark':   ['gemini', 'claude', 'openai', 'perplexity'],
  'agent-think':        ['gemini', 'claude', 'openai'],
  'agent-chat':         ['gemini', 'claude', 'openai'],
  'caption':            ['gemini', 'claude', 'openai'],
}
