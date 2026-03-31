---
name: lesson-builder
description: KinderSpark AI lesson and curriculum system. Use when building AI-generated lessons, tutor sessions, homework, syllabuses, or any learning content for children aged 4-10.
---

# KinderSpark Lesson Builder

## AI Prompt Rules
- Always specify **"child aged 4-8"** or **"kindergarten level"** in every prompt
- Request **strict JSON output** — no markdown fences, no extra text
- Max tokens: 100–1024 (keep small for speed + cost)
- On AI failure: return a friendly fallback — never show errors to children

## Built-in Learning Modules (frontend/lib/modules.ts)
18 modules total:
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
POST /api/ai/generate-lesson      → lesson cards JSON
POST /api/ai/tutor-feedback       → encouraging feedback for child
POST /api/ai/weekly-report        → teacher's class report
POST /api/ai/recommendations      → personalised module suggestions
POST /api/ai/generate-homework    → AI-created homework task
POST /api/ai/build-syllabus       → full syllabus from topic
POST /api/ai/send-parent-reports  → email-style parent summaries
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
2. Frontend calls `POST /api/ai/generate-lesson` → gets 10 flashcard items
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
