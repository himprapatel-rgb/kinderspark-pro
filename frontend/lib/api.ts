export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://kinderspark-backend-production.up.railway.app/api'

// Keep internal alias so nothing below breaks
const BASE = API_BASE

let isRefreshing = false
let refreshQueue: Array<(ok: boolean) => void> = []

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const part = document.cookie
    .split('; ')
    .find((row) => row.startsWith('kinderspark_csrf='))
  if (!part) return null
  return decodeURIComponent(part.split('=')[1] || '')
}

function withCsrfHeader(method: string | undefined, headers: Record<string, string>): Record<string, string> {
  const m = (method || 'GET').toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) return headers
  const csrf = getCsrfToken()
  if (!csrf) return headers
  return { ...headers, 'x-csrf-token': csrf }
}

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return new Promise(resolve => {
      refreshQueue.push(resolve)
    })
  }
  isRefreshing = true
  try {
    const headers = withCsrfHeader('POST', { 'Content-Type': 'application/json' })
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers,
      credentials: 'include',
    })
    const ok = res.ok
    refreshQueue.forEach(cb => cb(ok))
    refreshQueue = []
    return ok
  } catch {
    refreshQueue.forEach(cb => cb(false))
    refreshQueue = []
    return false
  } finally {
    isRefreshing = false
  }
}

async function req(path: string, options?: RequestInit): Promise<any> {
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  }
  const headers = withCsrfHeader(options?.method, requestHeaders)
  const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include' })

  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const retryHeaders = withCsrfHeader(options?.method, {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> | undefined),
      })
      const retry = await fetch(`${BASE}${path}`, { ...options, headers: retryHeaders, credentials: 'include' })
      if (!retry.ok) {
        const error = await retry.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.error || `HTTP ${retry.status}`)
      }
      return retry.json()
    }
    throw new Error('Session expired. Please log in again.')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/** Demo / dev school code (set NEXT_PUBLIC_DEMO_SCHOOL_CODE in .env.local, e.g. SUN001). */
export function getDemoSchoolCode(): string {
  return (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_SCHOOL_CODE) || 'SUN001'
}

export async function verifyPin(pin: string, role: string, schoolCode: string) {
  const code = schoolCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (code.length !== 6) {
    throw new Error('School code must be 6 letters or numbers')
  }
  const data = await req('/auth/pin', {
    method: 'POST',
    body: JSON.stringify({ pin, role, schoolCode: code }),
  })
  return data
}

export async function registerAccount(data: {
  displayName: string
  pin: string
  role: string
  email?: string
  avatar?: string
  /** Required when role is `child` — must match a school in the database. */
  schoolCode?: string
}) {
  return req('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function logoutApi() {
  await req('/auth/logout', { method: 'POST' }).catch(() => {})
}

export async function getStudents(classId?: string) {
  const query = classId ? `?classId=${classId}` : ''
  return req(`/students${query}`)
}

export async function getStudent(id: string) {
  return req(`/students/${id}`)
}

export async function createStudent(data: any) {
  return req('/students', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateStudent(id: string, data: any) {
  return req(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteStudent(id: string) {
  return req(`/students/${id}`, { method: 'DELETE' })
}

/** Parent/teacher/admin: COPPA/GDPR consent status for a roster `Student` id. Returns null if not a student record or inaccessible. */
export async function getPrivacyConsent(studentId: string): Promise<{
  hasConsent: boolean
  consent: { id: string; studentId: string; parentName: string; parentEmail: string; consentedAt: string } | null
} | null> {
  try {
    return await req(`/privacy/consent/${encodeURIComponent(studentId)}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Student not found') || msg.includes('HTTP 404') || msg.includes('do not have access'))
      return null
    throw e
  }
}

export async function postPrivacyConsent(body: {
  studentId: string
  parentName: string
  parentEmail: string
}) {
  return req('/privacy/consent', { method: 'POST', body: JSON.stringify(body) })
}

/** Parent or admin: hard-delete child `Student` row and related data (GDPR erasure). */
export async function deletePrivacyStudentData(studentId: string) {
  return req(`/privacy/student/${encodeURIComponent(studentId)}`, { method: 'DELETE' })
}

export async function getClasses() {
  return req('/classes')
}

export async function getClass(id: string) {
  return req(`/classes/${id}`)
}

export async function createClass(data: any) {
  return req('/classes', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateClass(id: string, data: any) {
  return req(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteClass(id: string) {
  return req(`/classes/${id}`, { method: 'DELETE' })
}

export async function getHomework(classId: string) {
  return req(`/homework?classId=${classId}`)
}

export async function createHomework(data: any) {
  return req('/homework', { method: 'POST', body: JSON.stringify(data) })
}

export async function deleteHomework(id: string) {
  return req(`/homework/${id}`, { method: 'DELETE' })
}

export async function completeHomework(hwId: string, studentId: string) {
  return req(`/homework/${hwId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  })
}

export async function getHomeworkCompletions(hwId: string) {
  return req(`/homework/${hwId}/completions`)
}

export async function getSyllabuses(classId?: string) {
  const query = classId ? `?classId=${classId}` : ''
  return req(`/syllabuses${query}`)
}

export async function getSyllabus(id: string) {
  return req(`/syllabuses/${id}`)
}

export async function createSyllabus(data: any) {
  return req('/syllabuses', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateSyllabus(id: string, data: any) {
  return req(`/syllabuses/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteSyllabus(id: string) {
  return req(`/syllabuses/${id}`, { method: 'DELETE' })
}

export async function publishSyllabus(id: string) {
  return req(`/syllabuses/${id}/publish`, { method: 'POST' })
}

export async function assignSyllabus(id: string, assignedTo: string, classId?: string) {
  return req(`/syllabuses/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignedTo, classId }),
  })
}

export async function getMessages(params: { classId?: string; studentId?: string }) {
  const query = new URLSearchParams()
  if (params.classId) query.set('classId', params.classId)
  if (params.studentId) query.set('studentId', params.studentId)
  return req(`/messages?${query.toString()}`)
}

export async function sendMessage(data: any) {
  return req('/messages', { method: 'POST', body: JSON.stringify(data) })
}

export async function getUnreadCount(params: { classId?: string; studentId?: string }) {
  const query = new URLSearchParams()
  if (params.classId) query.set('classId', params.classId)
  if (params.studentId) query.set('studentId', params.studentId)
  return req(`/messages/unread-count?${query.toString()}`)
}

export async function markMessageRead(id: string) {
  return req(`/messages/${id}/read`, { method: 'PUT' })
}

export async function markAllMessagesRead(classId?: string, studentId?: string) {
  return req('/messages/read-all', {
    method: 'PUT',
    body: JSON.stringify({ classId, studentId }),
  })
}

// ── Threaded messaging APIs (Phase 2) ────────────────────────────────────────
export type ThreadScope = 'school' | 'classGroup' | 'student' | 'direct'
export type ThreadPriority = 'normal' | 'important' | 'urgent'
export type ThreadMessageKind = 'school_announcement' | 'class_update' | 'direct_message'

export async function getMessageThreads(params?: {
  scopeType?: ThreadScope
  schoolId?: string
  classGroupId?: string
  studentProfileId?: string
}) {
  const query = new URLSearchParams()
  if (params?.scopeType) query.set('scopeType', params.scopeType)
  if (params?.schoolId) query.set('schoolId', params.schoolId)
  if (params?.classGroupId) query.set('classGroupId', params.classGroupId)
  if (params?.studentProfileId) query.set('studentProfileId', params.studentProfileId)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return req(`/messages/threads${suffix}`)
}

export async function createMessageThread(data: {
  scopeType: ThreadScope
  schoolId?: string
  classGroupId?: string
  studentProfileId?: string
  participantUserIds?: string[]
}) {
  return req('/messages/threads', { method: 'POST', body: JSON.stringify(data) })
}

export async function getThreadMessages(threadId: string) {
  return req(`/messages/threads/${encodeURIComponent(threadId)}/messages`)
}

export async function sendThreadMessage(threadId: string, data: {
  body: string
  kind: ThreadMessageKind
  priority?: ThreadPriority
  expiresAt?: string
}) {
  return req(`/messages/threads/${encodeURIComponent(threadId)}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function lookupMessageRecipient(profileId: string) {
  const query = new URLSearchParams()
  query.set('profileId', profileId)
  return req(`/messages/recipients/lookup?${query.toString()}`)
}

export async function getMessageRecipients() {
  return req('/messages/recipients')
}

export async function markThreadRead(threadId: string) {
  return req(`/messages/threads/${encodeURIComponent(threadId)}/read`, {
    method: 'POST',
  })
}

export async function getProgress(studentId: string) {
  return req(`/progress/${studentId}`)
}

export async function updateProgress(
  studentId: string,
  moduleId: string,
  cards: number,
  extra?: {
    lessonTotal?: number
    score?: number
    attempts?: number
    incrementAttempt?: boolean
    correctAnswers?: number
    totalQuestions?: number
    timeSpentSeconds?: number
    addTimeSeconds?: number
    lastAttemptAt?: string
  }
) {
  return req(`/progress/${studentId}/${moduleId}`, {
    method: 'PUT',
    body: JSON.stringify({ cards, ...extra }),
  })
}

export async function logQuizResponse(data: {
  studentId: string
  moduleId: string
  questionId?: string
  answer: string
  isCorrect: boolean
}) {
  return req('/progress/quiz-response', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getFeedback(studentId: string) {
  return req(`/feedback/${studentId}`)
}

export async function saveFeedback(data: any) {
  return req('/feedback', { method: 'POST', body: JSON.stringify(data) })
}

export async function getAISessions(studentId: string) {
  return req(`/ai-sessions/${studentId}`)
}

export async function saveAISession(data: any) {
  return req('/ai-sessions', { method: 'POST', body: JSON.stringify(data) })
}

export async function generateLesson(topic: string, count: number) {
  return req('/ai/generate-lesson', {
    method: 'POST',
    body: JSON.stringify({ topic, count }),
  })
}

export async function sendParentReports(classId: string) {
  return req('/ai/send-parent-reports', {
    method: 'POST',
    body: JSON.stringify({ classId }),
  })
}

export async function getClassAnalytics() {
  return req('/admin/class-analytics')
}

export async function generateHomeworkAI(data: { topic: string; grade?: string; classId?: string }) {
  return req('/ai/generate-homework', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function generateReport(classId: string) {
  return req('/ai/weekly-report', {
    method: 'POST',
    body: JSON.stringify({ classId }),
  })
}

export async function getTutorFeedback(data: {
  correct: number
  total: number
  topic: string
  maxLevel: number
  /** Stable topic id for tutor memory (e.g. module id). */
  topicId?: string
  studentId?: string
}) {
  return req('/ai/tutor-feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function saveStudentDrawing(studentId: string, image: string) {
  return req(`/drawings/${encodeURIComponent(studentId)}`, {
    method: 'POST',
    body: JSON.stringify({ image }),
  })
}

export async function getStudentDrawings(studentId: string) {
  return req(`/drawings/${encodeURIComponent(studentId)}`)
}

export async function deleteStudentDrawing(drawingId: string) {
  return req(`/drawings/item/${encodeURIComponent(drawingId)}`, { method: 'DELETE' })
}

export async function getRecommendations(studentId: string) {
  return req('/ai/recommendations', {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  })
}

/** AI poem: server uses locked prompt; user sends one word or short line only. */
export async function generatePoemSpark(data: { spark: string; targetMinutes?: number }) {
  return req('/ai/poem-spark', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** Unified spark tasks: poem-listen-spark | tutor-hint-spark | homework-idea-spark (teacher/admin). */
export async function runAiSparkTask(data: {
  taskId: string
  spark?: string
  targetMinutes?: number
  topic?: string
  grade?: string
  classId?: string
}) {
  return req('/ai/spark-task', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getSparkArtifacts(taskId?: string) {
  const q = taskId ? `?taskId=${encodeURIComponent(taskId)}` : ''
  return req(`/ai/spark-artifacts${q}`)
}

export async function getAdminStats() {
  return req('/admin/stats')
}

export async function getAdminLeaderboard() {
  return req('/admin/leaderboard')
}

export async function getClassStats(classId: string) {
  return req(`/teacher/class/${classId}/stats`)
}

export async function getTeacherMe() {
  return req('/teacher/me')
}

// Attendance
export async function getAttendance(classId: string, date: string) {
  return req(`/attendance?classId=${classId}&date=${date}`)
}

export async function saveAttendance(classId: string, date: string, records: Array<{ studentId: string; present: boolean; note?: string }>) {
  return req('/attendance', {
    method: 'POST',
    body: JSON.stringify({ classId, date, records }),
  })
}

export async function getAttendanceSummary(classId: string, days = 30) {
  return req(`/attendance/summary?classId=${classId}&days=${days}`)
}

// ── New Feature APIs ──────────────────────────────────────────────────────────

export async function savePushToken(studentId: string, token: string) {
  return req(`/students/${studentId}/push-token`, {
    method: 'PATCH',
    body: JSON.stringify({ token }),
  })
}

export async function getStudentBadges(studentId: string) {
  return req(`/students/${studentId}/badges`)
}

export async function getClassActivity(classId: string) {
  return req(`/classes/${classId}/activity`)
}

// ── Activity Feed (Photo Sharing) ────────────────────────────────
export async function getActivityFeed(classId: string, limit = 20) {
  return req(`/activity/${classId}?limit=${limit}`)
}

export async function createActivityPost(data: {
  classId: string
  imageData: string
  caption?: string
  studentTags?: string[]
  emoji?: string
  generateCaption?: boolean
}) {
  return req('/activity', { method: 'POST', body: JSON.stringify(data) })
}

export async function likeActivityPost(postId: string) {
  return req(`/activity/${postId}/like`, { method: 'POST' })
}

export async function deleteActivityPost(postId: string) {
  return req(`/activity/${postId}`, { method: 'DELETE' })
}

export async function sendHomeworkReminders(classId?: string) {
  return req('/homework/send-reminders', {
    method: 'POST',
    body: JSON.stringify({ classId }),
  })
}

export async function autoSyllabus(data: { topic: string; grade?: string; count?: number; classId?: string }) {
  return req('/ai/build-syllabus', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ── Ecosystem APIs ─────────────────────────────────────────────────────────────
export async function getKpiSchema() {
  return req('/ecosystem/kpi-schema')
}

export async function getPilotMetrics() {
  return req('/ecosystem/pilot-metrics')
}

export async function getTeacherInterventions(classId: string) {
  return req(`/ecosystem/teacher-interventions?classId=${encodeURIComponent(classId)}`)
}

export async function getDailyMission(data: { studentId: string; classId: string }) {
  return req('/ecosystem/daily-mission', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function completeDailyMission(data: { studentId: string; classId: string }) {
  return req('/ecosystem/daily-mission/complete', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getDiagRecent() {
  return req('/diag/recent')
}

export async function setGeofenceConsent(enabled: boolean) {
  return req('/attendance/geofence/consent', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  })
}

export async function postGeofenceEvent(data: { type: 'enter' | 'exit'; regionLabel?: string }) {
  return req('/attendance/geofence/event', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getGeofenceEvents() {
  return req('/attendance/geofence/events')
}

// ── Profile + relationship APIs ────────────────────────────────────────────────
export async function getMyProfile() {
  return req('/profiles/me')
}

export async function updateMyProfile(data: { displayName?: string; avatar?: string; email?: string }) {
  return req('/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteMyAccount() {
  return req('/profiles/me', { method: 'DELETE' })
}

/** Extended student record + linked guardian summaries (GET /profiles/student/:id) */
export async function getStudentProfile(studentId: string) {
  return req(`/profiles/student/${encodeURIComponent(studentId)}`)
}

export async function patchStudentProfile(studentId: string, data: Record<string, unknown>) {
  return req(`/profiles/student/${encodeURIComponent(studentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** Parent guardian profile (GET/PATCH /profiles/guardian/me) */
export async function getGuardianProfile() {
  return req('/profiles/guardian/me')
}

export async function patchGuardianProfile(data: Record<string, unknown>) {
  return req('/profiles/guardian/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function getSchoolOverview(schoolId: string) {
  return req(`/schools/${encodeURIComponent(schoolId)}/overview`)
}

export async function getSchoolGrades(schoolId: string) {
  return req(`/schools/${encodeURIComponent(schoolId)}/grades`)
}

export async function getSchoolGraph(schoolId: string) {
  return req(`/schools/${encodeURIComponent(schoolId)}/graph`)
}

export async function assignTeacherToClass(data: { teacherProfileId: string; classGroupId: string; subject?: string; isPrimary?: boolean }) {
  return req('/assignments/teacher-class', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function enrollStudentInClass(data: { studentProfileId: string; classGroupId: string; startDate?: string }) {
  return req('/assignments/student-enrollment', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function assignTeacherStudentOverride(data: {
  teacherProfileId: string
  studentProfileId: string
  subject?: string
  reason?: string
  startDate?: string
  endDate?: string
  isActive?: boolean
}) {
  return req('/assignments/teacher-student-override', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getStudentTeacherOverrides(studentProfileId: string) {
  return req(`/assignments/student/${encodeURIComponent(studentProfileId)}/teacher-overrides`)
}

export async function deleteTeacherStudentOverride(id: string) {
  return req(`/assignments/teacher-student-override/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function linkParentChild(data: { parentProfileId: string; studentProfileId: string; relationType?: string; isPrimary?: boolean }) {
  return req('/relationships/parent-child', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

/** Tokens are stored in secure cookies; raw JWT is intentionally unavailable in client JS. */
export function getRawToken(): string | null { return null }

/**
 * Opens an SSE connection to /api/messages/stream for a given classId.
 * Returns the EventSource so the caller can close it on cleanup.
 *
 * Falls back to null if EventSource is not supported in this environment
 * (the caller should detect this and fall back to polling).
 */
export function createMessageStream(classId: string): EventSource | null {
  if (typeof window === 'undefined' || !('EventSource' in window)) return null
  const url = `${API_BASE}/messages/stream?classId=${encodeURIComponent(classId)}`
  return new EventSource(url, { withCredentials: true })
}

