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

## Auth — Cookie-Only (NO Bearer tokens)
**JWT is in `httpOnly` cookie only** — `kinderspark_token`. Bearer token support was permanently removed.

```typescript
// ✅ CORRECT — cookie-only auth, set by login endpoint
res.cookie('kinderspark_token', jwt, { httpOnly: true, secure: true, sameSite: 'lax' })

// ❌ WRONG — DO NOT use Bearer tokens
// res.json({ token }) → DO NOT DO THIS
// Authorization: Bearer <jwt> → NOT SUPPORTED
```

Every mutating request (POST/PUT/PATCH/DELETE) also requires CSRF:
- Server sets `kinderspark_csrf` cookie (`httpOnly: false`)
- Client reads it and sends as `x-csrf-token` header
- `enforceCsrf` middleware validates both match

## Required Middleware Stack (every protected route)
```typescript
router.get('/endpoint', requireAuth, requireRole('teacher'), handler)
```
1. `requireAuth` — decodes JWT from `kinderspark_token` cookie, attaches `req.user`
2. `requireRole('teacher' | 'parent' | 'child' | 'admin' | 'principal')` — enforces role
3. `rateLimiter` — never disable this
4. `enforceCsrf` — for POST/PUT/PATCH/DELETE (applied globally in app.ts)

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

## RBAC — Use accessControl.ts
```typescript
import { canAccessStudent } from '../utils/accessControl'
// never hand-roll permission checks
if (!canAccessStudent(req.user, studentId)) return res.status(403).json({ error: 'Forbidden' })
```

## AI Routes (backend/src/services/ai/index.ts)
All AI endpoints go through `backend/src/services/ai/` — NOT claude.service.ts directly.
**4-provider fallback chain:** Claude → OpenAI → Perplexity → Gemini (`ai/router.ts`)
**DB-first strategy:** check `CurriculumModule` → check `LessonCache` → call AI
Always sanitize user input with `sanitizePromptInput()` before passing to AI.
Every AI function MUST use the cache pattern — see `.claude/rules/ai-cache.md`.

## Input Sanitization
```typescript
import { sanitizePromptInput } from '../utils/sanitize'
const safe = sanitizePromptInput(req.body.userText)
```
Required for any user-provided text going into AI prompts.

## Frontend API Calls — Use Same-Origin Proxy
`frontend/lib/api.ts` uses `API_BASE = '/api'` (relative, same-origin). Next.js proxies
`/api/*` → backend via `next.config.js` rewrites. This fixes `SameSite=Lax` cross-subdomain
cookie blocking on Railway. **Never change API_BASE back to an absolute URL.**

```typescript
// ✅ All client-side fetch goes through the proxy
import { getClasses } from '@/lib/api'  // calls /api/classes → rewritten to backend

// ❌ Don't bypass the proxy with absolute URLs in new frontend code
fetch('https://kinderspark-backend-production.up.railway.app/api/...')
```

## Security Rules for New Routes
- **Never expose a POST/PUT/PATCH/DELETE endpoint without `requireAuth`**
- **Child role field restriction** — if child can write their own record, whitelist safe fields only (avatar/theme); never allow stars/streak/gamification fields from child role
- **Cross-school ownership** — teachers must have `canTeacherAccessClass` verified before reading/writing/deleting data in a class
- **AI report endpoints** — always gate with `canTeacherAccessClass` for teacher role
- **Atomic writes** — use `prisma.$transaction` when creating 2+ linked records

## Adding a New Route
1. Create `backend/src/routes/myfeature.routes.ts`
2. Create `backend/src/controllers/myfeature.controller.ts` (if needed)
3. Mount in `backend/src/app.ts`: `app.use('/api/myfeature', myfeatureRouter)`
4. Update CLAUDE.md API Routes section
5. Use `requireAuth` + `requireRole` on every protected endpoint
6. Apply `rateLimiter`; use `aiRateLimit` for AI endpoints
