# KinderSpark Pro — API Reference

> Base URL: `http://localhost:4000/api` (dev) | `https://<railway-url>/api` (prod)

All requests that modify data require `Authorization: Bearer <jwt>` header.

---

## Authentication

### POST /auth/pin
Verify a PIN and receive a JWT token.

**Request**
```json
{ "pin": "1234", "role": "teacher" }
```
`role`: `teacher` | `admin` | `child` | `parent`

**Response 200**
```json
{
  "success": true,
  "role": "teacher",
  "token": "<jwt>",
  "user": { "id": "...", "name": "Ms. Sarah" }
}
```

**Response 401** — Wrong PIN
```json
{ "error": "Wrong PIN" }
```

### POST /auth/refresh
Refreshes access token and rotates refresh token.

- Accepts `refreshToken` in request body **or** `kinderspark_refresh` httpOnly cookie.
- Returns fresh `token` + rotated `refreshToken`.

### POST /auth/logout
Revokes refresh token and clears auth cookies.

- Accepts `refreshToken` in request body **or** `kinderspark_refresh` cookie.

---

## Students

### GET /students
List students, optionally filtered by class.

**Query params:** `?classId=<id>`

**Response 200** — Array of Student objects with progress and feedback included.

---

### GET /students/:id
Get a single student with full details (progress, feedback, AI sessions).

---

### POST /students
Create a new student.

**Request**
```json
{
  "name": "Alice",
  "age": 5,
  "avatar": "👧",
  "pin": "1111",
  "classId": "<class_id>"
}
```

---

### PUT /students/:id
Update student fields (stars, streak, grade, AI stats, ownedItems, selectedTheme).

**Request** — send only fields to update:
```json
{ "stars": 50, "streak": 3 }
```

---

### DELETE /students/:id
Delete a student and all related records (cascade).

---

## Classes

### GET /classes
List all classes with student/homework/syllabus counts.

**Response 200**
```json
[{
  "id": "...",
  "name": "KG Blue",
  "grade": "KG 1",
  "_count": { "students": 12, "homework": 5, "syllabuses": 3 }
}]
```

---

### GET /classes/:id
Get a single class.

---

### GET /classes/:id/students
Get all students in a class with progress and feedback.

---

### POST /classes
Create a new class.

**Request**
```json
{ "name": "KG Blue", "grade": "KG 1", "schoolId": null }
```

---

### PUT /classes/:id
Update class name or grade.

---

### DELETE /classes/:id
Delete a class (only if empty — no students).

---

## Homework

### GET /homework
List homework for a class.

**Query params:** `?classId=<id>`

**Response** — includes `completions` array and linked `syllabus` with items.

---

### POST /homework
Assign new homework.

**Request**
```json
{
  "title": "Learn Animals",
  "moduleId": "animals",
  "syllabusId": null,
  "dueDate": "2026-03-28",
  "assignedTo": "all",
  "starsReward": 5,
  "classId": "<class_id>"
}
```

---

### DELETE /homework/:id
Delete a homework assignment.

---

### POST /homework/:id/complete
Mark homework as completed by a student. Awards `starsReward` stars.

**Request**
```json
{ "studentId": "<student_id>" }
```

**Response**
```json
{
  "id": "...", "done": true, "completedAt": "...",
  "starsAwarded": 5
}
```

---

### GET /homework/:id/completions
Get completion records for a homework assignment.

---

## Syllabuses (Custom Lessons)

### GET /syllabuses
List syllabuses. Optionally filter by class.

**Query params:** `?classId=<id>`

---

### GET /syllabuses/:id
Get a syllabus with all items (ordered).

---

### POST /syllabuses
Create a custom syllabus with items.

**Request**
```json
{
  "title": "My Animals Lesson",
  "icon": "🐾",
  "color": "#30D158",
  "grade": "KG 1",
  "description": "Learn farm animals",
  "classId": "<class_id>",
  "items": [
    { "word": "Cow", "emoji": "🐄", "hint": "Says moo", "order": 0 }
  ]
}
```

---

### PUT /syllabuses/:id
Update syllabus and replace all items.

---

### DELETE /syllabuses/:id
Delete a syllabus.

---

### POST /syllabuses/:id/publish
Publish syllabus to the community library.

---

### POST /syllabuses/:id/assign
Assign syllabus to a class.

**Request**
```json
{ "classId": "<class_id>" }
```

---

## Messages

### GET /messages
Get messages. Filter by class or student.

**Query params:** `?classId=<id>` or `?studentId=<id>`

---

### POST /messages
Send a message.

**Request**
```json
{
  "from": "Ms. Sarah",
  "fromId": "<teacher_id>",
  "to": "all",
  "subject": "Weekly Update",
  "body": "Great week everyone!",
  "classId": "<class_id>"
}
```

---

## Progress

### GET /progress/:studentId
Get all module progress for a student.

**Response**
```json
[{ "moduleId": "numbers", "cards": 8 }, ...]
```

---

### PUT /progress/:studentId/:moduleId
Upsert progress for a module (only updates if new value is higher).

**Request**
```json
{ "cards": 10 }
```

---

## Feedback & Grades

### GET /feedback/:studentId
Get teacher feedback/grade for a student.

---

### POST /feedback
Save feedback (upsert by studentId).

**Request**
```json
{
  "studentId": "<id>",
  "grade": "A+",
  "note": "Excellent work this week!"
}
```

---

## AI Sessions

### GET /ai-sessions/:studentId
Get last 20 AI tutor sessions for a student.

---

### POST /ai-sessions
Log a completed AI tutor session. Automatically updates student AI stats.

**Request**
```json
{
  "studentId": "<id>",
  "topic": "animals",
  "correct": 8,
  "total": 10,
  "stars": 3,
  "maxLevel": 3,
  "accuracy": 80
}
```

---

## AI Endpoints

### POST /ai/generate-lesson
Generate flashcard items with Claude AI.

**Request**
```json
{ "topic": "Farm Animals", "count": 10 }
```

**Response**
```json
{
  "items": [
    { "w": "Cow", "e": "🐄", "hint": "Says moo on the farm!" }
  ]
}
```

---

### POST /ai/weekly-report
Generate an AI-written class progress report.

**Request**
```json
{ "classId": "<class_id>" }
```

**Response**
```json
{ "report": "This week KG Blue showed wonderful progress..." }
```

---

### POST /ai/tutor-feedback
Generate personalized encouragement for a quiz result.

**Request**
```json
{ "correct": 7, "total": 10, "topic": "numbers", "maxLevel": 2 }
```

**Response**
```json
{ "feedback": "Amazing work! You got 7 out of 10 right..." }
```

---

## Teacher

### GET /teacher/me
Get logged-in teacher profile. Requires valid teacher JWT.

---

### GET /teacher/class/:classId/stats
Get aggregated statistics for a class.

**Response**
```json
{
  "totalStudents": 12,
  "totalStars": 340,
  "totalAISessions": 45,
  "avgStreak": 3,
  "avgHwCompletion": 72,
  "topStudents": [...]
}
```

---

## Admin

### GET /admin/stats
School-wide aggregate statistics.

**Response**
```json
{
  "totalClasses": 4,
  "totalStudents": 48,
  "totalSyllabuses": 12,
  "totalStars": 1240
}
```

---

### GET /admin/leaderboard
Top 10 students by stars across all classes.

**Response**
```json
[{
  "id": "...", "name": "Alice", "avatar": "⭐",
  "stars": 120, "className": "KG Blue"
}]
```

---

## Health Check

### GET /health
```json
{ "status": "ok", "version": "1.0.0" }
```

---

## Error Codes

| HTTP Status | Meaning                          |
|-------------|----------------------------------|
| 400         | Bad request / missing fields     |
| 401         | Wrong PIN / invalid token        |
| 403         | Insufficient role permissions    |
| 404         | Resource not found               |
| 429         | Rate limit exceeded              |
| 500         | Internal server error            |
