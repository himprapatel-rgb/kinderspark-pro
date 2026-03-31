---
name: api-conventions
description: KinderSpark Pro backend API conventions. Use when creating or editing routes, controllers, services, or any backend code. Covers auth middleware, response format, error handling, and role gating.
---

# KinderSpark API Conventions

## Response Format
- **Success**: return resource directly — no wrapper object
  ```json
  { "id": "...", "name": "..." }
  ```
- **Error**: always use this shape
  ```json
  { "error": "Human-readable message" }
  ```
- All IDs are CUID strings (never integers)

## Required Middleware Stack (every protected route)
```typescript
router.get('/endpoint', requireAuth, requireRole('teacher'), handler)
```
1. `requireAuth` — decodes JWT, attaches `req.user`
2. `requireRole('teacher' | 'parent' | 'child' | 'admin')` — enforces role
3. `rateLimiter` — never disable this

## Auth Rules
- **Always use `req.user.id`** from the decoded JWT — never trust `req.body.userId` or query params for identity
- JWT payload shape: `{ id, role, name }`
- Token comes from `Authorization: Bearer <jwt>` header

## Controller Pattern (thin controllers)
```typescript
// controllers/example.controller.ts
export const getItem = async (req: Request, res: Response) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params.id } })
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json(item)
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}
```
- Controllers are thin — validate input, call service or Prisma, return response
- Business logic lives in `services/`
- Never put raw SQL or complex logic in controllers

## Prisma Rules
- Always use Prisma ORM methods — never raw queries with user input
- Use `prisma` singleton from `backend/src/prisma/client.ts`
- Cascade deletes are defined in schema — don't manually delete related records

## AI Routes (backend/src/routes/ai.routes.ts)
All AI endpoints go through `backend/src/services/ai/` — NOT claude.service.ts directly.
The AI service has a 3-provider fallback: Claude → OpenAI → Perplexity.
Always sanitize user input with `sanitizePromptInput()` before passing to AI.

## Input Sanitization
```typescript
import { sanitizePromptInput } from '../utils/sanitize'
const safe = sanitizePromptInput(req.body.userText)
```
Required for any user-provided text going into AI prompts.

## Adding a New Route
1. Create `backend/src/routes/myfeature.routes.ts`
2. Create `backend/src/controllers/myfeature.controller.ts`
3. Mount in `backend/src/app.ts`: `app.use('/api/myfeature', myfeatureRouter)`
4. Update CLAUDE.md API Conventions section
