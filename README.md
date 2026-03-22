# 🌟 KinderSpark Pro

> **AI-powered kindergarten learning platform** — Smart Learning · AI Powered · Worldwide

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![Claude AI](https://img.shields.io/badge/Claude-AI-orange)](https://www.anthropic.com/)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [Accessibility](#accessibility)

---

## Overview

KinderSpark Pro is a full-stack educational platform built for kindergarten classrooms worldwide. It connects **teachers**, **parents**, and **children** in a single cohesive app, powered by Claude AI for adaptive learning and lesson generation.

**Four roles, one platform:**

| Role | PIN | Access |
|------|-----|--------|
| 👩‍🏫 **Teacher** | `1234` | Manage classes, assign homework, build syllabuses, send messages, generate AI reports |
| 👨‍👩‍👧 **Parent** | child PIN | Monitor child progress, view homework, read teacher messages, reply |
| 🌟 **Child** | `1111`–`5555` | Learn through interactive lessons, AI tutor sessions, drawing, letter tracing, star shop |
| 👑 **Admin** | `9999` | School-wide oversight — all classes, teachers, students, leaderboards |

---

## Features

### 👩‍🏫 Teacher
- **Class Management** — Create and manage multiple classes; switch between them seamlessly
- **Student Roster** — Add students with custom avatars and PINs; view progress at a glance
- **Homework Assignment** — Assign built-in modules or custom syllabuses with due dates
- **Syllabus Builder** — Card builder with emoji picker, color themes, age groups
- **AI Lesson Generator** — Describe any topic; Claude generates a complete flashcard lesson instantly
- **Community Library** — Share syllabuses with teachers worldwide; download others' lessons
- **Grading & Feedback** — Grade students (A+/A/B/C/NW), write notes auto-sent to parents
- **AI Weekly Reports** — One-click AI-generated class progress reports; print-ready
- **Messaging** — Send messages to all parents or individual families

### 👨‍👩‍👧 Parent
- **Multi-child Switcher** — Monitor multiple children from a single parent login
- **Daily Summary** — AI-generated daily learning digest per child
- **Homework Tracker** — See pending and completed assignments with due dates
- **Custom Lesson Access** — View syllabuses assigned by teacher
- **Two-way Messaging** — Read teacher messages and reply directly

### 🌟 Child
- **12 Built-in Learning Modules:**
  - Numbers 1–10 & 11–20
  - ABC Alphabet (A–Z with words)
  - 2-Letter & 3-Letter Words
  - Animals, Colors, Fruits, Body Parts, Feelings
  - Good Habits & Good Manners
- **AI Tutor (Sparkle 🤖)** — Adaptive quiz engine across 6 topics; difficulty auto-adjusts (Levels 1–5)
- **Draw & Color** — Full canvas drawing with 12 colors and adjustable brush; save for stars
- **Letter Tracing** — Trace all 26 letters A–Z; progress tracking per letter
- **Star Reward Shop** — Spend earned stars on avatars and color themes
- **Homework Completion** — Complete assigned lessons; auto-notifies teacher

### 👑 Admin
- School-wide statistics dashboard
- All classes and student enrollment
- Top students leaderboard by stars

### ⚙️ Accessibility & Settings
- 🌙 Dark Mode
- 🔡 Large Text Mode
- 🔲 High Contrast Mode
- 📖 Dyslexia-friendly Font (Comic Sans)
- ⏱️ Screen Time Limits (15 / 30 / 60 min)
- 🌍 Multi-language UI (EN / FR / ES / AR / UR) with RTL support
- 🔔 Push Notifications
- 📴 Offline Mode — all content works without internet

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    KINDERSPARK PRO                       │
├──────────────────┬──────────────────┬───────────────────┤
│   FRONTEND       │    BACKEND       │   EXTERNAL        │
│   Next.js 14     │   Express.js     │                   │
│   React 18       │   Node.js        │   Claude AI API   │
│   Tailwind CSS   │   Prisma ORM     │   (Anthropic)     │
│   Zustand        │                  │                   │
│                  │                  │                   │
│   Vercel         │   PostgreSQL     │                   │
│   (Frontend)     │   Railway        │                   │
└──────────────────┴──────────────────┴───────────────────┘
```

### Request Flow

```
Browser
  │
  ├── Next.js App Router (SSR/CSR)
  │     └── API calls → /api/*
  │
  └── Express Backend (port 4000)
        ├── Auth middleware (PIN verification)
        ├── Route handlers
        ├── Prisma ORM
        │     └── PostgreSQL (port 5432)
        └── Anthropic Claude API (AI features)
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14 | React framework, App Router, SSR |
| React | 18 | UI components |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3 | Utility-first styling |
| Zustand | 4 | Global state management |
| HTML5 Canvas | — | Drawing & letter tracing |
| Web Speech API | — | Text-to-speech for lessons |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20 | Runtime |
| Express.js | 4 | HTTP server & routing |
| TypeScript | 5 | Type safety |
| Prisma | 5 | ORM & migrations |
| PostgreSQL | 16 | Primary database |

### AI / External
| Service | Purpose |
|---------|---------|
| Anthropic Claude (`claude-sonnet-4-6`) | AI lesson generation, weekly reports, tutor feedback |

### DevOps
| Tool | Purpose |
|------|---------|
| Docker Compose | Local PostgreSQL + pgAdmin |
| Vercel | Frontend hosting |
| Railway | Backend + database hosting |

---

## Database Schema

```
┌──────────┐    ┌──────────┐    ┌───────────┐
│  School  │───▶│  Class   │───▶│  Student  │
└──────────┘    └──────────┘    └───────────┘
                     │                │
                     ▼                ├──▶ Progress
                ┌──────────┐          ├──▶ HomeworkCompletion
                │ Homework │          ├──▶ AISession
                └──────────┘          └──▶ Feedback
                     │
                     ├──▶ Syllabus ──▶ SyllabusItem
                     └──▶ HomeworkCompletion

┌──────────┐
│  Message │  (teacher ↔ parent communication)
└──────────┘
```

### Key Models

**Student**
```prisma
model Student {
  id            String   @id @default(cuid())
  name          String
  age           Int
  avatar        String   @default("👧")
  pin           String
  stars         Int      @default(0)
  streak        Int      @default(0)
  grade         String?
  aiStars       Int      @default(0)
  aiSessions    Int      @default(0)
  aiBestLevel   Int      @default(1)
  ownedItems    String[]
  selectedTheme String   @default("th_def")
  classId       String
  class         Class    @relation(fields: [classId], references: [id])
}
```

**Syllabus + SyllabusItem**
```prisma
model Syllabus {
  id          String         @id @default(cuid())
  title       String
  icon        String         @default("📖")
  color       String         @default("#5E5CE6")
  grade       String         @default("all")
  type        String         @default("custom")
  description String?
  published   Boolean        @default(false)
  assignedTo  String?
  items       SyllabusItem[]
}
```

---

## API Reference

Base URL: `http://localhost:4000/api`

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/pin` | Verify PIN → returns role + user data |

```json
// POST /api/auth/pin
{ "pin": "1234", "role": "teacher" }

// Response
{ "role": "teacher", "user": { "id": "...", "name": "Ms. Sarah Johnson" } }
```

### Students

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/students` | List all students (filter by ?classId=) |
| `GET` | `/students/:id` | Get single student with progress |
| `POST` | `/students` | Create student |
| `PUT` | `/students/:id` | Update student |
| `DELETE` | `/students/:id` | Remove student |

### Classes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/classes` | List all classes |
| `POST` | `/classes` | Create class |
| `PUT` | `/classes/:id` | Update class |
| `GET` | `/classes/:id/students` | Get students in class |

### Homework

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/homework` | List homework (by class) |
| `POST` | `/homework` | Assign homework |
| `DELETE` | `/homework/:id` | Delete homework |
| `POST` | `/homework/:id/complete` | Mark as done (by student) |
| `GET` | `/homework/:id/completions` | Get completion status per student |

### Syllabuses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/syllabuses` | List syllabuses |
| `GET` | `/syllabuses/:id` | Get syllabus with all items |
| `POST` | `/syllabuses` | Create syllabus |
| `PUT` | `/syllabuses/:id` | Update syllabus |
| `DELETE` | `/syllabuses/:id` | Delete syllabus |
| `POST` | `/syllabuses/:id/assign` | Assign to students |
| `POST` | `/syllabuses/:id/publish` | Publish syllabus (make visible to students) |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/messages` | Get messages (filter by ?studentId= or ?classId=) |
| `POST` | `/messages` | Send a message |

### Progress

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/progress/:studentId` | Get all module progress for a student |
| `PUT` | `/progress/:studentId/:moduleId` | Update cards completed for a module |

### AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai/generate-lesson` | Generate flashcards via Claude AI |
| `POST` | `/ai/weekly-report` | Generate weekly class report via Claude AI |
| `POST` | `/ai/tutor-feedback` | Get personalized feedback after tutor session |

```json
// POST /api/ai/generate-lesson
{
  "topic": "Ocean animals",
  "count": 10
}

// Response
{
  "items": [
    { "w": "Dolphin", "e": "🐬", "hint": "Loves to jump and play!" },
    { "w": "Shark",   "e": "🦈", "hint": "The ocean's biggest fish!" }
  ]
}
```

### Feedback (Grading)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/feedback/:studentId` | Get teacher feedback for a student |
| `POST` | `/feedback` | Save grade + note |

### AI Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai-sessions` | Save completed AI tutor session stats |
| `GET` | `/ai-sessions/:studentId` | Get session history for student |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for local PostgreSQL)
- Anthropic API key ([get one here](https://console.anthropic.com/))

### 1. Clone & Install

```bash
git clone https://github.com/himprapatel-rgb/kinderspark-pro.git
cd kinderspark-pro

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Start the Database

```bash
# From project root
docker-compose up db -d
```

### 3. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL and ANTHROPIC_API_KEY

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local — set NEXT_PUBLIC_API_URL
```

### 4. Run Migrations & Seed

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed        # Seeds demo school, teacher, 5 students
```

### 5. Start Development Servers

```bash
# Terminal 1 — Backend API (port 4000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

Open **http://localhost:3000** in your browser.

### Demo Login PINs

| Role | PIN | Name |
|------|-----|------|
| 👩‍🏫 Teacher | `1234` | Ms. Sarah Johnson |
| 👑 Admin | `9999` | School Admin |
| 👧 Child/Parent | `1111` | Emma Wilson |
| 👦 Child/Parent | `2222` | Liam Chen |
| 🧒 Child/Parent | `3333` | Sofia Martinez |
| 🦸 Child/Parent | `4444` | Noah Patel |
| 🧙 Child/Parent | `5555` | Zara Ahmed |

---

## Environment Variables

### Backend (`backend/.env`)

```env
# PostgreSQL connection
DATABASE_URL="postgresql://kinderspark:password@localhost:5432/kinderspark"

# Server
PORT=4000
NODE_ENV=development

# Anthropic Claude AI
ANTHROPIC_API_KEY=sk-ant-api03-...

# CORS
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```env
# Backend API base URL
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## Project Structure

```
kinderspark-pro/
├── frontend/                        # Next.js 14 application
│   ├── app/
│   │   ├── layout.tsx               # Root layout (Nunito font, providers)
│   │   ├── page.tsx                 # Splash screen + role selection
│   │   ├── pin/page.tsx             # PIN entry page
│   │   ├── teacher/
│   │   │   ├── page.tsx             # Teacher dashboard (tabs: Class/HW/Syllabus/Msgs)
│   │   │   └── builder/page.tsx     # Syllabus card builder
│   │   ├── parent/page.tsx          # Parent dashboard
│   │   ├── child/
│   │   │   ├── page.tsx             # Child home
│   │   │   ├── lesson/[id]/page.tsx # Lesson player with speech
│   │   │   ├── tutor/page.tsx       # AI Tutor (Sparkle) quiz
│   │   │   ├── draw/page.tsx        # Drawing canvas
│   │   │   ├── trace/page.tsx       # Letter tracing A–Z
│   │   │   └── shop/page.tsx        # Star reward shop
│   │   └── admin/page.tsx           # Admin school overview
│   ├── components/
│   │   ├── ui/                      # Shell, StatusBar, TabBar, Modal, Toast
│   │   ├── lesson/                  # LessonCard, LessonControls, ProgressBar
│   │   ├── tutor/                   # QuizCard, AnswerGrid, DifficultyBar
│   │   ├── teacher/                 # StudentCard, HWCard, SyllabusItem
│   │   ├── drawing/                 # DrawCanvas, ColorPalette, BrushSlider
│   │   └── shop/                    # ShopItem, StarCounter
│   ├── lib/
│   │   ├── api.ts                   # Typed API client (fetch wrappers)
│   │   ├── store.ts                 # Zustand global state
│   │   ├── modules.ts               # Built-in learning modules data
│   │   ├── questions.ts             # AI tutor question bank (offline)
│   │   └── speech.ts               # Web Speech API helpers
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                         # Express.js REST API
│   ├── prisma/
│   │   ├── schema.prisma            # Database models
│   │   ├── migrations/              # Auto-generated SQL migrations
│   │   └── seed.ts                  # Demo data seeder
│   ├── src/
│   │   ├── index.ts                 # Server entry (Express setup, CORS)
│   │   ├── routes/
│   │   │   ├── auth.ts              # POST /auth/pin
│   │   │   ├── students.ts          # CRUD /students
│   │   │   ├── classes.ts           # CRUD /classes
│   │   │   ├── homework.ts          # CRUD + complete /homework
│   │   │   ├── syllabuses.ts        # CRUD + assign/publish
│   │   │   ├── messages.ts          # GET + POST /messages
│   │   │   ├── progress.ts          # GET + PUT /progress
│   │   │   ├── feedback.ts          # Grading /feedback
│   │   │   ├── aiSessions.ts        # AI session logs
│   │   │   └── ai.ts                # Claude AI endpoints
│   │   └── middleware/
│   │       └── errorHandler.ts      # Global error handler
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml               # PostgreSQL + pgAdmin services
├── .gitignore
└── README.md
```

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# Set environment variable in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-railway-backend.railway.app/api
```

### Backend + Database → Railway

1. Create a new Railway project
2. Add a **PostgreSQL** plugin
3. Deploy the `backend/` directory
4. Set environment variables in Railway dashboard
5. Run `npx prisma migrate deploy` on first deploy

### One-command Docker (Self-hosted)

```bash
docker-compose up --build
```

---

## Accessibility

KinderSpark Pro is designed for all learners:

| Feature | Description |
|---------|-------------|
| 🌙 **Dark Mode** | Reduces eye strain for evening use |
| 🔡 **Large Text** | 115% font scale applied globally |
| 🔲 **High Contrast** | Black background, white text |
| 📖 **Dyslexia Font** | Comic Sans for improved letter recognition |
| 🌍 **RTL Support** | Full right-to-left layout for Arabic & Urdu |
| ⏱️ **Screen Time** | Parental controls: 15 / 30 / 60 minute limits |
| 🔊 **Text-to-Speech** | Every lesson word spoken aloud |
| 📴 **Offline Mode** | All 12 modules + quiz bank work offline |

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

MIT — Free for educational use worldwide 🌍

---

*Built with ❤️ for children everywhere — KinderSpark Pro v1.0*
