/**
 * Lightweight post-processing filter for AI model output shown to young children.
 * Not a substitute for safe prompts, provider safety settings, or human review.
 */

export const AI_FILTERED_FALLBACK = "Let's try something fun instead! 🌟"

const BLOCK_PATTERNS: RegExp[] = [
  /\b(kill|killed|killing|murder|murdered|stab|stabb?ing|shoot|shooting|gun|rifle|pistol|bomb|terror|violent|violence|blood(y)?|gore|torture)\b/i,
  /\b(die|death|dead|dying|suicide|suicidal|hang\s*yourself|hurt\s*yourself)\b/i,
  /\b(weapon|grenade|knife\s*attack|mass\s*shooting)\b/i,
  /\b(cocaine|heroin|meth(amphetamine)?|overdose|drug\s*deal|fentanyl)\b/i,
  /\b(drunk|vodka|whiskey|bourbon|binge\s*drink|alcoholic)\b/i,
  /\b(nude|naked|porn|porno|pornographic|sexual|rape|molest|pedoph|nsfw)\b/i,
  /\b(genocide|lynch(ing)?|ethnic\s*cleansing|white\s*supremacy|hate\s*crime)\b/i,
]

export function filterAIResponse(text: string): { safe: boolean; filtered: string } {
  const input = text ?? ''
  if (!input.trim()) {
    return { safe: true, filtered: input }
  }
  for (const re of BLOCK_PATTERNS) {
    if (re.test(input)) {
      return { safe: false, filtered: AI_FILTERED_FALLBACK }
    }
  }
  return { safe: true, filtered: input }
}
