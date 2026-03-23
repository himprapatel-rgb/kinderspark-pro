# 🤖 KinderSpark Pro — Autonomous Agent Handbook

This document is the single source of truth for all autonomous Claude agents working on this codebase.
Every agent reads this before acting.

---

## App Overview

**KinderSpark Pro** is a premium educational app for children aged 4–10.

| Layer     | Stack                                      |
|-----------|--------------------------------------------|
| Frontend  | Next.js 14, TypeScript, Tailwind CSS       |
| Backend   | Express.js, TypeScript, Prisma ORM         |
| Database  | PostgreSQL (Railway managed)               |
| Auth      | JWT Bearer + httpOnly cookies, bcrypt PINs |
| Deploy    | Railway (auto-deploy on push to `main`)    |
| AI        | Claude API (claude-sonnet-4-5)             |

**Live URLs** (set in Railway env vars):
- Backend: `BACKEND_URL`
- Frontend: `FRONTEND_URL`

---

## Agent Roster

| Agent | Workflow | Trigger | Scope |
|-------|----------|---------|-------|
| 🔍 Health Monitor | `health-monitor.yml` | Every 15 min | Uptime, DB status |
| 🤖 Auto-Dev | `claude-agent.yml` | Issues, `/claude` comments | Any fix/feature |
| 🎨 Frontend Designer | `agent-frontend.yml` | Label: `frontend`, `design`, `ui` | `frontend/` |
| ⚙️ Backend Engineer | `agent-backend.yml` | Label: `backend`, `api`, `critical` | `backend/` |
| 🗄️ Database Agent | `agent-database.yml` | Label: `database`, `schema`, `migration` | `backend/prisma/` |
| 📣 Marketing Agent | `agent-marketing.yml` | Every Monday + label: `marketing` | Copy, growth |
| 🌍 Localization Agent | `agent-localization.yml` | 1st of month + label: `i18n` | `frontend/lib/i18n.ts` |
| 🔁 Weekly Improvement | `weekly-improvement.yml` | Every Sunday 02:00 UTC | Full codebase |

**Dashboard:** `/dashboard/agents` — see all agents, recent runs, activity feed.

---

## Security Rules (NEVER violate)

1. **Never trust client-supplied IDs** — always use `req.user.id` from JWT
2. **Always bcrypt-hash PINs** — never store plaintext
3. **Sanitize AI inputs** — use `sanitizePromptInput()` from `backend/src/utils/sanitize.ts`
4. **Require auth on all routes** — use `requireAuth` middleware
5. **Role-gate endpoints** — use `requireRole('teacher' | 'parent' | 'child' | 'admin')`
6. **Rate limiting is on** — never disable `rateLimiter` middleware

---

## Design System Rules

1. **Dark-first** — background always `#0d0d1a` or darker
2. **Glass morphism** — `rgba(255,255,255,0.07)` backgrounds, `backdrop-filter: blur()`
3. **CSS variables** — use `--theme-color`, `--theme-secondary`, `--theme-bg-tint` for theming
4. **Mobile-first** — max-width 430px for child screens, full-width for admin
5. **Child UI** — emoji-heavy, big touch targets (min 44px), high contrast, joyful
6. **Animations** — shimmer, bounce-subtle, slide-up, pop, shake (in globals.css)
7. **Never copy** other apps — create original, unique UI

---

## Git Workflow

```
feature branch (claude/xxx) → auto-merges to main → Railway deploys
```

1. Always create branch: `claude/<agent>-<timestamp>`
2. Commit with descriptive prefix: `design:`, `api:`, `db:`, `fix:`, `feat:`
3. Push to origin — auto-merge workflow handles merging to `main`
4. Railway auto-deploys within ~3 minutes

---

## File Structure

```
kinderspark-pro/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema
│   │   ├── migrations/          # SQL migrations
│   │   └── seed.ts              # Seed data
│   └── src/
│       ├── controllers/         # Business logic
│       ├── middleware/          # auth, rateLimit, cache
│       ├── routes/              # Express route handlers
│       ├── services/            # claude, badge, notification
│       └── utils/sanitize.ts   # Input sanitization
├── frontend/
│   ├── app/
│   │   ├── (auth)/login/        # Login page
│   │   ├── child/               # Child UI + layout + TabBar
│   │   ├── teacher/             # Teacher dashboard
│   │   ├── parent/              # Parent dashboard
│   │   ├── pin/                 # PIN entry page
│   │   └── dashboard/agents/   # Agent control room
│   ├── components/ui/           # Button, Modal, TabBar
│   ├── lib/
│   │   ├── api.ts               # All API calls
│   │   ├── modules.ts           # Word modules + themes
│   │   └── i18n.ts              # Translations
│   └── store/appStore.ts        # Zustand global state
├── monitoring/
│   └── health-check.js          # Railway cron health monitor
└── .github/workflows/           # All agent workflows
```

---

## How to Trigger an Agent

**Via GitHub Issues:**
```
Open issue → Add label → Agent auto-triggers
```

| Label | Agent |
|-------|-------|
| `frontend` | Frontend Designer |
| `backend` | Backend Engineer |
| `database` | Database Agent |
| `marketing` | Marketing Agent |
| `i18n` | Localization Agent |
| `claude-build` | Auto-Dev Agent |
| `claude-fix` | Auto-Dev Agent |
| `critical` | Auto-Dev + Backend Agent |

**Via Issue Comments:**
```
/claude fix the login page animation
/fix backend auth not returning token
/build add a daily reward streak bonus
```

**Via GitHub Actions UI:**
Go to Actions tab → select workflow → "Run workflow" → fill in task.

---

## Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key for all agents |
| `BACKEND_URL` | Railway backend URL |
| `FRONTEND_URL` | Railway frontend URL |
| `ALERT_WEBHOOK_URL` | (Optional) Slack/Discord webhook for alerts |

---

## Agent Communication Protocol

Agents communicate through GitHub Issues:
- Health Monitor → opens `critical` issue → Auto-Dev + Backend Agent pick it up
- Weekly Agent → opens `claude-build` issues → Specialist agents implement
- Marketing Agent → opens `marketing` issues for growth ideas
- Localization Agent → opens `cultural-theme` issues for seasonal content

All agents post a comment on the triggering issue when done.

---

*Last updated by Claude Agent System · KinderSpark Pro v2.0*
