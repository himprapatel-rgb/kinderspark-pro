---
path: "backend/src/services/ai/**"
---

# HARDCORE RULE — Every AI Response MUST Be Cached

## The Rule (NO EXCEPTIONS)

**Before calling any AI API, check the cache.
After getting any AI response, save it to the cache.**

This is non-negotiable. Every AI-generated response — lessons, feedback, reports,
homework ideas, syllabuses, recommendations — MUST be read from and written to
`AIResponseCache` via `cache.service.ts`.

---

## Why

AI API calls cost money and take time.
The same prompt with the same inputs will always produce equivalent output.
There is ZERO reason to call the API twice for the same inputs.

---

## The Pattern (always do this)

```typescript
import { makeCacheKey, getCachedResponse, setCachedResponse } from '../cache.service'

export async function generateSomething(param1: string, param2: number): Promise<SomeType> {
  // 1. Build a deterministic cache key from ALL inputs
  const cacheKey = makeCacheKey('type-name', { param1, param2 })

  // 2. Check cache FIRST
  const cached = await getCachedResponse(cacheKey)
  if (cached) return JSON.parse(cached)   // or: return cached (for strings)

  // 3. Only call AI if cache miss
  const { text } = await aiComplete('type-name', `...prompt...`, { maxTokens: N })

  // 4. ALWAYS save to cache before returning
  await setCachedResponse(cacheKey, 'type-name', text, 'claude-sonnet-4-6')

  return parseResult(text)
}
```

---

## Cache Types and TTLs

| Type | TTL | Reason |
|------|-----|--------|
| `lesson` | 7 days | Flashcard content is stable |
| `syllabus` | 7 days | Curriculum doesn't change often |
| `homework` | 3 days | Homework ideas are reusable |
| `report` | 1 day | Reports reflect recent data |
| `feedback` | 1 day | Feedback can be slightly stale |
| `recommendations` | 12 hours | Recommendations should be fresh-ish |

---

## What Counts as "Same Inputs"

Use ALL parameters that affect the output as the cache key:
- `generateLesson(topic, count)` → key from `{ topic, count }`
- `generateTutorFeedback(correct, total, topic, maxLevel)` → key from all 4
- `generateHomeworkIdea(topic, grade, studentCount)` → key from all 3
- For reports/recommendations: use the data summary string as key (not studentId alone)

---

## When Adding a New AI Function

Checklist — MUST complete all 3 steps:
1. ☑ `makeCacheKey('type', { ...allInputParams })`
2. ☑ `getCachedResponse(key)` check before AI call
3. ☑ `setCachedResponse(key, type, text, model)` after AI call

If you write an AI function without caching, it WILL be caught in code review
and you MUST go back and add it.

---

## The Cache Service

Location: `backend/src/services/cache.service.ts`
DB model: `AIResponseCache` (Prisma)
Fields: `cacheKey (unique SHA-256)`, `type`, `response (Text)`, `model`, `hitCount`, `expiresAt`
