# KinderSpark Pro — Claude Memory File

> This file is Claude's persistent brain for this project.
> Read it fully at the start of every session.
> **Update this file whenever a new core feature, model, route, or rule is added.**

---

## What This App Is

**KinderSpark Pro** — AI-powered kindergarten learning platform for children aged 4–10.
Connects **teachers**, **parents**, **children**, and **admins** in one app.

**Live on Railway.** Auto-deploys on push to `main`.

---

## Tech Stack

| Layer      | Tech                                              |
|------------|---------------------------------------------------|
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| State      | Zustand 4 (persisted to localStorage)             |
| Backend    | Express 4, TypeScript, Prisma 5 ORM               |
| Database   | PostgreSQL 16 (Railway managed)                   |
| AI         | Anthropic Claude API — model: `claude-sonnet-4-6` |
| Auth       | JWT Bearer tokens + bcrypt PIN hashing            |
| Deploy     | Railway (backend + frontend + PostgreSQL)         |

---

## Build & Run Commands

```bash
# Local full stack
docker-compose up

# Backend only
cd backend && npm run dev          # port 4000
cd backend && npm run build        # compile TS → dist/

# Frontend only
cd frontend && npm run dev         # port 3000
cd frontend && npm run build

# Database
cd backend && npx prisma migrate dev    # run new migrations
cd backend && npx prisma db seed        # seed demo data
cd backend && npx prisma studio         # GUI browser
```

---

## User Roles & PINs

| Role    | PIN    | Can Do                                                  |
|---------|--------|---------------------------------------------------------|
| Teacher | `1234` | Manage class, assign homework, build syllabuses, reports|
| Admin   | `9999` | School-wide stats, all classes, oversight               |
| Child   | `1111`–`5555` | Lessons, AI tutor, drawing, tracing, star shop  |
| Parent  | child's PIN | Monitor child progress, message teacher            |

---

## File Structure (critical paths)

```
kinderspark-pro/
├── CLAUDE.md                      ← you are here (update when core changes)
├── AGENT.md                       ← agent roster + trigger guide
├── ARCHITECTURE.md                ← full system design
├── API.md                         ← all endpoint docs
├── backend/
│   ├── prisma/schema.prisma       ← DB source of truth
│   └── src/
│       ├── app.ts                 ← Express app + route mounting
│       ├── controllers/           ← thin request handlers
│       │   ├── auth.controller.ts
│       │   ├── ai.controller.ts
│       │   ├── homework.controller.ts
│       │   └── syllabus.controller.ts
│       ├── services/              ← business logic + external calls
│       │   ├── claude.service.ts  ← Anthropic API wrapper
│       │   ├── badge.service.ts   ← achievement system
│       │   ├── report.service.ts  ← AI weekly report generation
│       │   └── agentScheduler.service.ts ← autonomous agent orchestrator
│       ├── routes/                ← route definitions (15 files)
│       └── middleware/
│           ├── auth.middleware.ts ← JWT decode
│           ├── role.middleware.ts ← role enforcement
│           └── rateLimit.middleware.ts
└── frontend/
    ├── app/
    │   ├── (auth)/login/          ← role selection
    │   ├── pin/                   ← PIN pad entry
    │   ├── child/                 ← child dashboard + 11 sub-routes
    │   ├── teacher/               ← teacher dashboard + 7 sub-routes
    │   ├── parent/                ← parent dashboard
    │   ├── admin/                 ← admin dashboard
    │   └── dashboard/agents/      ← agent control room
    ├── components/ui/             ← Button, Modal, Toast, TabBar
    ├── lib/
    │   ├── api.ts                 ← all API fetch calls (single source)
    │   ├── modules.ts             ← 12 built-in learning modules
    │   ├── speech.ts              ← text-to-speech
    │   └── i18n.ts                ← translations
    └── store/appStore.ts          ← Zustand: user, role, token, settings
```

---

## Database Models (Prisma)

Core models: `School → Class → Student`, `Homework`, `HomeworkCompletion`,
`Progress`, `AISession`, `Syllabus`, `SyllabusItem`, `ClassSyllabus`,
`Message`, `Feedback`, `Badge`, `Attendance`, `Teacher`, `Admin`,
`RefreshToken`, `AgentMemory`, `AgentConversation`

Key Student fields: `id, name, age, avatar, pin, stars, streak, grade,
aiStars, aiSessions, aiBestLevel, ownedItems[], selectedTheme, classId`

---

## API Conventions

- Base URL: `/api`
- Auth: `Authorization: Bearer <jwt>` on all protected routes
- Success: return resource directly (no wrapper object)
- Error: `{ "error": "Human-readable message" }`
- All IDs: CUID strings

Key endpoints:
```
POST   /api/auth/pin              ← login (returns token + user)
GET    /api/students?classId=     ← list students
GET/PUT/DELETE /api/students/:id
GET    /api/classes
POST   /api/homework
GET    /api/homework?classId=
POST   /api/ai/generate-lesson
POST   /api/ai/weekly-report
POST   /api/ai/tutor-feedback
GET    /api/agents/memories
POST   /api/agents/conversations
GET    /api/messages/recipients
GET    /api/messages/recipients/lookup?profileId=
```

---

## Security Rules — NEVER VIOLATE

1. **Use `req.user.id` from JWT** — never trust client-supplied user IDs
2. **bcrypt all PINs** — never store plaintext PINs
3. **Sanitize AI inputs** — use `sanitizePromptInput()` from `backend/src/utils/sanitize.ts`
4. **All routes need `requireAuth`** middleware
5. **Role-gate** with `requireRole('teacher' | 'parent' | 'child' | 'admin')`
6. **Never disable `rateLimiter`** middleware
7. **No SQL injection** — always use Prisma ORM methods, never raw queries with user input

---

## Frontend Design System — ALWAYS FOLLOW

1. **Dark-first** — background `#0d0d1a` or darker
2. **Glass morphism** — `rgba(255,255,255,0.07)` bg + `backdrop-filter: blur()`
3. **CSS variables** — use `--theme-color`, `--theme-secondary`, `--theme-bg-tint`
4. **Mobile-first** — child screens max-width 430px; admin/teacher full-width
5. **Child UI** — emoji-heavy, touch targets min 44px, high contrast, joyful
6. **Animations** — shimmer, bounce-subtle, slide-up, pop, shake (defined in globals.css)
7. **Original UI only** — never copy other apps; always create unique designs

---

## AI Integration Rules

- Model: `claude-sonnet-4-6` (override via `ANTHROPIC_MODEL` env var)
- All Claude calls go through `backend/src/services/claude.service.ts`
- Always include `"child aged 3-6"` in prompts for appropriate language
- Lesson generation: request strict JSON output (no markdown fences)
- Max tokens: 100–1024 (keep small for latency + cost)
- On Claude API failure: return a generic encouraging fallback message
- Sanitize all user inputs before including in prompts

---

## Learning Modules (lib/modules.ts)

12 built-in modules: `numbers`, `numbers2`, `letters`, `words`, `words2`,
`words3`, `animals`, `colors`, `fruits`, `body`, `feelings`, `habits`

---

## Git & Deploy Workflow

```
1. Create branch:  claude/<feature>-<timestamp>
2. Commit prefix:  feat: | fix: | design: | api: | db:
3. Push to origin → auto-merge workflow → merges to main
4. Railway auto-deploys in ~3 minutes
```

**This repo's active branch:** `claude/explore-directory-rKsqd`

---

## Agent System

45+ autonomous GitHub Actions agents. Key ones:
- `health-monitor.yml` — every 15 min, checks uptime
- `claude-agent.yml` — triggered by issues or `/claude` comments
- `agent-frontend.yml` — label: `frontend`, `design`, `ui`
- `agent-backend.yml` — label: `backend`, `api`, `critical`
- `agent-database.yml` — label: `database`, `schema`, `migration`
- `weekly-improvement.yml` — every Sunday 02:00 UTC

Trigger via: GitHub issue labels, `/claude <task>` comments, or Actions UI.
Agent dashboard: `/dashboard/agents`

---

## Environment Variables

### Backend (Railway)
```
DATABASE_URL         PostgreSQL connection string
ANTHROPIC_API_KEY    Anthropic API key
JWT_SECRET           JWT signing secret
FRONTEND_URL         CORS allowed origin
ANTHROPIC_MODEL      (optional) override Claude model
```

### Frontend (Railway)
```
NEXT_PUBLIC_API_URL  Backend API base URL
```

### GitHub Secrets
```
ANTHROPIC_API_KEY    For all agent workflows
BACKEND_URL          Railway backend URL
FRONTEND_URL         Railway frontend URL
```

---

## Known Gaps (as of 2026-03-28)

- No backend tests — all services need unit/integration tests
- `notification.service.ts` is a stub — push notifications not implemented
- No input validation library (Zod/Joi) — validate at controllers
- iOS/native app does not exist yet — app is web-only

---

## How to Keep This File Updated

After every significant change, append a line to the **Known Gaps** section or
update the relevant section above. Examples:
- New route added → update API Conventions
- New DB model → update Database Models
- New env var → update Environment Variables
- Feature completed → remove from Known Gaps
