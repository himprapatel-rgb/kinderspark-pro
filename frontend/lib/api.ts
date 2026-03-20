const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

async function req(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function verifyPin(pin: string, role: string) {
  return req('/auth/pin', {
    method: 'POST',
    body: JSON.stringify({ pin, role }),
  })
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
