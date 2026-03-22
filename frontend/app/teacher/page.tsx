'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import {
  getClasses, getStudents, getHomework, getSyllabuses, getMessages,
  createClass, createStudent, deleteStudent, createHomework, deleteHomework,
  completeHomework, sendMessage, deleteClass, assignSyllabus,
  getAttendance, saveAttendance, generateReport,
} from '@/lib/api'

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const AVATARS = ['🦁', '🐼', '🐨', '🦊', '🐸', '🦋', '🐙', '🦄', '🐳', '🦉']

type Tab = 'home' | 'students' | 'homework' | 'syllabus' | 'messages' | 'attendance'

export default function TeacherDashboard() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)

  const [tab, setTab] = useState<Tab>('home')

  // Data
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [homework, setHomework] = useState<any[]>([])
  const [syllabuses, setSyllabuses] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Forms
  const [newClassName, setNewClassName] = useState('')
  const [newStudent, setNewStudent] = useState({ name: '', pin: '', avatar: '🦁' })
  const [hwForm, setHwForm] = useState({ title: '', moduleId: '', dueDate: '', starsReward: 5 })
  const [msgForm, setMsgForm] = useState({ subject: '', body: '' })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10))
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, boolean>>({})
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [reportText, setReportText] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    load()
  }, [user, router])

  useEffect(() => {
    if (selectedClass) loadClassData(selectedClass.id)
  }, [selectedClass])

  useEffect(() => {
    if (tab === 'attendance' && selectedClass) loadAttendance()
  }, [tab, attendanceDate, selectedClass])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = async () => {
    try {
      const cls = await getClasses()
      setClasses(cls)
      if (cls.length > 0) setSelectedClass(cls[0])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadClassData = async (classId: string) => {
    try {
      const [stu, hw, syl, msg] = await Promise.all([
        getStudents(classId),
        getHomework(classId),
        getSyllabuses(classId),
        getMessages({ classId }),
      ])
      setStudents(stu)
      setHomework(hw)
      setSyllabuses(syl)
      setMessages(msg)
    } catch (e) { console.error(e) }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCreateClass = async () => {
    if (!newClassName.trim()) return
    setBusy(true)
    try {
      const cls = await createClass({ name: newClassName.trim(), grade: 'KG 1' })
      setClasses(prev => [...prev, cls])
      setSelectedClass(cls)
      setNewClassName('')
      showToast('Class created!')
    } catch (e: any) { showToast(e.message) }
    finally { setBusy(false) }
  }

  const handleDeleteClass = async (id: string) => {
    setBusy(true)
    try {
      await deleteClass(id)
      const updated = classes.filter(c => c.id !== id)
      setClasses(updated)
      setSelectedClass(updated[0] || null)
      setShowDeleteConfirm(null)
      showToast('Class deleted')
    } catch (e: any) { showToast(e.message) }
    finally { setBusy(false) }
  }

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.pin || !selectedClass) return
    setBusy(true)
    try {
      const stu = await createStudent({ ...newStudent, classId: selectedClass.id, role: 'child' })
      setStudents(prev => [...prev, stu])
      setNewStudent({ name: '', pin: '', avatar: '🦁' })
      showToast('Student added!')
    } catch (e: any) { showToast(e.message) }
    finally { setBusy(false) }
  }

  const handleDeleteStudent = async (id: string) => {
    setBusy(true)
    try {
      await deleteStudent(id)
      setStudents(prev => prev.filter(s => s.id !== id))
      showToast('Student removed')
    } catch (e: any) { showToast(e.message) }
    finally { setBusy(false) }
  }

  const handleCreateHomework = async () => {
    if (!hwForm.title || !hwForm.dueDate || !selectedClass) return
    setBusy(true)
    try {
      const hw = await createHomework({ ...hwForm, classId: selectedClass.id })
      setHomework(prev => [...prev, hw])
      setHwForm({ title: '', moduleId: '', dueDate: '', starsReward: 5 })
      showToast('Homework assigned!')
    } catch (e: any) { showToast(e.message) }
    finally { setBusy(false) }
  }

  const handleDeleteHomework = async (id: string) => {
    setBusy(true)
    try {
      await deleteHomework(id)
      setHomework(prev => prev.filter(h => h.id !== id))
      showToast('Homework removed')
    } catch (e: any) { showToast(e.message) }
    finally { setBusy(false) }
  }

  const handleSendMessage = async () => {
    if (!msgForm.subject || !msgForm.body || !selectedClass) return
    setBusy(true)
    try {
      await sendMessage({
        from: user?.name || 'Teacher',
        fromId: user?.id,
        to: 'class',
        subject: msgForm.subject,
        body: msgForm.body,
        classId: selectedClass.id,
      })
      await loadClassData(selectedClass.id)
      setMsgForm({ subject: '', body: '' })
      showToast('Message sent!')
    } catch (e: any) { showToast(e.message) }
    finally { setBusy(false) }
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const pendingHW = (hw: any) => {
    const completedCount = hw.completions?.filter((c: any) => c.done).length || 0
    return { total: students.length, done: completedCount }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a2e' }}>
        <div className="text-white/60 font-bold text-lg">Loading...</div>
      </div>
    )
  }

  const TABS: { id: Tab; emoji: string; label: string }[] = [
    { id: 'home',       emoji: '🏠', label: 'Home' },
    { id: 'students',   emoji: '👥', label: 'Students' },
    { id: 'homework',   emoji: '📚', label: 'Homework' },
    { id: 'attendance', emoji: '✅', label: 'Attend' },
    { id: 'syllabus',   emoji: '📖', label: 'Syllabus' },
    { id: 'messages',   emoji: '💬', label: 'Messages' },
  ]

  const loadAttendance = async () => {
    if (!selectedClass) return
    setAttendanceLoading(true)
    try {
      const records = await getAttendance(selectedClass.id, attendanceDate)
      const map: Record<string, boolean> = {}
      records.forEach((r: any) => { if (r.present !== null) map[r.studentId] = r.present })
      setAttendanceRecords(map)
    } catch {}
    setAttendanceLoading(false)
  }

  const saveAttendanceHandler = async () => {
    if (!selectedClass) return
    setBusy(true)
    try {
      const records = students.map(s => ({ studentId: s.id, present: attendanceRecords[s.id] ?? true }))
      await saveAttendance(selectedClass.id, attendanceDate, records)
      showToast('✅ Attendance saved!')
    } catch (e: any) { showToast('Error: ' + e.message) }
    setBusy(false)
  }

  const generateReportHandler = async () => {
    if (!selectedClass) return
    setReportLoading(true)
    try {
      const res = await generateReport(selectedClass.id)
      setReportText(res.report)
    } catch { setReportText('Could not generate report. Try again.') }
    setReportLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white text-black font-black text-sm px-5 py-3 rounded-full shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#5E5CE6,#BF5AF2)' }} className="p-5 pt-10">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-white/70 text-xs font-bold uppercase tracking-wider">Teacher Portal</div>
            <div className="text-white text-xl font-black mt-0.5">{user?.name || 'Teacher'}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/teacher/reports')}
              className="text-white/70 text-xs font-bold border border-white/30 rounded-full px-3 py-1.5"
            >
              📊 Report
            </button>
            <button
              onClick={() => { logout(); router.push('/') }}
              className="text-white/50 text-xs font-bold border border-white/20 rounded-full px-3 py-1.5"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Class selector */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              className="flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-black transition-all"
              style={{
                background: selectedClass?.id === cls.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                color: selectedClass?.id === cls.id ? '#5E5CE6' : 'white',
              }}
            >
              {cls.name}
            </button>
          ))}
          <button
            onClick={() => setTab('home')}
            className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-black"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
          >
            + New
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/10 bg-black/20">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-black transition-colors flex flex-col items-center gap-0.5 ${tab === t.id ? 'text-white border-t-2 border-indigo-400' : 'text-white/40'}`}
          >
            <span>{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-10">

        {/* ── HOME TAB ─────────────────────────────────────────────────────── */}
        {tab === 'home' && (
          <div className="space-y-4">
            {selectedClass ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Students', value: students.length, emoji: '👥', color: '#5E5CE6' },
                    { label: 'Homework', value: homework.length, emoji: '📚', color: '#FF9F0A' },
                    { label: 'Messages', value: messages.length, emoji: '💬', color: '#30D158' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: s.color + '22', border: `1px solid ${s.color}44` }}>
                      <div className="text-2xl">{s.emoji}</div>
                      <div className="text-white font-black text-xl">{s.value}</div>
                      <div className="text-white/50 text-xs font-bold">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Quick actions */}
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="text-white font-black mb-3">Quick Actions</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setTab('students')} className="rounded-xl p-3 text-left" style={{ background: '#5E5CE622' }}>
                      <div className="text-xl mb-1">👥</div>
                      <div className="text-white text-xs font-black">Manage Students</div>
                    </button>
                    <button onClick={() => setTab('homework')} className="rounded-xl p-3 text-left" style={{ background: '#FF9F0A22' }}>
                      <div className="text-xl mb-1">📚</div>
                      <div className="text-white text-xs font-black">Assign Homework</div>
                    </button>
                    <button onClick={() => router.push('/teacher/syllabus/builder')} className="rounded-xl p-3 text-left" style={{ background: '#30D15822' }}>
                      <div className="text-xl mb-1">📖</div>
                      <div className="text-white text-xs font-black">Build Syllabus</div>
                    </button>
                    <button
                      onClick={() => router.push(`/teacher/reports?classId=${selectedClass.id}`)}
                      className="rounded-xl p-3 text-left" style={{ background: '#BF5AF222' }}
                    >
                      <div className="text-xl mb-1">📊</div>
                      <div className="text-white text-xs font-black">AI Report</div>
                    </button>
                  </div>
                </div>

                {/* Top students */}
                {students.length > 0 && (
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="text-white font-black mb-3">⭐ Leaderboard</div>
                    <div className="space-y-2">
                      {[...students].sort((a, b) => b.stars - a.stars).slice(0, 5).map((s, i) => (
                        <div key={s.id} className="flex items-center gap-3">
                          <div className="text-white/40 font-black text-sm w-5">{i + 1}</div>
                          <div className="text-xl">{s.avatar || '🧒'}</div>
                          <div className="flex-1 text-white font-bold text-sm">{s.name}</div>
                          <div className="text-yellow-400 font-black text-sm">⭐ {s.stars}</div>
                          {s.streak > 0 && <div className="text-orange-400 font-bold text-xs">🔥{s.streak}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete class */}
                <div className="text-center pt-4">
                  {showDeleteConfirm === selectedClass.id ? (
                    <div className="rounded-2xl p-4" style={{ background: '#FF453A22', border: '1px solid #FF453A44' }}>
                      <div className="text-white font-black mb-2">Delete "{selectedClass.name}"?</div>
                      <div className="text-white/60 text-xs font-bold mb-4">This removes all students and data in this class.</div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 rounded-xl text-white/60 font-bold text-sm" style={{ background: 'rgba(255,255,255,0.1)' }}>Cancel</button>
                        <button onClick={() => handleDeleteClass(selectedClass.id)} disabled={busy} className="flex-1 py-2 rounded-xl text-white font-black text-sm" style={{ background: '#FF453A' }}>Delete</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowDeleteConfirm(selectedClass.id)} className="text-red-400/60 text-xs font-bold">🗑️ Delete Class</button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-10">
                <div className="text-5xl mb-4">🏫</div>
                <div className="text-white font-black text-lg mb-2">No classes yet</div>
                <div className="text-white/50 text-sm font-bold mb-6">Create your first class to get started</div>
              </div>
            )}

            {/* Create class form */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-white font-black mb-3">+ New Class</div>
              <div className="flex gap-2">
                <input
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
                  placeholder="Class name (e.g. Sunflowers)"
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none placeholder:text-white/30"
                />
                <button
                  onClick={handleCreateClass}
                  disabled={busy || !newClassName.trim()}
                  className="px-4 py-2 rounded-xl text-white font-black text-sm"
                  style={{ background: '#5E5CE6' }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STUDENTS TAB ─────────────────────────────────────────────────── */}
        {tab === 'students' && (
          <div className="space-y-4">
            {/* Add student form */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-white font-black mb-3">➕ Add Student</div>
              <div className="space-y-2">
                <input
                  value={newStudent.name}
                  onChange={e => setNewStudent(p => ({ ...p, name: e.target.value }))}
                  placeholder="Student name"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none placeholder:text-white/30"
                />
                <input
                  value={newStudent.pin}
                  onChange={e => setNewStudent(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="4-digit PIN"
                  maxLength={4}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none placeholder:text-white/30"
                />
                <div>
                  <div className="text-white/50 text-xs font-bold mb-1">Avatar</div>
                  <div className="flex gap-2 flex-wrap">
                    {AVATARS.map(av => (
                      <button
                        key={av}
                        onClick={() => setNewStudent(p => ({ ...p, avatar: av }))}
                        className="text-2xl rounded-lg p-1 transition-all"
                        style={{ background: newStudent.avatar === av ? 'rgba(94,92,230,0.4)' : 'rgba(255,255,255,0.05)', outline: newStudent.avatar === av ? '2px solid #5E5CE6' : 'none' }}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleAddStudent}
                  disabled={busy || !newStudent.name || newStudent.pin.length !== 4 || !selectedClass}
                  className="w-full py-3 rounded-xl text-white font-black text-sm"
                  style={{ background: '#5E5CE6', opacity: (!newStudent.name || newStudent.pin.length !== 4) ? 0.5 : 1 }}
                >
                  Add Student
                </button>
              </div>
            </div>

            {/* Student list */}
            <div className="space-y-2">
              {students.map(s => {
                const hwDone = homework.filter(hw => hw.completions?.some((c: any) => c.studentId === s.id && c.done)).length
                return (
                  <div key={s.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="text-3xl">{s.avatar || '🧒'}</div>
                    <div className="flex-1">
                      <div className="text-white font-black">{s.name}</div>
                      <div className="text-white/40 text-xs font-bold">
                        PIN: {s.pin} · ⭐{s.stars} · 📚{hwDone}/{homework.length} HW
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStudent(s.id)}
                      className="text-red-400/60 text-xs font-bold"
                    >
                      🗑️
                    </button>
                  </div>
                )
              })}
              {students.length === 0 && (
                <div className="text-center text-white/30 font-bold py-8">No students in this class</div>
              )}
            </div>
          </div>
        )}

        {/* ── HOMEWORK TAB ─────────────────────────────────────────────────── */}
        {tab === 'homework' && (
          <div className="space-y-4">
            {/* Create HW form */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-white font-black mb-3">📝 New Assignment</div>
              <div className="space-y-2">
                <input
                  value={hwForm.title}
                  onChange={e => setHwForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Homework title"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none placeholder:text-white/30"
                />
                <input
                  value={hwForm.moduleId}
                  onChange={e => setHwForm(p => ({ ...p, moduleId: e.target.value }))}
                  placeholder="Module ID (e.g. letters, numbers)"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none placeholder:text-white/30"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="text-white/50 text-xs font-bold mb-1">Due Date</div>
                    <input
                      type="date"
                      value={hwForm.dueDate}
                      onChange={e => setHwForm(p => ({ ...p, dueDate: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none"
                    />
                  </div>
                  <div>
                    <div className="text-white/50 text-xs font-bold mb-1">⭐ Stars</div>
                    <input
                      type="number"
                      min={1} max={20}
                      value={hwForm.starsReward}
                      onChange={e => setHwForm(p => ({ ...p, starsReward: Number(e.target.value) }))}
                      className="w-20 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none text-center"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateHomework}
                  disabled={busy || !hwForm.title || !hwForm.dueDate}
                  className="w-full py-3 rounded-xl text-white font-black text-sm"
                  style={{ background: '#FF9F0A', opacity: (!hwForm.title || !hwForm.dueDate) ? 0.5 : 1 }}
                >
                  Assign Homework
                </button>
              </div>
            </div>

            {/* HW list */}
            <div className="space-y-2">
              {homework.map(hw => {
                const { total, done } = pendingHW(hw)
                const pct = total ? Math.round((done / total) * 100) : 0
                return (
                  <div key={hw.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-white font-black">{hw.title}</div>
                        <div className="text-white/40 text-xs font-bold">Due: {fmt(hw.dueDate)} · ⭐{hw.starsReward}</div>
                      </div>
                      <button onClick={() => handleDeleteHomework(hw.id)} className="text-red-400/60 text-xs font-bold">🗑️</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/10 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: '#30D158' }} />
                      </div>
                      <div className="text-white/40 text-xs font-bold">{done}/{total}</div>
                    </div>
                  </div>
                )
              })}
              {homework.length === 0 && (
                <div className="text-center text-white/30 font-bold py-8">No homework assigned</div>
              )}
            </div>
          </div>
        )}

        {/* ── SYLLABUS TAB ─────────────────────────────────────────────────── */}
        {tab === 'syllabus' && (
          <div className="space-y-4">
            <button
              onClick={() => router.push('/teacher/syllabus/builder')}
              className="w-full rounded-2xl p-5 flex items-center gap-4 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#30D158,#43C6AC)' }}
            >
              <div className="text-4xl">✏️</div>
              <div>
                <div className="text-white font-black text-lg">Build New Syllabus</div>
                <div className="text-white/70 text-sm font-bold">Create custom lesson content</div>
              </div>
            </button>

            <div className="space-y-2">
              {syllabuses.map(syl => (
                <div key={syl.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="text-3xl">{syl.icon || '📖'}</div>
                  <div className="flex-1">
                    <div className="text-white font-black text-sm">{syl.title}</div>
                    <div className="text-white/40 text-xs font-bold">{syl.items?.length || 0} cards · {syl.published ? '✅ Published' : '📝 Draft'}</div>
                  </div>
                  {!syl.published && (
                    <button
                      onClick={async () => {
                        try {
                          await assignSyllabus(syl.id, 'class', selectedClass?.id)
                          await loadClassData(selectedClass?.id)
                          showToast('Syllabus published!')
                        } catch (e: any) { showToast(e.message) }
                      }}
                      className="text-xs font-black px-3 py-1 rounded-full"
                      style={{ background: '#30D15830', color: '#30D158' }}
                    >
                      Publish
                    </button>
                  )}
                </div>
              ))}
              {syllabuses.length === 0 && (
                <div className="text-center text-white/30 font-bold py-8">No syllabuses yet</div>
              )}
            </div>
          </div>
        )}

        {/* ── MESSAGES TAB ─────────────────────────────────────────────────── */}
        {tab === 'messages' && (
          <div className="space-y-4">
            {/* Send message form */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-white font-black mb-3">📨 Send to Class</div>
              <div className="space-y-2">
                <input
                  value={msgForm.subject}
                  onChange={e => setMsgForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Subject"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none placeholder:text-white/30"
                />
                <textarea
                  value={msgForm.body}
                  onChange={e => setMsgForm(p => ({ ...p, body: e.target.value }))}
                  placeholder="Your message..."
                  rows={4}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none resize-none placeholder:text-white/30"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={busy || !msgForm.subject || !msgForm.body}
                  className="w-full py-3 rounded-xl text-white font-black text-sm"
                  style={{ background: '#30D158', opacity: (!msgForm.subject || !msgForm.body) ? 0.5 : 1 }}
                >
                  Send Message
                </button>
              </div>
            </div>

            {/* Message list */}
            <div className="space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-white font-black text-sm">{msg.subject}</div>
                    <div className="text-white/30 text-xs font-bold">{fmt(msg.createdAt)}</div>
                  </div>
                  <div className="text-white/50 text-xs font-bold mb-1">From: {msg.from}</div>
                  <div className="text-white/60 text-xs leading-relaxed">{msg.body}</div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-white/30 font-bold py-8">No messages yet</div>
              )}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE TAB ─────────────────────────────────────── */}
        {tab === 'attendance' && (
          <div className="p-4 space-y-4">
            {!selectedClass ? (
              <div className="text-center text-white/30 font-bold py-10">Select a class first</div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none"
                  />
                  <button onClick={saveAttendanceHandler} disabled={busy}
                    className="px-4 py-2.5 rounded-xl text-white font-black text-sm"
                    style={{ background: '#30D158', opacity: busy ? 0.6 : 1 }}>
                    Save
                  </button>
                </div>

                {attendanceLoading ? (
                  <div className="text-center text-white/40 font-bold py-8">Loading...</div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-white/60 text-xs font-bold">
                        {students.filter(s => attendanceRecords[s.id] !== false).length}/{students.length} Present
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          const all: Record<string, boolean> = {}
                          students.forEach(s => { all[s.id] = true })
                          setAttendanceRecords(all)
                        }} className="text-green-400 text-xs font-bold bg-green-400/10 rounded-full px-3 py-1">All Present</button>
                        <button onClick={() => {
                          const all: Record<string, boolean> = {}
                          students.forEach(s => { all[s.id] = false })
                          setAttendanceRecords(all)
                        }} className="text-red-400 text-xs font-bold bg-red-400/10 rounded-full px-3 py-1">All Absent</button>
                      </div>
                    </div>
                    {students.map(s => {
                      const present = attendanceRecords[s.id] !== false
                      return (
                        <button key={s.id}
                          onClick={() => setAttendanceRecords(prev => ({ ...prev, [s.id]: !present }))}
                          className="w-full flex items-center gap-3 rounded-2xl p-3 transition-all active:scale-95"
                          style={{ background: present ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)', border: `1.5px solid ${present ? '#30D15840' : '#FF453A40'}` }}>
                          <div className="text-2xl">{s.avatar}</div>
                          <div className="flex-1 text-left">
                            <div className="text-white font-black text-sm">{s.name}</div>
                          </div>
                          <div className={`font-black text-sm ${present ? 'text-green-400' : 'text-red-400'}`}>
                            {present ? '✓ Present' : '✗ Absent'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* AI Weekly Report */}
                <div className="rounded-2xl p-4 mt-4" style={{ background: 'rgba(94,92,230,0.1)', border: '1px solid #5E5CE630' }}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-white font-black text-sm">🤖 AI Weekly Report</div>
                    <button onClick={generateReportHandler} disabled={reportLoading}
                      className="px-3 py-1.5 rounded-xl text-white font-black text-xs"
                      style={{ background: '#5E5CE6', opacity: reportLoading ? 0.6 : 1 }}>
                      {reportLoading ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                  {reportText ? (
                    <div className="text-white/70 text-sm leading-relaxed">{reportText}</div>
                  ) : (
                    <div className="text-white/30 text-xs font-bold">Generate an AI summary of this class's weekly progress.</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
