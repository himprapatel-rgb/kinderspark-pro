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
cd backend && npx prisma db seed        # seed demo/UAT data (uses npx ts-node)
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
│       │   ├── agentScheduler.service.ts ← autonomous agent orchestrator + spark task scheduler
│       │   ├── agentMemory.service.ts    ← importance-ranked agent memory (agentId+importance index)
│       │   ├── contentFilter.service.ts  ← child-safe content filtering + per-student AI rate limit
│       │   ├── email.service.ts   ← SendGrid email
│       │   ├── messageNotifications.service.ts
│       │   ├── notification.service.ts ← push notifications (VAPID)
│       │   ├── privacy.service.ts
│       │   ├── sparkTaskRunner.ts ← AI spark task execution
│       │   ├── storage.service.ts ← Cloudinary uploads
│       │   └── studentAgentContext.service.ts ← learner context for AI
│       ├── routes/                ← 26 route files
│       ├── middleware/
│       │   ├── auth.middleware.ts    ← JWT decode (cookie-only, Bearer removed)
│       │   ├── csrf.middleware.ts    ← CSRF enforcement (x-csrf-token header vs kinderspark_csrf cookie)
│       │   ├── role.middleware.ts    ← role enforcement
│       │   ├── rateLimit.middleware.ts
│       │   ├── aiRateLimit.middleware.ts ← AI-specific rate limit
│       │   └── cache.middleware.ts
│       └── utils/
│           ├── sanitize.ts
│           ├── accessControl.ts   ← centralised RBAC helpers
│           ├── pinFingerprint.ts  ← PIN brute-force detection
│           ├── progressMastery.ts
│           └── webPushTarget.ts   ← resolve student push targets (respects RBAC)
│       ├── services/
│       │   └── seed.service.ts    ← compiled auto-seed (no ts-node); seeds SUN001 on first boot
└── frontend/
    ├── app/
    │   ├── (auth)/login/          ← role selection
    │   ├── (auth)/setup/          ← initial school setup page
    │   ├── pin/                   ← PIN pad entry
    │   ├── register/              ← new user registration
    │   ├── child/                 ← child dashboard + 15 sub-routes
    │   │   (learn, learn/[modId], lesson/[id], tutor, story, poem, draw, trace,
    │   │    match, count, shop, leaderboard, settings, messages, profile, avatar-builder)
    │   ├── teacher/               ← teacher dashboard + 7 sub-routes
    │   │   (class, homework, messages, builder, syllabus/builder, reports, profile)
    │   ├── parent/                ← parent dashboard + 4 sub-routes
    │   │   (consent, homework, messages, profile)
    │   ├── admin/                 ← admin dashboard + profile
    │   ├── principal/             ← principal dashboard (full: health score, classes, teachers tabs)
    │   ├── dev/                   ← developer diagnostics page (requires NEXT_PUBLIC_DEVELOPER_KEY)
    │   ├── privacy/               ← privacy policy page
    │   ├── terms/                 ← terms of service
    │   └── dashboard/agents/      ← agent control room
    ├── components/                ← 36 UI components (AccessibilityProvider, ActivityFeed, AiTutor,
    │                                AppErrorBoundary, ClientRoot, Confetti, DashboardSidebar,
    │                                DiagnosticsPanel, DrawingCanvas, EmotionalBuddyCard, KidAvatar,
    │                                LanguageSelector, LocationCard, MissionCelebration, NativeBridge,
    │                                Onboarding, PageTransition, ParentSidebar, PhotoCapture,
    │                                ProfileManager, ProgressCharts, PwaUpdateBanner, Settings/,
    │                                SoundSettings, SyllabusBuilder, TeacherOnboarding, ThemeCustomizer,
    │                                Toast, TopBarActions, UIStates, WeatherChip + child/, lesson/, teacher/, ui/)
    │   └── icons/                 ← StoryIcons.tsx — handcrafted SVG icon system with micro-animations
    ├── hooks/                     ← useLocation, useNativeFeatures, usePullToRefresh
    ├── lib/
    │   ├── api.ts                 ← all API fetch calls (106 exported functions; CSRF header auto-injected)
    │   ├── modules.ts             ← 18 built-in learning modules + shop items
    │   ├── i18n.ts                ← 10-language translations (auto-generated)
    │   ├── speech.ts              ← text-to-speech (Web Speech API)
    │   ├── capacitor.ts           ← iOS native bridge
    │   ├── sounds.ts              ← sound effects
    │   ├── learnPath.ts           ← learning path logic
    │   └── missionEngine.ts       ← mission/quest system
    ├── store/appStore.ts          ← Zustand: user, role, token, settings, currentStudent, dailyMission
    └── ios/                       ← Capacitor iOS Xcode project
```

---

## Database Models (Prisma — 51 models)

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

### Push & Geofence (added by another agent)
- `WebPushSubscription` — browser push subscription storage (endpoint, keys, userId)
- `GeofenceUserConsent` — per-user geofence opt-in tracking
- `GeofenceUserEvent` — persistent geofence event log (replaces in-memory array)

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
/api/tts            ← text-to-speech (Google → OpenAI → Azure → Web Speech fallback)
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

1. **JWT is cookie-only** — `httpOnly` `kinderspark_token` cookie. Bearer token support has been removed from `auth.middleware.ts`. Do NOT re-add Bearer support without a full CSRF/security review.
2. **Use `req.user.id` from JWT** — never trust client-supplied user IDs
3. **bcrypt all PINs** — never store plaintext PINs
4. **PIN throttle** — `PinLoginThrottle` model tracks failed attempts; lock after **5** failed attempts per **15** minutes (see `auth.controller.ts`)
5. **Sanitize AI inputs** — use `sanitizePromptInput()` from `backend/src/utils/sanitize.ts`
6. **Content filter** — run child content through `contentFilter.service.ts` before storing
7. **All routes need `requireAuth`** middleware
8. **Role-gate** with `requireRole('teacher' | 'parent' | 'child' | 'admin' | 'principal')`
9. **Use `accessControl.ts`** for RBAC — never hand-roll permission checks
10. **Never disable `rateLimiter`** or `aiRateLimit` middleware
11. **No SQL injection** — always use Prisma ORM, never raw queries with user input
12. **CSRF required on state change** — `enforceCsrf` middleware runs after `authenticate`. If `req.user` is set (valid JWT), mutating requests (POST/PUT/PATCH/DELETE) must include `x-csrf-token` header matching the `kinderspark_csrf` cookie. Frontend `api.ts` does this automatically via `withCsrfHeader()`. The CSRF cookie is `httpOnly: false` so JS can read it.

---

## Frontend Design System — ALWAYS FOLLOW

### Palette — "Sunny Classroom" (light-first, child psychology-informed)
The app uses a **warm cream light palette** — NOT dark. Background is `#FFFCF5`.
- `--app-bg: #FFFCF5` — main page background (warm cream)
- `--app-surface: #FFFFFF` — card/panel background
- `--app-surface-soft: #FFF9EE` — nested/inner card background
- `--app-accent: #4DAADF` — primary blue (trust + focus)
- `--app-border: rgba(180,160,120,0.16)` — subtle warm border
- Role colors: `--role-child: #F5A623` · `--role-teacher: #5B7FE8` · `--role-parent: #4CAF6A` · `--role-admin: #8B6CC1`

### Canonical UI Patterns (use these classes — defined in globals.css)
```
.app-card          — standard white card (16px radius, 1rem pad, shadow-sm)
.app-card-soft     — inner/nested card (soft bg, 12px radius)
.app-card-lg       — featured card (20px radius, 1.25rem pad)
.app-card-action   — interactive card with hover/press feedback
.stat-box          — compact metric box (12px radius)
.stat-box-value    — metric number (xl, font-black)
.stat-box-label    — metric label (0.65rem, uppercase)
.section-label     — section heading above groups (0.7rem, uppercase)
.page-hero         — gradient hero header (dot-grid overlay via ::before, consistent padding)
.app-tab-bar       — sticky role dashboard tab bar
.app-tab-btn       — individual tab button (data-active='true/false')
.page-body         — scrollable content below hero (1.25rem pad + gap)
.page-section      — content group (0.75rem gap)
.empty-state       — standardized empty state layout
.app-field         — CANONICAL form input (12px radius) — use this on all new code
.app-input         — legacy alias for .app-field (identical styles, kept for compat)
.input-field       — legacy alias for .app-field (identical styles, kept for compat)
.btn-sm            — button size modifier: 32px height, 10px radius
.btn-md            — button size modifier: 40px height, 12px radius
.btn-lg            — button size modifier: 52px height, 14px radius
.app-btn-primary   — primary CTA button (use with .btn-md or .btn-lg)
.app-btn-secondary — secondary action button
.app-btn-danger    — destructive action
.app-pressable     — hover/press micro-interaction on any element
.app-chip          — badge/tag pill
.glass             — light glass morphism (white 75% + blur 20px)
```

### Shared Components
- `DashboardSidebar` — desktop left nav (teacher + admin + principal roles)
- `TopBarActions` — profile + role-switcher top-right buttons
- `TabBar` pattern — use `.app-tab-bar` + `.app-tab-btn[data-active]` (not custom inline code)
- `UIStates` — `<Loading>`, `<InlineEmpty>` shared states
- `Toast` / `useToast()` — **always use this for notifications** (`import { useToast } from '@/components/Toast'`). Methods: `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`. Never build a local `useState('')` toast.
- `AccessibilityProvider` — wired in root layout; applies `html.high-contrast` (CSS filter), 118% font for large mode, Comic Sans for dyslexia mode. All settings from Zustand `settings.hc / .large / .dys`.

### Page Structure Rules
1. Every role dashboard MUST have a `.page-hero` gradient header with role color
2. Mobile tab bars MUST use `.app-tab-bar` + `.app-tab-btn` — never duplicate inline
3. Content sections MUST use `.page-body` > `.page-section` structure
4. Cards MUST use `.app-card` or `.app-card-soft` — not `rounded-2xl p-4` inline
5. Section labels MUST use `.section-label` — not hardcoded color/size
6. Stat boxes MUST use `.stat-box` — consistent across all role dashboards
7. Notifications MUST use `useToast()` — never build local `useState` toast
8. Buttons SHOULD use `.btn-sm` / `.btn-md` / `.btn-lg` for predictable touch targets

### Zustand Store Shape (`frontend/store/appStore.ts`)
```typescript
const { user, role, settings, currentStudent, dailyMission } = useAppStore()

interface Settings {
  dark: boolean         // dark mode toggle (applied via AccessibilityProvider)
  large: boolean        // large text → 118% font-size on <html>
  hc: boolean           // high contrast → html.high-contrast CSS class
  dys: boolean          // dyslexia font → Comic Sans on <html>
  lang: string          // UI language code (en/fr/es/ar/ur/hi/zh/pt/de/tr)
  stLimit: number       // student AI session limit
  voiceOn: boolean      // TTS voice on/off
  voiceProfile: 'auto' | 'girl' | 'boy'  // TTS voice profile
}
```
AccessibilityProvider in root layout applies all visual settings automatically — do NOT re-implement per-page.

### Other Rules
- **Mobile-first** — child screens max-width 430px via `.app-container`; admin/teacher full-width
- **Child UI** — emoji-heavy, touch targets min 44px, high contrast, joyful tone
- **Animations** — `animate-slide-up`, `animate-pop`, `animate-bounce-subtle`, `animate-fade-in`, `shimmer` (all in globals.css)
- **StoryIcons** — use `<StoryIcon name="home" size={24} roleTone="teacher" />` from `@/components/icons`. Names: `home`, `class`, `students`, `teacher`, `parent`, `homework`, `attendance`, `reports`, `messages`, `aiTutor`, `rewards`, `progress`, `drawing`, `tracing`, `school`. roleTone: `default|parent|teacher|admin|child`. Has micro-animations, hover/active states, compact density.
- **Original UI only** — never copy other apps
- **RTL support** — Arabic + Urdu: apply `dir="rtl"` on html element
- **Glass morphism on gradient heroes** — use `rgba(255,255,255,0.12–0.18)` + `border: 1px solid rgba(255,255,255,0.18–0.25)` for cards inside gradient sections

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
AGENT_SECRET           Required secret for agent-authenticated routes (no fallback)
AGENT_TRIGGER_WORKFLOWS Comma-separated allowlist for /api/agents/trigger workflows
AGENT_ALLOWED_ISSUE_LABELS Comma-separated allowlist for /api/agents/issue labels
FRONTEND_URL           CORS allowed origin
ANTHROPIC_MODEL        (optional) override Claude model
OPENAI_MODEL           (optional) override OpenAI model (default: gpt-4o-mini)
GEMINI_API_KEY         Google Gemini API key for AI fallback (free tier available)
GEMINI_MODEL           (optional) override Gemini model (default: gemini-2.0-flash)
PERPLEXITY_API_KEY     Perplexity API key for AI fallback
VAPID_PUBLIC_KEY       Web push notifications
VAPID_PRIVATE_KEY      Web push notifications
SENDGRID_API_KEY       Email sending
CLOUDINARY_CLOUD_NAME  Cloudinary cloud name (image/drawing storage)
CLOUDINARY_API_KEY     Cloudinary API key
CLOUDINARY_API_SECRET  Cloudinary API secret
OPENAI_API_KEY         AI fallback provider + OpenAI TTS (secondary voice)
GOOGLE_TTS_API_KEY     Google Cloud TTS — primary human voice (free 1M chars/mo)
AZURE_TTS_KEY          Microsoft Azure TTS — tertiary voice (free 500K chars/mo)
AZURE_TTS_REGION       Azure region e.g. eastus (default: eastus)
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

## Agent Routes Hardening Status (2026-03-31)

`backend/src/routes/agents.routes.ts` hardening Issues 1-10 are implemented and pushed.

Completed:
- Issue 1: `agentAuth` now rejects missing/invalid `x-agent-secret` with 401.
- Issue 2: `dashboardAuth` now requires valid agent secret OR authenticated JWT role (`admin`/`teacher`).
- Issue 3: removed insecure `AGENT_SECRET` fallback (`ks-agent-secret`); fail-closed behavior added.
- Issue 4: request validation added for params/query/body across agent endpoints.
- Issue 5: `/ask` no longer fails silently; logs + mission control alert on async errors.
- Issue 6: `/trigger` locked down to admin-or-agent-secret + workflow allowlist.
- Issue 7: `/issue` hardened with stricter auth and payload constraints + label allowlist.
- Issue 8: sensitive dashboard reads (`/memory`, `/conversations`, `/runs`, `/issues`) now admin-or-agent-secret.
- Issue 9: `/feed` SSE stabilized with heartbeat, reconnect hint, overlap guard, timeout abort, and robust cleanup.
- Issue 10: removed `any` usage in this route; replaced with concrete/unknown-safe typing.

Notes:
- Route-level lint is clean.
- Backend-wide TypeScript errors still exist in unrelated Prisma-typed files (`ai.controller.ts`, `modules.controller.ts`, `cache.service.ts`) and are pre-existing.

---

## Security Hardening Status (2026-04-01)

Completed:
- `cache.service.ts` cache keys are now deterministic (sorted params before SHA-256).
- `accessControl.ts` removed permissive `parentUserId === studentId` bypass.
- PIN lock policy: **5 attempts / 15 minutes** (reverted from 3/30 — 3/30 was too aggressive and locked real users out during normal testing).
- Frontend store no longer persists auth `token` in localStorage (`partialize` removed token).
- CSRF middleware added (`backend/src/middleware/csrf.middleware.ts`) and mounted globally in `app.ts`.
  - **Critical**: `enforceCsrf` checks `req.user` (only set when JWT is cryptographically valid), NOT `req.cookies.kinderspark_token` (raw cookie — still present when expired). This distinction matters because `authenticate` clears invalid tokens in the response but the raw cookie object still has them.
- Auth flow now issues/clears `kinderspark_csrf` cookie (httpOnly: false so JS can read it) alongside auth cookies.
- Frontend `api.ts`: `getCsrfToken()` reads `kinderspark_csrf` cookie; `withCsrfHeader()` adds `x-csrf-token` on all POST/PUT/PATCH/DELETE. Applied to `req()`, `tryRefresh()`, and retry calls.
- Structured AI responses (lesson/syllabus/homework/recommendations) are validated before cache write in `services/ai/index.ts`.
- CSRF middleware tests added in `backend/src/__tests__/csrf.middleware.test.ts`.
- **Auth is cookie-only** — Bearer token support removed from `auth.middleware.ts`. Web app uses `httpOnly` cookie + CSRF only.
- **SameSite=Lax** on all auth cookies — `SameSite=Strict` was changed then immediately reverted because Railway frontend and backend are on *different subdomains* (`kinderspark-pro-production` vs `kinderspark-backend-production`). Strict blocks cross-origin cookie sending entirely.
- **XSS in registration**: `sanitizePromptInput()` applied to `displayName` in `auth.controller.ts`.
- **PIN hash leak fixed**: `homework.controller.ts` completions use safe `select` (id, name, avatar, stars only — no pin/pinFingerprint). Same pattern in `student.routes.ts` and `teacher.routes.ts`.
- **Progress self-access**: `progress.routes.ts` allows `role=child` to access their own studentId (previously child role was fully blocked).
- **Unauthenticated diagnostics fixed**: `diag.routes.ts` GET `/recent` now requires `requireRole('admin', 'principal')`.
- **Hardcoded dev key removed**: `frontend/app/dev/page.tsx` reads `NEXT_PUBLIC_DEVELOPER_KEY` env var (no fallback).
- **PIN login loop fixed**: `verifyPin()` uses raw `fetch` instead of `req()` — wrong-PIN 401 no longer triggers `handleSessionExpired()` which was saving `/pin` to `ks_after_login` and looping forever after successful auth.
- **AI provider timeout**: `ai/router.ts` wraps each provider call in 30-second timeout via `Promise.race`.
- **CSP connect-src fixed**: `frontend/next.config.js` — security headers previously only whitelisted the frontend Railway URL in `connect-src`, blocking all `fetch()` calls to the backend. Now allows `https://kinderspark-backend-production.up.railway.app` and `https://*.up.railway.app`. **This was the root cause of "Cannot reach server" in production.**
- Security response headers added to `frontend/next.config.js`: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`.

---

## UAT Seed Status (2026-04-01)

Completed:
- Production DB seed executed successfully on Railway backend service (`kinderspark-backend`) via SSH.
- Seeded school code is `SUN001` (Sunshine Kindergarten) with full UAT roster (admins, teachers, students, parent login via child PIN).
- Canonical QA login reference added: `docs/QA_TEST_ACCOUNTS.md`.
- Production seed runbook added: `docs/SEED_PRODUCTION.md`.
- **Auto-seed on first boot**: `backend/src/services/seed.service.ts` (compiled TypeScript, no ts-node dependency) is imported in `app.ts`. On server startup, if `prisma.school.count() === 0`, `seedDemoData()` runs automatically. Wrapped in try-catch — non-fatal if it fails.
  - Seeded accounts: School `SUN001`, Admin PIN `9999`, Teacher PIN `1234`, Children PINs `1111`–`5555`, `7777`, `8888`, `0000`
  - Also clears `PinLoginThrottle` on fresh install to prevent locked-out users
- **Why compiled seed (not ts-node)**: `ts-node` is in `devDependencies` and is NOT installed in Railway production containers. Using `execSync('npx ts-node ...')` in production silently fails. The `seed.service.ts` compiles to JS with the rest of the backend.

Operational notes:
- Railway project contains both frontend (`kinderspark-pro`) and backend (`kinderspark-backend`) services.
- `NEXT_PUBLIC_API_URL` in the **frontend** Railway service must be set to the backend URL *before* the frontend build (it's a build-time Next.js variable, not runtime). If set after deploy, frontend must be redeployed.

---

## Code-Verified Product Status (source: actual routes/services)

### Implemented and wired (representative evidence)

| Area | Notes |
|------|--------|
| Auth | `auth.middleware.ts` — JWT from `httpOnly` `kinderspark_token` cookie only. Bearer support removed. Multi-school scoped: `throttleKey(schoolCode, role, ip)` |
| CSRF | `csrf.middleware.ts` — enforces `x-csrf-token` vs `kinderspark_csrf` when session cookies present (see rule 12) |
| PIN fingerprint | `pinFingerprint.ts` — SHA256 deterministic fingerprint for pre-filtering before bcrypt.compare; `PinLoginThrottle` throttles per school+role+IP |
| Session expiry | `api.ts` `handleSessionExpired()` — saves current path to `sessionStorage.ks_after_login` (never saves `/pin` or `/login`), redirects to `/pin?role=<role>`; `pin/page.tsx` resumes saved route after re-auth |
| Email | `email.service.ts` — SendGrid; skips gracefully if `SENDGRID_API_KEY` missing (warns in logs) |
| AI safety | `contentFilter.service.ts` — regex blocks on AI output + per-student AI session rate limiting |
| TTS | `tts.service.ts` — **4-tier cascade**: Google Neural2 → OpenAI (nova/echo/shimmer) → Azure Neural → Web Speech API fallback. All results cached in `AIResponseCache` (30-day TTL). 10 language support with gender-specific voices. |
| Attendance | `attendance.ts` — CRUD, summaries, geofence routes. `GeofenceUserEvent` + `GeofenceUserConsent` written to DB (not in-memory). |
| AI HTTP API | `ai.routes.ts` + `services/ai/index.ts` — lesson, reports, tutor, homework, syllabus, spark flows; all 9 functions cache-first |
| Privacy erasure | `privacy.service.ts` — cascading delete incl. Cloudinary asset cleanup; `ParentalConsent` table for COPPA/GDPR |
| Push (full) | `push.routes.ts` `POST /subscribe` persists `WebPushSubscription`; `webPushTarget.ts` resolves RBAC-checked targets; `notification.service.ts` fans out to student + all linked parent devices |
| Parental consent | `ParentalConsent` model; `ParentChildLink` links parents to children; parent can view consent page at `/parent/consent` |
| Agent memory | `agentMemory.service.ts` — importance-ranked memory with `agentId+importance` index; used by agent orchestrator |
| Health | `app.ts` — `GET /health` pings DB, returns memory/uptime |
| Icons | `StoryIcons.tsx` — 16 SVG icons with role tones, compact density, idle/hover/active/success/disabled micro-animations |

### Gaps / incomplete (verified in code)

| Severity | Issue | Evidence |
|----------|--------|----------|
| **Medium** | No service worker | No `public/sw.js` / SW registration in root layout for offline/push client (push subscriptions work; SW for background push not yet wired) |
| **Medium** | Email silent when misconfigured | `email.service.ts` returns early if no `SENDGRID_API_KEY` — no user-facing error |
| **Medium** | TTS degrades without keys | All provider keys optional → browser Web Speech fallback for lesson audio |
| **Medium** | Legacy route surface | `app.ts` mounts backward-compat: `/api/classes`, `/api/ai-sessions`, `/api/feedback` — audit auth on changes |

Previously listed gaps now resolved ✅:
- **Push end-to-end**: `POST /api/push/subscribe` persists `WebPushSubscription`; `notification.service.ts` fans out to student + all linked parent devices
- **Geofence persistence**: `GeofenceUserEvent` + `GeofenceUserConsent` written to DB via `attendance.ts` (not in-memory)
- **CSRF + Bearer**: Bearer tokens fully removed; cookie-only auth enforced

### Frontend route coverage

Role portals exist under `frontend/app/`: `child/`, `parent/`, `teacher/`, `admin/`, `principal/`, `pin/`, `register/`, `dashboard/`, `privacy/`, `terms/`.

---

## UI/UX Consistency Audit Status (2026-04-01)

Full audit performed. All role dashboards (admin, teacher, parent, principal) standardized.

### Completed in this audit
- **globals.css** — Added 15 canonical design token classes (`.app-card`, `.page-hero`, `.app-tab-bar`, `.stat-box`, `.section-label`, `.page-body`, `.page-section`, `.empty-state`, etc.)
- **Principal page** — Rebuilt from a 16-line redirect into a full 200-line dashboard with health score, class analytics, and teacher summary. Uses `getAdminStats`, `getClasses`, `getClassAnalytics` APIs.
- **Admin page** — Hero updated to `.page-hero`; tab bar standardized to `.app-tab-bar` + `.app-tab-btn`
- **Teacher page** — Tab bar standardized to `.app-tab-bar` + `.app-tab-btn`
- **Parent page** — Tab bar converted from `position: fixed` to `.app-tab-bar` (sticky); padding adjusted
- **Bearer token removal** — `auth.middleware.ts` Bearer fallback block actually removed (was still present despite docs claiming removal)
- **Child shop toast** — Replaced custom `useState('')` white bubble with `useToast()` from `@/components/Toast`
- **Input class consolidation** — `.app-input` and `.input-field` are now aliases of `.app-field` (single CSS definition, backwards-compat)
- **Button size modifiers** — Added `.btn-sm` (32px), `.btn-md` (40px), `.btn-lg` (52px) + default `min-height: 40px` for bare buttons
- **design-system SKILL.md** — Fully rewritten with accurate light-first palette, all 35+ canonical classes, patterns, and templates
- **Accessibility** — Confirmed fully wired: `AccessibilityProvider` applies `html.high-contrast`, font-size, dyslexia font based on Zustand settings

---

## Code Quality Status (2026-04-01)

### Completed fixes
- `frontend/components/ProgressCharts.tsx` — 9× `rounded-2xl p-4` / `rounded-xl p-3 text-center` with inline surface/border styles → `.app-card` / `.stat-box`
- `frontend/components/ActivityFeed.tsx` — skeleton and empty-state divs → `.app-card animate-pulse` / `.app-card empty-state`
- `frontend/app/parent/page.tsx` — 5× `rounded-2xl p-4` with surface/border → `.app-card`; `#5B7FE8` → `var(--role-teacher)`; `#4CAF6A` → `var(--app-success)` / `var(--app-success-soft)`
- `frontend/app/child/shop/page.tsx` — custom useState toast → `useToast()` from `@/components/Toast`

### Still uses inline styles intentionally
- `AiTutor.tsx` — glass cards inside gradient sections; dynamic `t.color` theme variables → intentional
- `parent/page.tsx` — some rgba() with opacity values where CSS vars don't cover partial transparency → acceptable
- `parent/page.tsx` — `colors` array for chart labels (hardcoded) → not a bug

### No issues found
- All 9 AI functions cache correctly ✅
- Bearer token removed ✅  
- All toast notifications use `useToast()` ✅
- No TODO/FIXME in main source (only in old worktree copies) ✅
- TTS client sends CSRF token and uses normalized API base URL ✅ (fixed in speech.ts)
- Session expiry handled gracefully ✅ — api.ts saves current route to `sessionStorage.ks_after_login`, redirects to `/pin?role=<role>`; pin/page.tsx resumes saved route after successful re-auth
- PIN login loop fixed ✅ — `verifyPin()` uses raw fetch (not `req()`); wrong PIN 401 no longer triggers `handleSessionExpired()`; `/pin` and `/login` paths never saved as resume destinations

---

## Known Gaps (as of 2026-04-01)

- iOS app exists (Capacitor Xcode project) but not yet in App Store
- **Push:** Server-side fully wired (`WebPushSubscription`, fan-out to student+parents). Still missing: client-side service worker (`public/sw.js`) for background push delivery. Set `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` on Railway.
- **Geofence:** Persistence implemented (`GeofenceUserEvent` + `GeofenceUserConsent` written to DB)
- `SENDGRID_API_KEY`, `CLOUDINARY_CLOUD_NAME`+`CLOUDINARY_API_KEY`+`CLOUDINARY_API_SECRET`, `OPENAI_API_KEY` need to be set on Railway for those features to work
- `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` required on Railway for push notifications (client subscribe flow still missing)
- TTS human voices need env vars set on Railway: `GOOGLE_TTS_API_KEY`, `OPENAI_API_KEY`, or `AZURE_TTS_KEY` — app falls back to Web Speech API until at least one is set
- **`NEXT_PUBLIC_API_URL` must be set before frontend build on Railway** — it is a build-time Next.js env var; setting it post-deploy has no effect until frontend is redeployed

---

## How to Keep This File Updated

After every significant change, update the relevant section above. Examples:
- New route added → update API Routes
- New DB model → update Database Models
- New env var → update Environment Variables
- New workflow → update Agent System count + list
- Feature completed → remove from Known Gaps
