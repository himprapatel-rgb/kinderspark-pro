const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('kinderspark-store')
    if (!raw) return null
    const state = JSON.parse(raw)
    return state?.state?.token || null
  } catch {
    return null
  }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('kinderspark-refresh') || null
  } catch {
    return null
  }
}

function setTokens(token: string, refreshToken: string) {
  try {
    const raw = localStorage.getItem('kinderspark-store')
    if (raw) {
      const parsed = JSON.parse(raw)
      parsed.state = { ...parsed.state, token }
      localStorage.setItem('kinderspark-store', JSON.stringify(parsed))
    }
    localStorage.setItem('kinderspark-refresh', refreshToken)
  } catch {}
}

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  if (isRefreshing) {
    return new Promise(resolve => {
      refreshQueue.push(resolve)
    })
  }
  isRefreshing = true
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json()
    setTokens(data.token, data.refreshToken)
    refreshQueue.forEach(cb => cb(data.token))
    refreshQueue = []
    return data.token
  } catch {
    return null
  } finally {
    isRefreshing = false
  }
}

async function req(path: string, options?: RequestInit): Promise<any> {
  let token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { headers, ...options })

  if (res.status === 401) {
    const newToken = await tryRefresh()
    if (newToken) {
      const retryHeaders: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${newToken}` }
      const retry = await fetch(`${BASE}${path}`, { headers: retryHeaders, ...options })
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

export async function verifyPin(pin: string, role: string) {
  const data = await req('/auth/pin', {
    method: 'POST',
    body: JSON.stringify({ pin, role }),
  })
  if (data.refreshToken) {
    localStorage.setItem('kinderspark-refresh', data.refreshToken)
  }
  return data
}

export async function logoutApi() {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    await req('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(() => {})
    localStorage.removeItem('kinderspark-refresh')
  }
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

export async function getProgress(studentId: string) {
  return req(`/progress/${studentId}`)
}

export async function updateProgress(studentId: string, moduleId: string, cards: number) {
  return req(`/progress/${studentId}/${moduleId}`, {
    method: 'PUT',
    body: JSON.stringify({ cards }),
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

export async function getTutorFeedback(data: { correct: number; total: number; topic: string; maxLevel: number }) {
  return req('/ai/tutor-feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getRecommendations(studentId: string) {
  return req('/ai/recommendations', {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  })
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
