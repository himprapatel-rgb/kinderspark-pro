# KinderSpark Pro — System Architecture

> Version 1.1 | Updated 2026-03-21

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Directory Structure](#directory-structure)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [Authentication & Authorization](#authentication--authorization)
8. [Frontend Architecture](#frontend-architecture)
9. [AI Integration](#ai-integration)
10. [Deployment](#deployment)
11. [Environment Variables](#environment-variables)
12. [Development Workflow](#development-workflow)

---

## Overview

KinderSpark Pro is a full-stack AI-powered kindergarten learning platform connecting **teachers**, **parents**, and **children** in a single cohesive application. It uses PIN-based authentication (no passwords for young children), adaptive AI tutoring via Claude, and a reward-driven engagement system.

### User Roles

| Role    | PIN Range     | Primary Capabilities                                      |
|---------|--------------|-----------------------------------------------------------|
| Teacher | `1234`       | Class management, homework, syllabus builder, AI reports  |
| Parent  | Child's PIN  | Monitor progress, view homework, message teacher          |
| Child   | `1111–5555`  | Lessons, AI tutor, drawing, tracing, star shop            |
| Admin   | `9999`       | School-wide stats, leaderboard, oversight                 |

---

## Tech Stack

### Backend
| Layer         | Technology                     |
|---------------|-------------------------------|
| Runtime       | Node.js 20 + TypeScript 5     |
| Framework     | Express 4                     |
| ORM           | Prisma 5                      |
| Database      | PostgreSQL 16                 |
| AI            | Anthropic Claude API (claude-sonnet-4-6) |
| Auth          | JSON Web Tokens (jsonwebtoken) |
| Rate Limiting | express-rate-limit            |

### Frontend
| Layer         | Technology                     |
|---------------|-------------------------------|
| Framework     | Next.js 14 (App Router)       |
| Language      | TypeScript 5                  |
| Styling       | Tailwind CSS 3                |
| State         | Zustand 4 (with persistence)  |
| HTTP Client   | Native fetch via custom wrapper |

### Infrastructure
| Service       | Provider     |
|---------------|-------------|
| Backend       | Railway      |
| Frontend      | Railway      |
| Database      | Railway PostgreSQL |
| Container     | Docker       |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Teacher  │  │  Parent  │  │  Child   │  │   Admin   │  │
│  │ Next.js  │  │ Next.js  │  │ Next.js  │  │  Next.js  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       └──────────────┴─────────────┴───────────────┘        │
│                           │                                  │
│                    Zustand Store                             │
│                  (Persisted via localStorage)                │
└───────────────────────────┬─────────────────────────────────┘
                             │  HTTPS / JSON
┌───────────────────────────▼─────────────────────────────────┐
│                        API LAYER                             │
│                                                              │
│              Express 4 + TypeScript                          │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  /auth   │  │/students │  │/homework │  │/syllabuses│  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────┤  │
│  │/messages │  │/progress │  │ /classes │  │   /admin  │  │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────┤  │
│  │   /ai    │  │/feedback │  │/ai-sess. │  │ /teacher  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                                                              │
│         Middleware: CORS → Rate Limit → JSON Parse           │
└───────────────────────────┬─────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐  ┌───────────────┐  ┌──────────────────┐
│   Prisma ORM    │  │ Claude Service│  │  Notification    │
│                 │  │               │  │  Service         │
│  PostgreSQL 16  │  │ claude-sonnet │  │  (console log)   │
│  (Railway)      │  │    -4-6       │  │                  │
└─────────────────┘  └───────────────┘  └──────────────────┘
```

---

## Directory Structure

```
kinderspark-pro/
├── ARCHITECTURE.md        # This document
├── API.md                 # Full API reference
├── README.md              # Project overview & setup
├── RAILWAY.md             # Railway deployment guide
├── docker-compose.yml     # Local development stack
│
├── backend/
│   ├── Dockerfile
│   ├── nixpacks.toml
│   ├── railway.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema (source of truth)
│   │   └── migrations/        # Migration history
│   └── src/
│       ├── app.ts             # Express app & route mounting
│       ├── index.ts           # Legacy entry (backward compat)
│       ├── prisma/
│       │   └── client.ts      # Shared Prisma singleton
│       ├── controllers/       # Request handlers (thin layer)
│       │   ├── auth.controller.ts
│       │   ├── ai.controller.ts
│       │   ├── homework.controller.ts
│       │   └── syllabus.controller.ts
│       ├── services/          # Business logic & integrations
│       │   ├── claude.service.ts   # Anthropic API calls
│       │   ├── report.service.ts   # Class report generation
│       │   └── notification.service.ts  # Push notifications (stub)
│       ├── routes/            # Route definitions
│       │   ├── auth.routes.ts
│       │   ├── student.routes.ts
│       │   ├── homework.routes.ts
│       │   ├── syllabus.routes.ts
│       │   ├── message.routes.ts
│       │   ├── progress.routes.ts
│       │   ├── ai.routes.ts
│       │   ├── admin.routes.ts
│       │   ├── teacher.routes.ts
│       │   └── classes.ts         # Legacy backward-compat
│       └── middleware/
│           ├── auth.middleware.ts  # JWT decode (non-blocking)
│           ├── role.middleware.ts  # Role enforcement
│           └── rateLimit.middleware.ts
│
└── frontend/
    ├── Dockerfile
    ├── next.config.js
    ├── tailwind.config.ts
    ├── package.json
    ├── app/                   # Next.js App Router pages
    │   ├── layout.tsx         # Root layout (fonts, global CSS)
    │   ├── page.tsx           # Root → redirect to /login
    │   ├── (auth)/
    │   │   ├── login/page.tsx # Role selection screen
    │   │   └── pin/page.tsx   # PIN entry pad
    │   ├── child/
    │   │   ├── page.tsx       # Child dashboard
    │   │   ├── lesson/[id]/page.tsx  # Lesson card viewer
    │   │   ├── tutor/page.tsx        # AI tutor quiz
    │   │   ├── draw/page.tsx         # Drawing canvas
    │   │   ├── trace/page.tsx        # Letter tracing
    │   │   └── shop/page.tsx         # Star shop
    │   ├── teacher/
    │   │   ├── page.tsx       # Teacher dashboard (tabs)
    │   │   ├── builder/page.tsx      # Syllabus builder
    │   │   └── reports/page.tsx      # AI weekly reports
    │   ├── parent/page.tsx    # Parent dashboard
    │   └── admin/page.tsx     # Admin dashboard
    ├── components/            # Shared UI components
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Toast.tsx
    │   │   └── TabBar.tsx
    │   ├── AiTutor.tsx        # Legacy (unused)
    │   ├── SyllabusBuilder.tsx  # Legacy (unused)
    │   └── DrawingCanvas.tsx    # Legacy (unused)
    ├── hooks/                 # Custom React hooks
    ├── lib/
    │   ├── api.ts             # HTTP client & all API calls
    │   ├── modules.ts         # Built-in learning modules (MODS)
    │   ├── store.ts           # Legacy Zustand store
    │   ├── speech.ts          # Text-to-speech utility
    │   ├── auth.ts            # Auth helpers
    │   └── storage.ts         # LocalStorage helpers
    ├── store/
    │   └── appStore.ts        # Primary Zustand store
    └── types/                 # TypeScript type definitions
```

---

## Database Schema

### Entity Relationship Overview

```
School (1) ──< Class (N)
Class  (1) ──< Student (N)
Class  (1) ──< Homework (N)
Class  (1) ──< Message (N)
Class  (N) ──< ClassSyllabus >── Syllabus (N)  [M:N pivot]

Student (1) ──< Progress (N)         [per module]
Student (1) ──< HomeworkCompletion (N)
Student (1) ──< AISession (N)
Student (1) ──  Feedback (1)         [one-to-one]

Homework (1) ──< HomeworkCompletion (N)
Syllabus (1) ──< SyllabusItem (N)
Syllabus (1) ──< Homework (N)        [optional link]
```

### Key Models

#### Student
```
id, name, age, avatar, pin (unique), stars, streak,
grade, aiStars, aiSessions, aiBestLevel,
ownedItems[], selectedTheme, classId,
lastLoginAt, createdAt
```

#### Homework
```
id, title, moduleId?, syllabusId?, dueDate,
assignedTo (all | studentId), starsReward,
classId, createdAt
```

#### AISession
```
id, studentId, topic, correct, total,
stars, maxLevel, accuracy, createdAt
```

---

## API Design

See [API.md](./API.md) for the complete endpoint reference.

### Base URL
- Development: `http://localhost:4000/api`
- Production: `https://<railway-backend-url>/api`

### Response Format
All successful responses return the resource directly (no wrapper):
```json
{ "id": "...", "name": "...", ... }
```

Errors always return:
```json
{ "error": "Human-readable message" }
```

### Authentication
All requests pass a JWT in `Authorization: Bearer <token>` header.
The token is obtained from `POST /auth/pin` and stored in Zustand → localStorage.

---

## Authentication & Authorization

### Flow
```
User selects role → enters PIN → POST /api/auth/pin
→ backend validates PIN in Teacher/Admin/Student table
→ returns JWT + user object
→ frontend stores token in Zustand (persisted)
→ subsequent requests include Authorization: Bearer <token>
```

### JWT Payload
```json
{ "id": "<entity_id>", "role": "teacher|admin|child|parent", "name": "..." }
```

### Hardcoded PINs (Demo / Seed)
| Role    | PIN    |
|---------|--------|
| Teacher | `1234` |
| Admin   | `9999` |
| Child 1 | `1111` |
| Child 2 | `2222` |
| Child 3 | `3333` |

### Route Security Matrix (Current)

| Area | Route(s) | Auth | Allowed Roles | Scope Rule |
|------|----------|------|---------------|------------|
| Auth | `/api/auth/pin` | Public | All | PIN + role validation + auth rate limit |
| Auth | `/api/auth/refresh`, `/api/auth/logout` | Refresh token required | Token owner | Accepts body or cookie refresh token |
| Admin | `/api/admin/*` | Required | `admin` | Global |
| Teacher | `/api/teacher/*` | Required | `teacher`, `admin` | Class-level operations |
| Classes | `/api/classes/*` | Required | `teacher`, `admin` | Global/class-level management |
| Students | `/api/students/*` | Required | Mixed | List/create/delete restricted to `teacher/admin`; profile/update paths require auth |
| Homework | `/api/homework/*` | Required | Mixed | Create/delete/reminders restricted to `teacher/admin`; complete allowed for authenticated users |
| Syllabus | `/api/syllabuses/*` | Required | Mixed | Read requires auth; write/publish/assign restricted to `teacher/admin` |
| Messages | `/api/messages/*` | Required | Mixed | Child/parent enforced to own class + own student context on read/read-all/unread/SSE |
| Progress | `/api/progress/:studentId/*` | Required | Mixed | Child/parent only for `studentId === req.user.id`; teacher/admin can access class data |
| Attendance | `/api/attendance/*` | Required | Mixed | Mark/read class attendance is `teacher/admin`; summary allows child/parent only for own class |
| AI Sessions | `/api/ai-sessions/*` | Required | Mixed | Child/parent only for own student id; teacher/admin broader visibility |
| Feedback | `/api/feedback/*` | Required | Mixed | Write restricted to `teacher/admin`; read requires auth |
| AI | `/api/ai/*` | Required | Mixed | Sensitive generation/report routes restricted to `teacher/admin`; learner feedback/recommendations require auth |

### Additional Enforcement Notes

- Production startup now fails if `JWT_SECRET` is left at default.
- `authenticate` is global middleware; sensitive routes add explicit `requireAuth` / `requireRole`.
- Ownership checks are enforced server-side for child/parent routes; client query params are not trusted for scope.

---

## Frontend Architecture

### State Management (Zustand)
```
appStore
├── user: User | null          — logged-in entity
├── role: string | null        — teacher | parent | child | admin
├── token: string | null       — JWT
├── currentStudent: Student | null  — for parent view
└── settings: Settings         — dark, accent, large, hc, dys, lang, stLimit
```

### Page Data Flow
Each page:
1. Reads `user` from Zustand store
2. Redirects to `/` if unauthenticated
3. Fetches data from backend API on mount
4. Renders with local component state

### Built-in Learning Modules (lib/modules.ts)
| ID         | Title            | Items | Type    |
|------------|-----------------|-------|---------|
| numbers    | Numbers 1–10    | 10    | numbers |
| numbers2   | Numbers 11–20   | 10    | numbers |
| letters    | ABC Alphabet    | 26    | letters |
| words      | Sight Words     | 10    | words   |
| words2     | 2-Letter Words  | 10    | words   |
| words3     | 3-Letter Words  | 10    | words   |
| animals    | Animals         | 10    | items   |
| colors     | Colors          | 10    | colors  |
| fruits     | Fruits          | 10    | items   |
| body       | Body Parts      | 8     | items   |
| feelings   | Feelings        | 8     | items   |
| habits     | Good Habits     | 8     | items   |

---

## AI Integration

All AI features use the **Anthropic Claude API** via `@anthropic-ai/sdk`.

### Model
`claude-sonnet-4-6` (configurable via `ANTHROPIC_MODEL` env var)

### Features

| Feature             | Endpoint                  | Prompt Strategy                          |
|---------------------|--------------------------|------------------------------------------|
| Lesson Generation   | `POST /ai/generate-lesson` | Structured JSON output, kindergarten curriculum |
| Weekly Report       | `POST /ai/weekly-report`  | Warm parent-friendly summary             |
| Tutor Feedback      | `POST /ai/tutor-feedback` | Age-appropriate encouragement            |

### Prompt Engineering Notes
- Always specify `"child aged 3-6"` in prompts for appropriate language
- Lesson generation requests strict JSON output (no markdown fences)
- Error fallback: if Claude call fails, return a generic encouraging message
- Max tokens kept small (100–1024) to control latency and cost

---

## Deployment

### Railway Services

| Service      | Build Command           | Start Command              |
|--------------|------------------------|----------------------------|
| `backend`    | `npm run build`         | `node dist/app.js`         |
| `frontend`   | `npm run build`         | `node .next/standalone/server.js` |
| `database`   | Railway PostgreSQL      | —                          |

### Environment Linking
- Backend reads `DATABASE_URL` from Railway's PostgreSQL plugin
- Frontend reads `NEXT_PUBLIC_API_URL` pointing to backend Railway URL
- `ANTHROPIC_API_KEY` set in backend Railway env vars

### Docker (Local Dev)
```bash
docker-compose up          # starts postgres + backend + frontend
```

---

## Environment Variables

### Backend
| Variable             | Required | Description                       |
|----------------------|----------|-----------------------------------|
| `DATABASE_URL`       | ✅       | PostgreSQL connection string      |
| `ANTHROPIC_API_KEY`  | ✅       | Anthropic API key                 |
| `JWT_SECRET`         | ✅       | Secret for signing JWTs           |
| `PORT`               | —        | Server port (default: 4000)       |
| `FRONTEND_URL`       | —        | CORS origin (default: localhost:3000) |
| `ANTHROPIC_MODEL`    | —        | Override Claude model             |

### Frontend
| Variable                | Required | Description                    |
|-------------------------|----------|-------------------------------|
| `NEXT_PUBLIC_API_URL`   | ✅       | Backend API base URL          |

---

## Development Workflow

### Local Setup
```bash
# 1. Clone and install
git clone <repo>
cd kinderspark-pro
cd backend && npm install
cd ../frontend && npm install

# 2. Start database
docker-compose up -d postgres

# 3. Run migrations
cd backend
npx prisma migrate dev

# 4. Seed database
npx prisma db seed

# 5. Start backend (port 4000)
npm run dev

# 6. Start frontend (port 3000)
cd ../frontend && npm run dev
```

### Git Branching
- `main` — production-ready code
- `claude/feature-*` — AI-assisted feature branches
- PRs required for all merges to main

### Code Standards
- TypeScript strict mode enabled
- Prisma client singleton (no multiple instances)
- All API errors use `{ error: "message" }` format
- Controllers are thin (validate → delegate to service → respond)
- Services own business logic and external calls
