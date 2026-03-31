# KinderSpark Pro — Claude Memory File

> This file is Claude's persistent brain for this project.
> Read it fully at the start of every session.
> **Update this file whenever a new core feature, model, route, or rule is added.**

---

## What This App Is

**KinderSpark Pro** — AI-powered kindergarten learning platform for children aged 4–10.
Connects **teachers**, **parents**, **children**, **admins**, and **principals** in one app.

**Live on Railway.** Auto-deploys on push to `main`.

---

## Tech Stack

| Layer      | Tech                                              |
|------------|---------------------------------------------------|
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Mobile     | Capacitor (iOS — Xcode project exists)            |
| State      | Zustand 4 (persisted to localStorage)             |
| Backend    | Express 4, TypeScript, Prisma 5 ORM               |
| Database   | PostgreSQL 16 (Railway managed)                   |
| AI         | Anthropic Claude API — model: `claude-sonnet-4-6` |
| Auth       | JWT (cookie-only transport) + bcrypt PIN hashing  |
| Deploy     | Railway (backend + frontend + PostgreSQL)         |
| Storage    | Cloudinary (images/drawings)                      |
| Email      | SendGrid                                          |

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
cd backend && npx prisma generate       # regenerate client after schema change
cd backend && npx prisma db seed        # seed demo data
cd backend && npx prisma studio         # GUI browser
```

---

## User Roles & PINs

| Role      | PIN    | Can Do                                                       |
|-----------|--------|--------------------------------------------------------------|
| Teacher   | `1234` | Manage class, assign homework, build syllabuses, reports     |
| Admin     | `9999` | School-wide stats, all classes, oversight                    |
| Principal | `8888` | School overview, teacher management                          |
| Child     | `1111`–`5555` | Lessons, AI tutor, drawing, tracing, star shop        |
| Parent    | child's PIN | Monitor child progress, message teacher, consent       |

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
│       ├── app.ts                 ← Express app + route mounting (26 routes)
│       ├── config/
│       │   ├── jwtSecret.ts       ← centralised JWT secret
│       │   └── startupEnv.ts      ← env hints on startup
│       ├── controllers/           ← thin request handlers
│       │   ├── auth.controller.ts
│       │   ├── ai.controller.ts   ← DB-first lesson lookup; AI only for custom topics
│       │   ├── homework.controller.ts
│       │   ├── syllabus.controller.ts
│       │   ├── modules.controller.ts  ← CurriculumModule + QuizQuestion endpoints
│       │   ├── drawing.controller.ts
│       │   └── privacy.controller.ts
│       ├── services/              ← business logic + external calls
│       │   ├── ai/                ← multi-provider AI (Claude → OpenAI → Perplexity → Gemini)
│       │   │   ├── index.ts       ← all 9 AI functions — ALL cached via cache.service.ts
│       │   │   ├── router.ts      ← provider fallback chain
│       │   │   ├── promptTemplates.ts ← all prompt builder functions
│       │   │   ├── spark.ts       ← spark sanitization
│       │   │   └── providers/     ← claude.ts, gemini.ts
│       │   ├── cache.service.ts   ← makeCacheKey, getCachedResponse, setCachedResponse
│       │   ├── badge.service.ts   ← achievement system
│       │   ├── report.service.ts  ← AI weekly report generation
│       │   ├── agentScheduler.service.ts ← autonomous agent orchestrator
│       │   ├── contentFilter.service.ts  ← child-safe content filtering
│       │   ├── email.service.ts   ← SendGrid email
│       │   ├── messageNotifications.service.ts
│       │   ├── notification.service.ts ← push notifications (VAPID)
│       │   ├── privacy.service.ts
│       │   ├── sparkTaskRunner.ts ← AI spark task execution
│       │   ├── storage.service.ts ← Cloudinary uploads
│       │   └── studentAgentContext.service.ts ← learner context for AI
│       ├── routes/                ← 26 route files
│       ├── middleware/
│       │   ├── auth.middleware.ts    ← JWT decode (cookie-only)
│       │   ├── role.middleware.ts    ← role enforcement
│       │   ├── rateLimit.middleware.ts
│       │   ├── aiRateLimit.middleware.ts ← AI-specific rate limit
│       │   └── cache.middleware.ts
│       └── utils/
│           ├── sanitize.ts
│           ├── accessControl.ts   ← centralised RBAC helpers
│           ├── pinFingerprint.ts  ← PIN brute-force detection
│           └── progressMastery.ts
└── frontend/
    ├── app/
    │   ├── (auth)/login/          ← role selection
    │   ├── pin/                   ← PIN pad entry
    │   ├── register/              ← new user registration
    │   ├── child/                 ← child dashboard + 15 sub-routes
    │   │   (learn, lesson, tutor, story, poem, draw, trace, match,
    │   │    count, shop, leaderboard, settings, messages, profile, avatar-builder)
    │   ├── teacher/               ← teacher dashboard + 7 sub-routes
    │   │   (class, homework, messages, builder, syllabus, reports, profile)
    │   ├── parent/                ← parent dashboard + consent, profile
    │   ├── admin/                 ← admin dashboard + profile
    │   ├── principal/             ← principal dashboard
    │   ├── privacy/               ← privacy policy page
    │   ├── terms/                 ← terms of service
    │   └── dashboard/agents/      ← agent control room
    ├── components/                ← 30+ UI components
    ├── hooks/                     ← useLocation, useNativeFeatures, usePullToRefresh
    ├── lib/
    │   ├── api.ts                 ← all API fetch calls (50+ functions)
    │   ├── modules.ts             ← 18 built-in learning modules + shop items
    │   ├── i18n.ts                ← 10-language translations (auto-generated)
    │   ├── speech.ts              ← text-to-speech (Web Speech API)
    │   ├── capacitor.ts           ← iOS native bridge
    │   ├── sounds.ts              ← sound effects
    │   ├── learnPath.ts           ← learning path logic
    │   └── missionEngine.ts       ← mission/quest system
    ├── store/appStore.ts          ← Zustand: user, role, token, settings
    └── ios/                       ← Capacitor iOS Xcode project
```

---

## Database Models (Prisma — 46 models)

### Core
`School`, `SchoolProfile`, `GradeLevel`, `Class`, `ClassGroup`

### Users
`User`, `Student`, `StudentProfile`, `StudentClassEnrollment`,
`Teacher`, `TeacherProfile`, `TeacherClassAssignment`, `TeacherStudentAssignment`,
`Admin`, `AdminProfile`, `PrincipalProfile`,
`ParentProfile`, `ParentChildLink`, `ParentalConsent`,
`RoleAssignment`, `PinLoginThrottle`, `RefreshToken`

### Learning
`Progress`, `AISession`, `TutorSession`, `QuizResponse`,
`Syllabus`, `SyllabusItem`, `ClassSyllabus`,
`Homework`, `HomeworkCompletion`, `Badge`

### Communication
`Message`, `MessageThread`, `ThreadMessage`, `ThreadParticipant`, `MessageReceipt`,
`Feedback`, `ActivityPost`, `Drawing`, `AiSparkArtifact`

### Agents
`AgentMemory`, `AgentConversation`

### Cache & Curriculum (added 2026-03-31)
- `CurriculumModule` — all 18 built-in modules with items JSON (DB source of truth)
- `LessonCache` — AI-generated lessons for custom topics (unique by moduleId+language+difficulty)
- `QuizQuestion` — pre-seeded quiz questions per module (no AI needed for standard quizzes)
- `AIResponseCache` — SHA-256 keyed cache for all AI responses (TTL by type)

### Other
`Attendance`

---

## API Routes (26 mounted)

```
/api/auth           ← login, register, refresh, logout (cookie-only JWT)
/api/students       ← CRUD students
/api/teacher        ← teacher dashboard data
/api/homework       ← homework CRUD + completions
/api/syllabuses     ← syllabus CRUD
/api/messages       ← threaded messaging
/api/progress       ← student progress tracking
/api/ai             ← AI endpoints (lesson, report, feedback, homework, syllabus, recommendations)
/api/admin          ← admin dashboard
/api/attendance     ← attendance tracking
/api/push           ← push notification subscriptions
/api/classes        ← class management
/api/ai-sessions    ← AI tutor session logs
/api/feedback       ← student feedback
/api/agents         ← agent memory + conversations
/api/ecosystem      ← ecosystem-wide data
/api/profiles       ← user profiles (teacher, student, parent, admin)
/api/diag           ← diagnostics
/api/schools        ← school management
/api/assignments    ← teacher-student assignments
/api/relationships  ← parent-child links
/api/activity       ← activity feed (posts)
/api/privacy        ← GDPR/COPPA privacy controls
/api/drawings       ← drawing storage (Cloudinary)
/api/modules        ← CurriculumModules + QuizQuestions (DB-served, no AI)
```

Key endpoints:
```
POST   /api/auth/pin                   ← PIN login (returns cookie JWT)
GET    /api/students?classId=          ← list students
POST   /api/ai/generate-lesson         ← DB-first: module → LessonCache → AI
POST   /api/ai/tutor-feedback
POST   /api/ai/weekly-report
GET    /api/modules                    ← all active CurriculumModules
GET    /api/modules/:moduleId/questions?difficulty=&language=
GET    /api/agents/memories
POST   /api/agents/conversations
```

---

## Security Rules — NEVER VIOLATE

1. **JWT is cookie-only** — `httpOnly`, `sameSite: strict`; never in Authorization header
2. **Use `req.user.id` from JWT** — never trust client-supplied user IDs
3. **bcrypt all PINs** — never store plaintext PINs
4. **PIN throttle** — `PinLoginThrottle` model tracks failed attempts; lock after 5 fails
5. **Sanitize AI inputs** — use `sanitizePromptInput()` from `backend/src/utils/sanitize.ts`
6. **Content filter** — run child content through `contentFilter.service.ts` before storing
7. **All routes need `requireAuth`** middleware
8. **Role-gate** with `requireRole('teacher' | 'parent' | 'child' | 'admin' | 'principal')`
9. **Use `accessControl.ts`** for RBAC — never hand-roll permission checks
10. **Never disable `rateLimiter`** or `aiRateLimit` middleware
11. **No SQL injection** — always use Prisma ORM, never raw queries with user input

---

## Frontend Design System — ALWAYS FOLLOW

1. **Dark-first** — background `#0d0d1a` or darker
2. **Glass morphism** — `rgba(255,255,255,0.07)` bg + `backdrop-filter: blur()`
3. **CSS variables** — use `--theme-color`, `--theme-secondary`, `--theme-bg-tint`
4. **Mobile-first** — child screens max-width 430px; admin/teacher full-width
5. **Child UI** — emoji-heavy, touch targets min 44px, high contrast, joyful
6. **Animations** — shimmer, bounce-subtle, slide-up, pop, shake (defined in globals.css)
7. **Original UI only** — never copy other apps; always create unique designs
8. **RTL support** — Arabic + Urdu: apply `dir="rtl"` on html element

---

## AI Integration Rules

- Model: `claude-sonnet-4-6` (override via `ANTHROPIC_MODEL` env var)
- All AI calls go through `backend/src/services/ai/index.ts`
- Provider fallback chain: Claude → OpenAI → Perplexity → Gemini (`ai/router.ts`)

### HARDCORE RULE — Every AI Response MUST Be Cached (see `.claude/rules/ai-cache.md`)
Every AI function MUST follow this 3-step pattern — NO EXCEPTIONS:
1. `makeCacheKey(type, { ...allInputParams })` — before calling AI
2. `getCachedResponse(key)` — return immediately if cache hit
3. `setCachedResponse(key, type, text, model)` — save BEFORE returning

All 9 AI functions in `ai/index.ts` implement this. Any new AI function must too.

- **DB-first lesson strategy**: check `CurriculumModule` → check `LessonCache` → call AI
- Standard modules (18 built-in) served from DB — zero AI calls
- Custom topic lessons cached in `LessonCache` after first AI call
- Cache TTLs: lesson/syllabus=7d, homework=3d, report/feedback=1d, recommendations=12h
- Always include `"child aged 3-6"` context in prompts
- Max tokens: 100–4096 depending on function
- Sanitize all user inputs before including in prompts

### AI Functions (all cached)
`generateLesson`, `generateWeeklyReport`, `generateTutorFeedback`,
`generateSyllabusAI`, `generateStudentReport`, `generateHomeworkIdea`,
`generateRecommendations`, `generatePoemFromSpark`, `generateTutorHintFromSpark`

---

## Learning Modules (lib/modules.ts)

18 built-in modules: `numbers`, `numbers2`, `letters`, `words`, `words2`,
`words3`, `colors`, `animals`, `fruits`, `shapes`, `food`, `vehicles`,
`weather`, `body`, `family`, `feelings`, `habits`, `manners`

Shop items: 9 avatars (`av_def`–`av_dragon`) + 6 themes (`th_def`–`th_galaxy`)

---

## Multilingual System (10 languages)

Single source of truth: `translations/master.json`
Generated by: `node translations/sync.js`
Platforms: `frontend/lib/i18n.ts` (web), `translations/ios/`, `translations/android/`
Languages: `en`, `fr`, `es`, `ar` (RTL), `ur` (RTL), `hi`, `zh`, `pt`, `de`, `tr`
Auto-sync workflow: `agent-localization.yml` (weekly + on master.json push)

---

## Git & Deploy Workflow

```
1. Create branch:  claude/<feature>-<timestamp>
2. Commit prefix:  feat: | fix: | design: | api: | db: | security: | ops:
3. Push to origin → auto-merge workflow → merges to main
4. Railway auto-deploys in ~3 minutes
```

**Note:** Direct pushes to `main` are blocked. Always push to `claude/` branch.

---

## Agent System

53 GitHub Actions workflows (agents + deploy + infra). Key ones:
- `health-monitor.yml` — every 15 min, checks uptime
- `claude-agent.yml` — triggered by issues or `/claude` comments
- `agent-frontend.yml` — label: `frontend`, `design`, `ui`
- `agent-backend.yml` — label: `backend`, `api`, `critical`
- `agent-database.yml` — label: `database`, `schema`, `migration`
- `agent-localization.yml` — multilingual sync + AI translation fill
- `weekly-improvement.yml` — every Sunday 02:00 UTC
- `deploy.yml` / `deploy-backend.yml` / `deploy-frontend.yml` — Railway deploy
- `build-ios.yml` / `deploy-ios-appstore.yml` — iOS build + App Store
- `auto-merge-claude.yml` — merges `claude/` branches to main
- `prisma-resolve-failed-migration.yml` — Railway migration recovery

Trigger via: GitHub issue labels, `/claude <task>` comments, or Actions UI.
Agent dashboard: `/dashboard/agents`

---

## Environment Variables

### Backend (Railway)
```
DATABASE_URL           PostgreSQL connection string
ANTHROPIC_API_KEY      Anthropic API key
JWT_SECRET             JWT signing secret
FRONTEND_URL           CORS allowed origin
ANTHROPIC_MODEL        (optional) override Claude model
VAPID_PUBLIC_KEY       Web push notifications
VAPID_PRIVATE_KEY      Web push notifications
SENDGRID_API_KEY       Email sending
CLOUDINARY_URL         Image/drawing storage
OPENAI_API_KEY         (optional) AI fallback provider
```

### Frontend (Railway)
```
NEXT_PUBLIC_API_URL    Backend API base URL
```

### GitHub Secrets
```
ANTHROPIC_API_KEY      For all agent workflows
BACKEND_URL            Railway backend URL
FRONTEND_URL           Railway frontend URL
```

---

## Known Gaps (as of 2026-03-31)

- iOS app exists (Capacitor Xcode project) but not yet in App Store
- `SENDGRID_API_KEY`, `CLOUDINARY_URL`, `OPENAI_API_KEY` need to be set on Railway for those features to work
- `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` required on Railway for push notifications
- `@google/generative-ai` package not installed — Gemini provider will fail until added
- TTS uses browser Web Speech API — robotic voice; no human-quality TTS service yet

---

## How to Keep This File Updated

After every significant change, update the relevant section above. Examples:
- New route added → update API Routes
- New DB model → update Database Models
- New env var → update Environment Variables
- New workflow → update Agent System count + list
- Feature completed → remove from Known Gaps
