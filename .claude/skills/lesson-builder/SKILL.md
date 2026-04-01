---
name: lesson-builder
description: KinderSpark AI lesson and curriculum system. Use when building AI-generated lessons, tutor sessions, homework, syllabuses, or any learning content for children aged 4-10.
---

# KinderSpark Lesson Builder

## DB-First Lesson Strategy (NO unnecessary AI calls)
```
1. Check CurriculumModule table → 18 built-in modules served directly, zero AI
2. Check LessonCache table      → custom topic already generated? return cached
3. Call AI only on cache miss   → save to LessonCache before returning
```
This is enforced in `backend/src/controllers/ai.controller.ts` and all 9 AI functions in `services/ai/index.ts`.
**Never call AI directly for standard modules** — they're seeded in the DB.

## AI Prompt Rules
- Always specify **"child aged 4-8"** or **"kindergarten level"** in every prompt
- Request **strict JSON output** — no markdown fences, no extra text
- Max tokens: 100–1024 (keep small for speed + cost)
- On AI failure: return a friendly fallback — never show errors to children
- Sanitize all user input with `sanitizePromptInput()` before including in prompts

## AI Provider Chain (4 providers)
`claude-sonnet-4-6` → OpenAI → Perplexity → Gemini (`backend/src/services/ai/router.ts`)
Each provider wrapped in 30-second timeout via `Promise.race`.

## Cache Rule (MANDATORY — see .claude/rules/ai-cache.md)
Every AI function MUST:
1. `makeCacheKey(type, { ...allInputParams })`
2. `getCachedResponse(key)` → return if hit
3. `setCachedResponse(key, type, text, model)` → save after AI response

TTLs: lesson/syllabus=7d · homework=3d · report/feedback=1d · recommendations=12h

## Built-in Learning Modules (frontend/lib/modules.ts + DB CurriculumModule)
18 modules — served from DB, no AI:

| ID | Title | Type |
|----|-------|------|
| `numbers` | Numbers 1–10 | numbers |
| `numbers2` | Numbers 11–20 | numbers |
| `letters` | Letters A–Z | letters |
| `words` | Sight Words | words |
| `words2` | 2-Letter Words | words |
| `words3` | 3-Letter Words | words |
| `colors` | Colors | items |
| `animals` | Animals | items |
| `fruits` | Fruits | items |
| `shapes` | Shapes | items |
| `food` | Food | items |
| `vehicles` | Vehicles | items |
| `weather` | Weather | items |
| `body` | Body Parts | items |
| `family` | Family | items |
| `feelings` | Feelings | items |
| `habits` | Good Habits | items |
| `manners` | Manners | items |

## AI Endpoints (backend/src/routes/ai.routes.ts)
```
POST /api/ai/generate-lesson      → lesson cards JSON (DB-first)
POST /api/ai/tutor-feedback       → encouraging feedback for child
POST /api/ai/weekly-report        → teacher's class report
POST /api/ai/recommendations      → personalised module suggestions
POST /api/ai/generate-homework    → AI-created homework task
POST /api/ai/build-syllabus       → full syllabus from topic
POST /api/ai/send-parent-reports  → email-style parent summaries
GET  /api/modules                 → all active CurriculumModules (no AI)
GET  /api/modules/:moduleId/questions?difficulty=&language= → quiz questions (no AI)
```

## Lesson JSON Structure (what AI must return)
```json
{
  "title": "Animals",
  "items": [
    { "word": "Cat", "emoji": "🐱", "hint": "Says meow" },
    { "word": "Dog", "emoji": "🐶", "hint": "Man's best friend" }
  ]
}
```

## Tutor Session Flow
1. Child selects topic/module
2. Frontend calls `POST /api/ai/generate-lesson` → DB-first → gets 10 flashcard items
3. Child answers each card (match game or typing)
4. After session: `POST /api/ai/tutor-feedback` → encouraging message
5. Save session: `POST /api/ai-sessions` → stores AISession record
6. Award stars: `PUT /api/students/:id` → update stars + streak

## Syllabus Structure (Prisma)
```
Syllabus → SyllabusItem[]  (custom word lists)
Syllabus → ClassSyllabus[] (assigned to classes)
Homework → Syllabus        (homework can use syllabus)
```

## Star Rewards
- Correct answer: +1 star
- Complete session: +5 stars bonus
- Perfect score: +10 stars bonus
- Streak bonus: +2 stars per day streak
Always update via `PUT /api/students/:id` with `{ stars: newTotal, streak: newStreak }`

## Shop Items (frontend/lib/modules.ts)
**Avatars (9):** av_def (free), av_cat (20⭐), av_star (30⭐), av_ninja (50⭐), av_wizard (75⭐), av_robot (100⭐), av_dino (80⭐), av_unicorn (120⭐), av_dragon (150⭐)
**Themes (6):** th_def (free), th_ocean (40⭐), th_forest (40⭐), th_sunset (60⭐), th_rose (60⭐), th_galaxy (100⭐)
