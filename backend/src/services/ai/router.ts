// ── AI Router — picks the best available provider with fallback ────────────
import { claudeProvider }     from './providers/claude'
import { openaiProvider }     from './providers/openai'
import { perplexityProvider } from './providers/perplexity'
import { geminiProvider }     from './providers/gemini'
import type { AIProvider, AIProviderName, AICallOptions } from './types'
import { TASK_PROVIDERS } from './types'

const ALL_PROVIDERS: Record<AIProviderName, AIProvider> = {
  gemini:     geminiProvider,
  claude:     claudeProvider,
  openai:     openaiProvider,
  perplexity: perplexityProvider,
}

/**
 * Complete a prompt using the best available provider for the given task.
 * Falls back down the preference list if a provider is unavailable or errors.
 *
 * @param task   Key from TASK_PROVIDERS (e.g. 'generate-lesson')
 * @param prompt The full prompt string
 * @param opts   Optional overrides (maxTokens, temperature, explicit provider)
 */
export async function aiComplete(
  task: string,
  prompt: string,
  opts: AICallOptions = {}
): Promise<{ text: string; provider: AIProviderName }> {
  // Build preference list: explicit override first, then task defaults, then all providers
  let order: AIProviderName[] = opts.provider
    ? [opts.provider, ...(TASK_PROVIDERS[task] ?? []).filter(p => p !== opts.provider)]
    : (TASK_PROVIDERS[task] ?? ['gemini', 'claude', 'openai', 'perplexity'])

  // Only keep providers that have credentials configured
  const available = order.filter(name => ALL_PROVIDERS[name].available())

  if (available.length === 0) {
    throw new Error(
      `No AI provider configured. Set GEMINI_API_KEY (free!), ANTHROPIC_API_KEY, OPENAI_API_KEY, or PERPLEXITY_API_KEY.`
    )
  }

  let lastError: unknown
  for (const name of available) {
    try {
      const text = await ALL_PROVIDERS[name].complete(prompt, opts)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[AI] ${task} → ${name}`)
      }
      return { text, provider: name }
    } catch (err) {
      console.warn(`[AI] ${name} failed for task "${task}":`, (err as any)?.message ?? err)
      lastError = err
    }
  }

  throw lastError
}

/** Return which providers are currently configured (for health/admin endpoints) */
export function getProviderStatus(): Record<AIProviderName, boolean> {
  return {
    gemini:     geminiProvider.available(),
    claude:     claudeProvider.available(),
    openai:     openaiProvider.available(),
    perplexity: perplexityProvider.available(),
  }
}
