'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { Loading, InlineEmpty } from '@/components/UIStates'
import DashboardSidebar from '@/components/DashboardSidebar'
import TopBarActions from '@/components/TopBarActions'
import WeatherChip from '@/components/WeatherChip'
import { BarChart3, Bell, Bot, BookOpen, Users, Home, MessageSquare, ClipboardList, CheckSquare, Camera } from 'lucide-react'
import PhotoCapture from '@/components/PhotoCapture'
import { useToast } from '@/components/Toast'
import PageTransition from '@/components/PageTransition'
import {
  getClasses, getStudents, getHomework, getSyllabuses, getMessages,
  createClass, createStudent, deleteStudent, createHomework, deleteHomework,
  completeHomework, sendMessage, deleteClass, assignSyllabus,
  getAttendance, saveAttendance, generateReport, getClassStats,
  getUnreadCount, markAllMessagesRead, getFeedback, saveFeedback,
  generateHomeworkAI, sendParentReports,
  getClassActivity, sendHomeworkReminders, autoSyllabus, getTeacherInterventions,
  createMessageStream, getMyProfile,
  getMessageThreads, getThreadMessages, createMessageThread, sendThreadMessage,
} from '@/lib/api'

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const AVATARS = ['🦁', '🐼', '🐨', '🦊', '🐸', '🦋', '🐙', '🦄', '🐳', '🦉']

type Tab = 'home' | 'students' | 'homework' | 'syllabus' | 'messages' | 'attendance'

function mapThreadMessageToLegacy(msg: any) {
  const raw = String(msg?.body || '')
  const lines = raw.split('\n')
  const subjectLine = lines[0]?.startsWith('Subject: ') ? lines[0].replace('Subject: ', '').trim() : ''
  const cleanBody = subjectLine ? lines.slice(2).join('\n').trim() : raw
  return {
    id: msg.id,
    from: msg.senderUser?.displayName || 'Teacher',
    fromId: msg.senderUserId,
    to: 'class',
    subject: subjectLine || (msg.kind === 'class_update' ? 'Class Update' : 'Message'),
    body: cleanBody,
    createdAt: msg.sentAt,
    read: !!msg.receipts?.[0]?.seenAt,
  }
}

export default function TeacherDashboard() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)
  const trackKpiEvent = useAppStore((s) => s.trackKpiEvent)
  const kpiEvents = useAppStore((s) => s.kpiEvents)
  const toastNotify = useToast()

  const [tab, setTab] = useState<Tab>('home')

  // Data
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [homework, setHomework] = useState<any[]>([])
  const [syllabuses, setSyllabuses] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [threadMode, setThreadMode] = useState<{ enabled: boolean; threadId?: string }>({ enabled: false })
  const [classGroupByLegacyId, setClassGroupByLegacyId] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [classStats, setClassStats] = useState<any>(null)
  const [unreadCount, setUnreadCount] = useState(0)

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

  // Photo capture state
  const [showPhotoCapture, setShowPhotoCapture] = useState(false)

  // AI Homework Wizard state
  const [showWizard, setShowWizard] = useState(false)
  const [wizardTopic, setWizardTopic] = useState('')
  const [wizardLoading, setWizardLoading] = useState(false)
  const [wizardResult, setWizardResult] = useState<any>(null)
  const [wizardDueDate, setWizardDueDate] = useState('')
  const [wizardStars, setWizardStars] = useState(10)
  const [wizardTitle, setWizardTitle] = useState('')

  // Activity feed
  const [activityFeed, setActivityFeed] = useState<any[]>([])
  const [interventions, setInterventions] = useState<any[]>([])
  // Student deep-dive modal
  const [deepDiveStudent, setDeepDiveStudent] = useState<any>(null)
  // AI Syllabus builder
  const [showAISyl, setShowAISyl] = useState(false)
  const [aiSylTopic, setAiSylTopic] = useState('')
  const [aiSylLoading, setAiSylLoading] = useState(false)

  // Grading state
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null)
  const [feedbacks, setFeedbacks] = useState<Record<string, { grade: string; note: string }>>({})
  const [gradeForm, setGradeForm] = useState({ grade: '', note: '' })
  const [gradeBusy, setGradeBusy] = useState(false)
  const [smartIdeaApplied, setSmartIdeaApplied] = useState<string | null>(null)

  // SSE / fallback polling ref
  const sseRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    load()
  }, [user, router])

  useEffect(() => {
    if (selectedClass) loadClassData(selectedClass.id)
  }, [selectedClass])

  useEffect(() => {
    if (selectedClass && classGroupByLegacyId[selectedClass.id] && !threadMode.enabled) {
      loadClassData(selectedClass.id)
    }
  }, [classGroupByLegacyId, selectedClass])

  useEffect(() => {
    if (tab === 'attendance' && selectedClass) loadAttendance()
    if (tab === 'messages' && selectedClass && unreadCount > 0) {
      markAllMessagesRead(selectedClass.id).then(() => setUnreadCount(0)).catch(() => {})
    }
  }, [tab, attendanceDate, selectedClass])

  // Real-time messages via SSE (falls back to 10s polling if not supported)
  useEffect(() => {
    if (!selectedClass) return

    // Close any existing SSE / poll
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }

    const classId: string = selectedClass.id
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const es = createMessageStream(classId)

    if (es) {
      // SSE is supported — wire up handlers
      sseRef.current = es

      es.onmessage = (event: MessageEvent) => {
        try {
          const data: Record<string, unknown> = JSON.parse(event.data as string)
          if (data.type === 'heartbeat') return
          // Upsert message into local state (handles both initial batch and new arrivals)
          setMessages(prev => {
            const exists = prev.some(m => m.id === data.id)
            const updated = exists
              ? prev.map(m => (m.id === data.id ? data : m))
              : [data, ...prev]
            // Keep sorted newest-first
            return updated.sort(
              (a, b) =>
                new Date(b.createdAt as string).getTime() -
                new Date(a.createdAt as string).getTime()
            )
          })
          // Update unread badge when not on the messages tab
          if (tab !== 'messages') {
            setUnreadCount(prev => prev + 1)
          }
        } catch {
          // ignore malformed frames
        }
      }

      es.onerror = () => {
        // On error, close and reload messages after 5s
        es.close()
        sseRef.current = null
        reconnectTimer = setTimeout(() => {
          getMessages({ classId })
            .then(setMessages)
            .catch(() => {})
          getUnreadCount({ classId })
            .then(res => setUnreadCount(res?.count || 0))
            .catch(() => {})
        }, 5_000)
      }
    } else {
      // SSE not supported — fall back to 10s polling
      pollRef.current = setInterval(() => {
        if (tab === 'messages') {
          getMessages({ classId })
            .then(setMessages)
            .catch(() => {})
        } else {
          getUnreadCount({ classId })
            .then(res => setUnreadCount(res?.count || 0))
            .catch(() => {})
        }
      }, 10_000)
    }

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [selectedClass])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = async () => {
    try {
      const [cls, profile] = await Promise.all([
        getClasses(),
        getMyProfile().catch(() => null),
      ])
      const assignedIds = (profile?.teacherProfile?.assignments || [])
        .map((a: any) => a.classGroup?.legacyClassId)
        .filter(Boolean)
      const classGroupMap: Record<string, string> = {}
      ;(profile?.teacherProfile?.assignments || []).forEach((a: any) => {
        const legacyId = a?.classGroup?.legacyClassId
        const classGroupId = a?.classGroup?.id
        if (legacyId && classGroupId) classGroupMap[String(legacyId)] = String(classGroupId)
      })
      setClassGroupByLegacyId(classGroupMap)
      const filtered = assignedIds.length > 0
        ? cls.filter((c: any) => assignedIds.includes(c.id))
        : cls
      setClasses(filtered)
      if (filtered.length > 0) setSelectedClass(filtered[0])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadMessagesWithFallback = async (classId: string) => {
    const classGroupId = classGroupByLegacyId[classId]
    if (classGroupId) {
      try {
        const threads = await getMessageThreads({ scopeType: 'classGroup', classGroupId })
        const thread = Array.isArray(threads) ? threads[0] : null
        if (thread?.id) {
          const rows = await getThreadMessages(thread.id)
          setThreadMode({ enabled: true, threadId: thread.id })
          setUnreadCount(0)
          return rows.map(mapThreadMessageToLegacy)
        }
      } catch {
        // fallback to legacy route during rollout
      }
    }
    setThreadMode({ enabled: false, threadId: undefined })
    return getMessages({ classId })
  }

  const loadClassData = async (classId: string) => {
    try {
      const [stu, hw, syl, stats, unread] = await Promise.all([
        getStudents(classId),
        getHomework(classId),
        getSyllabuses(classId),
        getClassStats(classId).catch(() => null),
        getUnreadCount({ classId }).catch(() => ({ count: 0 })),
      ])
      const msg = await loadMessagesWithFallback(classId)
      setStudents(stu)
      setHomework(hw)
      setSyllabuses(syl)
      setMessages(msg)
      setClassStats(stats)
      setUnreadCount(unread?.count || 0)
      getClassActivity(classId).then(setActivityFeed).catch(() => {})
      getTeacherInterventions(classId).then((rows: any[]) => setInterventions(rows)).catch(() => {})
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
    toastNotify.confirm('Remove this student from the class? Their progress data will be lost.', async () => {
      setBusy(true)
      try {
        await deleteStudent(id)
        setStudents(prev => prev.filter(s => s.id !== id))
        showToast('Student removed')
      } catch (e: any) { showToast(e.message) }
      finally { setBusy(false) }
    })
  }

  const handleCreateHomework = async () => {
    if (!hwForm.title || !hwForm.dueDate || !selectedClass) return
    setBusy(true)
    try {
      const hw = await createHomework({ ...hwForm, classId: selectedClass.id })
      setHomework(prev => [...prev, hw])
      if (smartIdeaApplied) {
        trackKpiEvent({ category: 'learning', name: 'teacher_homework_assigned_from_recommendation' })
      }
      setSmartIdeaApplied(null)
      setHwForm({ title: '', moduleId: '', dueDate: '', starsReward: 5 })
      showToast('Homework assigned!')
    } catch (e: any) { showToast(e.message) }
    finally { setBusy(false) }
  }

  const handleDeleteHomework = async (id: string) => {
    toastNotify.confirm('Remove this homework? Students will no longer see it.', async () => {
      setBusy(true)
      try {
        await deleteHomework(id)
        setHomework(prev => prev.filter(h => h.id !== id))
        showToast('Homework removed')
      } catch (e: any) { showToast(e.message) }
      finally { setBusy(false) }
    })
  }

  const handleWizardGenerate = async () => {
    if (!wizardTopic.trim() || !selectedClass) return
    setWizardLoading(true)
    setWizardResult(null)
    try {
      const idea = await generateHomeworkAI({
        topic: wizardTopic.trim(),
        grade: selectedClass.grade || 'KG 1',
        classId: selectedClass.id,
      })
      setWizardResult(idea)
      setWizardTitle(idea.title)
      setWizardStars(idea.starsReward || 10)
      // Default due date: 3 days from now
      const d = new Date()
      d.setDate(d.getDate() + 3)
      setWizardDueDate(d.toISOString().slice(0, 10))
    } catch (e: any) { showToast('AI generation failed. Try again.') }
    setWizardLoading(false)
  }

  const handleWizardAssign = async () => {
    if (!wizardResult || !selectedClass || !wizardDueDate) return
    setBusy(true)
    try {
      const hw = await createHomework({
        title: wizardTitle,
        description: wizardResult.description,
        moduleId: wizardResult.moduleId,
        dueDate: wizardDueDate,
        starsReward: wizardStars,
        assignedTo: 'all',
        classId: selectedClass.id,
        aiGenerated: true,
      })
      setHomework(prev => [hw, ...prev])
      setShowWizard(false)
      setWizardResult(null)
      setWizardTopic('')
      showToast('✨ AI Homework pushed to all kids!')
    } catch (e: any) { showToast(e.message) }
    setBusy(false)
  }

  const handleSendMessage = async () => {
    if (!msgForm.subject || !msgForm.body || !selectedClass) return
    setBusy(true)
    try {
      const payloadBody = `Subject: ${msgForm.subject}\n\n${msgForm.body}`
      if (threadMode.enabled && threadMode.threadId) {
        await sendThreadMessage(threadMode.threadId, {
          body: payloadBody,
          kind: 'class_update',
          priority: 'normal',
        })
      } else {
        const classGroupId = classGroupByLegacyId[selectedClass.id]
        if (classGroupId) {
          try {
            const existing = await getMessageThreads({ scopeType: 'classGroup', classGroupId })
            let thread = Array.isArray(existing) ? existing[0] : null
            if (!thread) thread = await createMessageThread({ scopeType: 'classGroup', classGroupId })
            if (!thread?.id) throw new Error('Thread create failed')
            await sendThreadMessage(thread.id, {
              body: payloadBody,
              kind: 'class_update',
              priority: 'normal',
            })
            setThreadMode({ enabled: true, threadId: thread.id })
          } catch {
            await sendMessage({
              from: user?.name || 'Teacher',
              fromId: user?.id,
              to: 'class',
              subject: msgForm.subject,
              body: msgForm.body,
              classId: selectedClass.id,
            })
          }
        } else {
          await sendMessage({
            from: user?.name || 'Teacher',
            fromId: user?.id,
            to: 'class',
            subject: msgForm.subject,
            body: msgForm.body,
            classId: selectedClass.id,
          })
        }
      }
      await loadClassData(selectedClass.id)
      setMsgForm({ subject: '', body: '' })
      showToast('Message sent!')
    } catch (e: any) { showToast(e.message) }
    finally { setBusy(false) }
  }

  // Imported "intervention quick-actions" pattern from classroom ops tools:
  // one-tap encouragement + parent nudge directly from at-risk list.
  const sendInterventionNudge = async (student: any, mode: 'encourage' | 'parent') => {
    if (!selectedClass || !user) return
    const payload = mode === 'encourage'
      ? {
          subject: `You can do this, ${student.name}!`,
          body: `Hi ${student.name}, your teacher believes in you. Try a short 5-minute mission today and earn stars.`,
        }
      : {
          subject: `Home support request for ${student.name}`,
          body: `Hi Parent/Guardian, ${student.name} has been less active recently. Please help with one short learning activity tonight.`,
        }
    try {
      await sendMessage({
        from: user.name || 'Teacher',
        fromId: user.id,
        to: student.id,
        subject: payload.subject,
        body: payload.body,
        classId: selectedClass.id,
      })
      showToast(mode === 'encourage' ? `Encouragement sent to ${student.name}` : `Parent nudge sent for ${student.name}`)
    } catch {
      showToast('Failed to send nudge')
    }
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  const pendingHW = (hw: any) => {
    const completedCount = hw.completions?.filter((c: any) => c.done).length || 0
    return { total: students.length, done: completedCount }
  }

  const weakModule = (() => {
    const byModule: Record<string, { sum: number; n: number }> = {}
    students.forEach((s: any) => {
      ;(s.progress || []).forEach((p: any) => {
        if (!byModule[p.moduleId]) byModule[p.moduleId] = { sum: 0, n: 0 }
        byModule[p.moduleId].sum += Number(p.cards || 0)
        byModule[p.moduleId].n += 1
      })
    })
    const rows = Object.entries(byModule).map(([moduleId, v]) => ({
      moduleId,
      avgCards: v.n ? v.sum / v.n : 0,
    }))
    rows.sort((a, b) => a.avgCards - b.avgCards)
    return rows[0]?.moduleId || 'letters'
  })()

  const nextDate = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }

  const smartHomeworkIdeas = (() => {
    const lowEngagementCount = interventions.filter((i: any) => i.priority === 'high').length
    const avgCompletion = classStats?.avgHwCompletion ?? 0
    const ideas = [
      {
        id: 'confidence',
        title: 'Confidence Booster (5 mins)',
        moduleId: weakModule,
        starsReward: 6,
        dueDate: nextDate(1),
        reason: lowEngagementCount > 0
          ? `${lowEngagementCount} students are high-priority; assign quick-win practice.`
          : 'Short win to keep momentum across the class.',
      },
      {
        id: 'core-skill',
        title: `Core Skill Sprint: ${weakModule}`,
        moduleId: weakModule,
        starsReward: 8,
        dueDate: nextDate(2),
        reason: `Class has lowest progress in "${weakModule}".`,
      },
      {
        id: 'catch-up',
        title: 'Catch-up Homework Pack',
        moduleId: weakModule,
        starsReward: 10,
        dueDate: nextDate(3),
        reason: avgCompletion < 70
          ? `Homework completion is ${avgCompletion}% — this targets completion lift.`
          : 'Balanced practice pack for consistency.',
      },
    ]
    return ideas
  })()

  const applySmartIdea = (idea: any) => {
    trackKpiEvent({ category: 'learning', name: 'teacher_smart_recommendation_used' })
    setHwForm({
      title: idea.title,
      moduleId: idea.moduleId,
      dueDate: idea.dueDate,
      starsReward: idea.starsReward,
    })
    setSmartIdeaApplied(idea.id)
    setWizardTopic(idea.moduleId)
    showToast(`Loaded "${idea.title}" into assignment form`)
  }

  useEffect(() => {
    if (!selectedClass || tab !== 'homework') return
    const key = `ks_teacher_reco_seen_${selectedClass.id}_${new Date().toISOString().slice(0, 10)}`
    if (typeof window !== 'undefined' && localStorage.getItem(key)) return
    trackKpiEvent({ category: 'operational', name: 'teacher_smart_recommendations_shown' })
    if (typeof window !== 'undefined') localStorage.setItem(key, '1')
  }, [tab, selectedClass, trackKpiEvent])

  if (loading) return <Loading emoji="👩‍🏫" text="Loading your classes…" />

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'home',       icon: <Home size={14} />,          label: 'Home' },
    { id: 'students',   icon: <Users size={14} />,         label: 'Students' },
    { id: 'homework',   icon: <BookOpen size={14} />,      label: 'Homework' },
    { id: 'attendance', icon: <CheckSquare size={14} />,   label: 'Attend' },
    { id: 'syllabus',   icon: <ClipboardList size={14} />, label: 'Syllabus' },
    { id: 'messages',   icon: <MessageSquare size={14} />, label: 'Messages' },
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

  const openGrading = async (studentId: string) => {
    setGradingStudentId(studentId)
    if (!feedbacks[studentId]) {
      try {
        const fb = await getFeedback(studentId)
        const data = { grade: fb?.grade || '', note: fb?.note || '' }
        setFeedbacks(prev => ({ ...prev, [studentId]: data }))
        setGradeForm(data)
      } catch {
        setGradeForm({ grade: '', note: '' })
      }
    } else {
      setGradeForm(feedbacks[studentId])
    }
  }

  const handleSaveGrade = async (studentId: string) => {
    setGradeBusy(true)
    try {
      await saveFeedback({ studentId, grade: gradeForm.grade, note: gradeForm.note })
      setFeedbacks(prev => ({ ...prev, [studentId]: { ...gradeForm } }))
      setGradingStudentId(null)
      showToast('Grade saved!')
      // refresh student list to reflect updated grade field
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, grade: gradeForm.grade } : s))
    } catch (e: any) { showToast('Error: ' + e.message) }
    setGradeBusy(false)
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

  const TAB_ORDER: Tab[] = ['home', 'students', 'homework', 'attendance', 'syllabus', 'messages']
  const SIDEBAR_ITEMS = [
    { icon: '🏠', label: 'Dashboard', href: '/teacher' },
    { icon: '👥', label: 'Students', href: '/teacher/students' },
    { icon: '📚', label: 'Homework', href: '/teacher/homework' },
    { icon: '📋', label: 'Attendance', href: '/teacher/attendance' },
    { icon: '📖', label: 'Syllabus', href: '/teacher/syllabus' },
    { icon: '💬', label: 'Messages', href: '/teacher/messages', badge: unreadCount },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--app-bg)' }}>
      <DashboardSidebar role="teacher" items={SIDEBAR_ITEMS} userName={user?.name} onItemClick={(idx) => setTab(TAB_ORDER[idx])} activeIndex={TAB_ORDER.indexOf(tab)} />
      <div className="flex-1 min-h-screen flex flex-col app-container">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white text-black font-black text-sm px-5 py-3 rounded-full shadow-xl">
          {toast}
      </div>
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,var(--app-accent),#4A6ED0)' }} className="p-5 pt-10">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs app-muted font-bold uppercase tracking-wider">Teacher Portal</div>
            <div className="text-white text-xl font-black mt-0.5">{user?.name || 'Teacher'}</div>
    </div>
          <div className="flex flex-col items-end gap-2">
            <WeatherChip variant="light" />
            <TopBarActions
              variant="light"
              extra={
                <button
                  onClick={() => router.push('/teacher/reports')}
                  className="flex items-center justify-center rounded-xl h-10 px-3 gap-1.5 text-sm font-bold active:scale-95 transition-all app-pressable app-btn-glass"
                >
                  <BarChart3 size={15} /> <span className="hidden sm:inline text-xs">Report</span>
                </button>
              }
            />
          </div>
        </div>

        {/* Class selector */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
          {classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              className="flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-black transition-all app-pressable"
              style={{
                background: selectedClass?.id === cls.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                color: selectedClass?.id === cls.id ? '#5B7FE8' : 'white',
              }}
            >
              {cls.name}
            </button>
          ))}
          <button
            onClick={() => setTab('home')}
            className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-black app-pressable"
            style={{ background: 'rgba(120,120,140,0.06)', color: 'var(--app-text-muted)' }}
          >
            + New
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b backdrop-blur sticky top-0 z-30" style={{ borderColor: 'var(--app-border)', background: 'rgba(255,255,255,0.92)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-xs font-black transition-colors flex items-center justify-center gap-1.5 relative app-pressable ${tab === t.id ? 'border-b-2' : ''}`}
            style={{ color: tab === t.id ? 'var(--app-accent)' : 'rgba(70, 75, 96, 0.6)', borderColor: tab === t.id ? 'var(--app-accent)' : 'transparent' }}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            {t.id === 'messages' && unreadCount > 0 && (
              <span className="absolute top-1.5 right-1/4 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center app-pressable">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto app-content pb-10">

        {/* ── HOME TAB ─────────────────────────────────────────────────────── */}
        {tab === 'home' && (
          <div className="space-y-5">
            {selectedClass ? (
              <>
                {/* Priority actions (top workflow shortcuts) */}
                <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid var(--app-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-black text-sm">Priority Actions</div>
                    <div className="text-[11px] font-bold app-muted">Daily workflow</div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => setTab('attendance')}
                      className="rounded-xl px-3 py-3 text-left app-pressable"
                      style={{ background: 'rgba(48,209,88,0.18)', border: '1px solid rgba(48,209,88,0.3)' }}
                    >
                      <div className="text-lg mb-1">✅</div>
                      <div className="text-xs font-black">Take Attendance</div>
                    </button>
                    <button
                      onClick={() => setTab('homework')}
                      className="rounded-xl px-3 py-3 text-left app-pressable"
                      style={{ background: 'rgba(255,159,10,0.18)', border: '1px solid rgba(255,159,10,0.3)' }}
                    >
                      <div className="text-lg mb-1">📚</div>
                      <div className="text-xs font-black">Assign Homework</div>
                    </button>
                    <button
                      onClick={() => setTab('messages')}
                      className="rounded-xl px-3 py-3 text-left app-pressable"
                      style={{ background: 'rgba(94,92,230,0.2)', border: '1px solid rgba(94,92,230,0.3)' }}
                    >
                      <div className="text-lg mb-1">📨</div>
                      <div className="text-xs font-black">Send Parent Update</div>
                    </button>
                    <button
                      onClick={() => setShowPhotoCapture(true)}
                      className="rounded-xl px-3 py-3 text-left app-pressable"
                      style={{ background: 'rgba(255,69,58,0.15)', border: '1px solid rgba(255,69,58,0.3)' }}
                    >
                      <div className="text-lg mb-1"><Camera size={18} /></div>
                      <div className="text-xs font-black">Share Activity 📸</div>
                    </button>
                  </div>
                </div>

                {/* Rich Stats Row */}
                <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
                  {[
                    { label: 'Students', value: classStats?.totalStudents ?? students.length, icon: <Users size={14} />, color: '#5B7FE8' },
                    { label: 'HW Done', value: `${classStats?.avgHwCompletion ?? 0}%`, icon: <BookOpen size={14} />, color: '#F5A623' },
                    { label: 'Total Stars', value: classStats?.totalStars ?? students.reduce((a: number, s: any) => a + s.stars, 0), icon: <BarChart3 size={14} />, color: '#F5B731' },
                    { label: 'AI Sessions', value: classStats?.totalAISessions ?? 0, icon: <Bot size={14} />, color: '#8B6CC1' },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-4" style={{ background: s.color + '18', border: `1px solid ${s.color}33` }}>
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="font-black text-2xl">{s.value}</div>
                      <div className="text-xs font-bold app-muted">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* HW Completion bar */}
                {classStats && (
                  <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-black text-sm">📊 Homework Completion</div>
                      <div className="font-black">{classStats.avgHwCompletion}%</div>
                    </div>
                    <div className="rounded-full h-3" style={{ background: 'rgba(120,120,140,0.14)' }}>
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{ width: `${classStats.avgHwCompletion}%`, background: classStats.avgHwCompletion >= 80 ? '#4CAF6A' : classStats.avgHwCompletion >= 50 ? '#F5A623' : '#E05252' }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs font-bold app-muted">
                      <span>Avg streak: 🔥{classStats.avgStreak} days</span>
                      <span>{classStats.totalSyllabuses} syllabuses</span>
                    </div>
                  </div>
                )}

                {/* More tools */}
                <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                  <div className="font-black mb-3">More Tools</div>
                  <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3">
                    <button onClick={() => setTab('students')} className="rounded-xl p-3 text-left app-pressable" style={{ background: '#5B7FE822' }}>
                      <div className="text-xl mb-1">👥</div>
                      <div className="text-xs font-black">Manage Students</div>
                    </button>
                    <button onClick={() => setTab('homework')} className="rounded-xl p-3 text-left app-pressable" style={{ background: '#F5A62322' }}>
                      <div className="text-xl mb-1">📚</div>
                      <div className="text-xs font-black">Assign Homework</div>
                    </button>
                    <button onClick={() => router.push('/teacher/syllabus/builder')} className="rounded-xl p-3 text-left app-pressable" style={{ background: '#4CAF6A22' }}>
                      <div className="text-xl mb-1">📖</div>
                      <div className="text-xs font-black">Build Syllabus</div>
                    </button>
                    <button
                      onClick={() => router.push(`/teacher/reports?classId=${selectedClass.id}`)}
                      className="rounded-xl p-3 text-left app-pressable" style={{ background: '#8B6CC122' }}
                    >
                      <div className="text-xl mb-1">📊</div>
                      <div className="text-xs font-black">AI Report</div>
                    </button>
                    <button
                      onClick={async () => {
                        if (!selectedClass) return
                        setBusy(true)
                        try {
                          const r = await sendParentReports(selectedClass.id)
                          showToast(`📨 Sent ${r.sent}/${r.total} AI reports to parents!`)
                        } catch { showToast('Failed to send reports') }
                        setBusy(false)
                      }}
                      disabled={busy}
                      className="rounded-xl p-3 text-left col-span-2 app-pressable" style={{ background: 'rgba(94,92,230,0.15)', border: '1px solid rgba(94,92,230,0.25)' }}
                    >
                      <div className="text-xl mb-1">📨</div>
                      <div className="text-xs font-black">Send AI Weekly Reports to Parents</div>
                      <div className="text-[10px] app-muted font-bold">AI writes a personal report for each kid</div>
                    </button>
                  </div>
                </div>

                {/* Top students leaderboard */}
                {(classStats?.topStudents || students).length > 0 && (
                  <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                    <div className="font-black mb-3">🏆 Leaderboard</div>
                    <div className="space-y-2">
                      {(classStats?.topStudents || [...students].sort((a: any, b: any) => b.stars - a.stars).slice(0, 5))
                        .map((s: any, i: number) => (
                        <div key={s.id} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                            style={{ background: i === 0 ? '#F5B731' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.1)', color: i < 3 ? '#000' : '#fff' }}>
                            {i + 1}
                          </div>
                          <div className="text-xl">{s.avatar || '🧒'}</div>
                          <div className="flex-1 font-bold text-sm">{s.name}</div>
                          <div className="text-yellow-400 font-black text-sm">⭐ {s.stars}</div>
                          {s.streak > 0 && <div className="text-orange-400 font-bold text-xs">🔥{s.streak}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ⚠️ At Risk Students */}
                {(() => {
                  const atRisk = interventions.length > 0
                    ? interventions
                    : students.filter((s: any) =>
                        !s.lastLoginAt || Date.now() - new Date(s.lastLoginAt).getTime() > 7 * 24 * 60 * 60 * 1000
                      )
                  if (atRisk.length === 0) return null
                  return (
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.25)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-black text-sm">⚠️ At Risk Students</div>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,69,58,0.2)', color: '#E05252' }}>{atRisk.length}</span>
                      </div>
                      <p className="text-xs font-bold app-muted mb-3">No activity in 7+ days</p>
                      <div className="space-y-2">
                        {atRisk.map((s: any) => {
                          const daysAgo = s.lastLoginAt
                            ? Math.floor((Date.now() - new Date(s.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
                            : null
                          return (
                            <div key={s.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--app-surface-soft)' }}>
                              <span className="text-2xl">{s.avatar || '🧒'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-sm m-0 truncate">{s.name}</p>
                                <p className="text-xs font-bold app-muted m-0">
                                  {daysAgo !== null ? `${daysAgo} days inactive` : 'Never logged in'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => sendInterventionNudge(s, 'encourage')}
                                  className="text-[11px] font-black px-2.5 py-1.5 rounded-xl app-pressable"
                                  style={{ background: 'rgba(76,175,106,0.16)', color: '#4CAF6A', border: '1px solid rgba(76,175,106,0.3)' }}
                                >
                                  Encourage
                                </button>
                                <button
                                  onClick={() => sendInterventionNudge(s, 'parent')}
                                  className="text-[11px] font-black px-2.5 py-1.5 rounded-xl app-pressable"
                                  style={{ background: 'rgba(255,159,10,0.15)', color: '#F5A623', border: '1px solid rgba(255,159,10,0.3)' }}
                                >
                                  Parent Nudge
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await sendHomeworkReminders(selectedClass?.id)
                                      showToast('Class reminder sent')
                                    } catch { showToast('Failed to send reminder') }
                                  }}
                                  className="text-[11px] font-black px-2.5 py-1.5 rounded-xl app-pressable"
                                  style={{ background: 'rgba(91,127,232,0.16)', color: '#5B7FE8', border: '1px solid rgba(91,127,232,0.32)' }}
                                >
                                  <span className="inline-flex items-center gap-1"><Bell size={12} /> Remind Class</span>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Live Activity Feed */}
                {activityFeed.length > 0 && (
                  <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                    <div className="font-black mb-3">⚡ Live Activity</div>
                    <div className="space-y-2">
                      {activityFeed.slice(0, 8).map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-lg">{item.studentAvatar || '🧒'}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-xs">{item.studentName} </span>
                            <span className="text-xs app-muted">{item.text}</span>
                          </div>
                          <span className="text-lg shrink-0">{item.emoji}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete class */}
                <div className="text-center pt-4">
                  {showDeleteConfirm === selectedClass.id ? (
                    <div className="rounded-2xl p-4" style={{ background: '#E0525222', border: '1px solid #E0525244' }}>
                      <div className="text-lg mb-1">⚠️</div>
                      <div className="font-black mb-1">Delete "{selectedClass.name}"?</div>
                      <div className="text-xs font-bold app-muted mb-4">This permanently removes all students, homework, and data in this class. This cannot be undone.</div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm app-pressable" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>Cancel</button>
                        <button onClick={() => handleDeleteClass(selectedClass.id)} disabled={busy} className="flex-1 py-2.5 rounded-xl font-black text-sm text-white app-pressable" style={{ background: 'var(--app-danger)' }}>{busy ? 'Deleting…' : '🗑️ Delete Forever'}</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowDeleteConfirm(selectedClass.id)} className="text-red-400/60 text-xs font-bold app-pressable">🗑️ Delete Class</button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-10">
                <div className="text-5xl mb-4">🏫</div>
                <div className="font-black text-lg mb-2">No classes yet</div>
                <div className="text-sm font-bold app-muted mb-6">Create your first class to get started</div>
              </div>
            )}

            {/* Create class form */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
              <div className="font-black mb-3">+ New Class</div>
              <div className="flex gap-2">
                <input
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
                  placeholder="Class name (e.g. Sunflowers)"
                  className="flex-1 app-field text-sm"
                />
                <button
                  onClick={handleCreateClass}
                  disabled={busy || !newClassName.trim()}
                  className="px-4 py-2 rounded-xl font-black text-sm app-pressable"
                  style={{ background: '#5B7FE8' }}
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
            <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
              <div className="font-black mb-3">➕ Add Student</div>
              <div className="space-y-2">
                <input
                  value={newStudent.name}
                  onChange={e => setNewStudent(p => ({ ...p, name: e.target.value }))}
                  placeholder="Student name"
                  className="w-full app-field text-sm"
                />
                <input
                  value={newStudent.pin}
                  onChange={e => setNewStudent(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="4-digit PIN"
                  maxLength={4}
                  className="w-full app-field text-sm"
                />
                <div>
                  <div className="text-xs font-bold app-muted mb-1">Avatar</div>
                  <div className="flex gap-2 flex-wrap">
                    {AVATARS.map(av => (
                      <button
                        key={av}
                        onClick={() => setNewStudent(p => ({ ...p, avatar: av }))}
                        className="text-2xl rounded-lg p-1 transition-all app-pressable"
                        style={{ background: newStudent.avatar === av ? 'rgba(94,92,230,0.4)' : 'rgba(255,255,255,0.05)', outline: newStudent.avatar === av ? '2px solid #5B7FE8' : 'none' }}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleAddStudent}
                  disabled={busy || !newStudent.name || newStudent.pin.length !== 4 || !selectedClass}
                  className="w-full py-3 rounded-xl font-black text-sm app-pressable"
                  style={{ background: '#5B7FE8', opacity: (!newStudent.name || newStudent.pin.length !== 4) ? 0.5 : 1 }}
                >
                  Add Student
                </button>
              </div>
            </div>

            {/* Student list */}
            <div className="space-y-2">
              {students.map(s => {
                const hwDone = homework.filter(hw => hw.completions?.some((c: any) => c.studentId === s.id && c.done)).length
                const fb = feedbacks[s.id]
                const grade = fb?.grade || s.grade || null
                const isGrading = gradingStudentId === s.id
                const GRADE_COLORS: Record<string, string> = { 'A+': '#4CAF6A', A: '#4CAF6A', B: '#F5A623', C: '#D4881A', D: '#E05252' }
                return (
                  <div key={s.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                    <div className="p-4 flex items-center gap-3">
                      <div className="text-3xl">{s.avatar || '🧒'}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <button className="font-black hover:text-purple-300 transition-colors app-pressable" onClick={() => setDeepDiveStudent(s)}>{s.name}</button>
                          {grade && (
                            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: (GRADE_COLORS[grade] || '#5B7FE8') + '30', color: GRADE_COLORS[grade] || '#5B7FE8' }}>
                              {grade}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold app-muted">
                          🔑 PIN set · ⭐{s.stars} · 📚{hwDone}/{homework.length} HW
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => isGrading ? setGradingStudentId(null) : openGrading(s.id)}
                          className="text-xs font-black px-3 py-1.5 rounded-full transition-all app-pressable"
                          style={{ background: isGrading ? '#5B7FE8' : 'rgba(94,92,230,0.2)', color: isGrading ? '#fff' : '#5B7FE8' }}
                        >
                          📝 Grade
                        </button>
                        <button onClick={() => handleDeleteStudent(s.id)} className="text-red-400/60 text-xs font-bold app-pressable">🗑️</button>
                      </div>
                    </div>

                    {/* Inline grading panel */}
                    {isGrading && (
                      <div className="px-4 pb-4 border-t border-gray-200 pt-3" style={{ background: 'rgba(94,92,230,0.05)' }}>
                        <div className="text-xs font-bold app-muted mb-2">Grade for {s.name}</div>
                        <div className="flex gap-2 mb-3">
                          {['A+', 'A', 'B', 'C', 'D'].map(g => (
                            <button
                              key={g}
                              onClick={() => setGradeForm(p => ({ ...p, grade: p.grade === g ? '' : g }))}
                              className="flex-1 py-2 rounded-xl font-black text-sm transition-all app-pressable"
                              style={{
                                background: gradeForm.grade === g ? (GRADE_COLORS[g] + 'cc') : 'rgba(255,255,255,0.08)',
                                color: gradeForm.grade === g ? '#fff' : GRADE_COLORS[g] || '#fff',
                                border: `1.5px solid ${gradeForm.grade === g ? GRADE_COLORS[g] : 'transparent'}`,
                              }}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={gradeForm.note}
                          onChange={e => setGradeForm(p => ({ ...p, note: e.target.value }))}
                          placeholder="Teacher note (optional)..."
                          rows={2}
                          className="w-full app-field text-xs resize-none mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setGradingStudentId(null)}
                            className="flex-1 py-2 rounded-xl font-bold text-xs app-pressable app-muted"
                            style={{ background: 'var(--app-surface-soft)' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveGrade(s.id)}
                            disabled={gradeBusy}
                            className="flex-1 py-2 rounded-xl font-black text-xs app-pressable"
                            style={{ background: '#5B7FE8', opacity: gradeBusy ? 0.6 : 1 }}
                          >
                            {gradeBusy ? 'Saving...' : '✓ Save Grade'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {students.length === 0 && <InlineEmpty emoji="👥" text="No students in this class" />}
            </div>
          </div>
        )}

        {/* ── HOMEWORK TAB ─────────────────────────────────────────────────── */}
        {tab === 'homework' && (
          <div className="space-y-4">
            {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === 'true') && (() => {
              const since = Date.now() - 7 * 24 * 60 * 60 * 1000
              const events = kpiEvents.filter((e: any) => new Date(e.at).getTime() >= since)
              const shown = events.filter((e: any) => e.name === 'teacher_smart_recommendations_shown').length
              const used = events.filter((e: any) => e.name === 'teacher_smart_recommendation_used').length
              const assigned = events.filter((e: any) => e.name === 'teacher_homework_assigned_from_recommendation').length
              const useRate = shown ? Math.round((used / shown) * 100) : 0
              const assignRate = used ? Math.round((assigned / used) * 100) : 0
              return (
                <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-black text-sm">Recommendation Funnel (7d)</div>
                    <span className="text-[10px] font-black app-muted">Local analytics</span>
                  </div>
                  <div className="grid grid-cols-2 tablet:grid-cols-4 gap-2">
                    <div className="rounded-xl p-2.5" style={{ background: 'var(--app-surface-soft)' }}><div className="text-lg font-black">{shown}</div><div className="text-[10px] font-bold app-muted">Shown</div></div>
                    <div className="rounded-xl p-2.5" style={{ background: 'var(--app-surface-soft)' }}><div className="text-lg font-black">{used}</div><div className="text-[10px] font-bold app-muted">Used</div></div>
                    <div className="rounded-xl p-2.5" style={{ background: 'var(--app-surface-soft)' }}><div className="text-lg font-black">{assigned}</div><div className="text-[10px] font-bold app-muted">Assigned</div></div>
                    <div className="rounded-xl p-2.5" style={{ background: 'var(--app-surface-soft)' }}><div className="text-lg font-black">{useRate}% / {assignRate}%</div><div className="text-[10px] font-bold app-muted">Use / Assign</div></div>
                  </div>
                </div>
              )
            })()}

            {/* Smart assignment recommendations */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-black text-sm">Smart Assignment Recommendations</div>
                <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: 'rgba(91,127,232,0.16)', color: '#5B7FE8' }}>Auto</span>
              </div>
              <div className="space-y-2">
                {smartHomeworkIdeas.map((idea) => (
                  <div key={idea.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm truncate">{idea.title}</div>
                      <div className="text-xs font-bold app-muted mt-0.5">{idea.reason}</div>
                      <div className="text-[10px] font-bold app-muted mt-1">Module: {idea.moduleId} · Due: {fmt(idea.dueDate)} · ⭐{idea.starsReward}</div>
                    </div>
                    <button
                      onClick={() => applySmartIdea(idea)}
                      className="text-xs font-black px-3 py-1.5 rounded-xl app-pressable"
                      style={{ background: 'rgba(91,127,232,0.16)', color: '#5B7FE8', border: '1px solid rgba(91,127,232,0.32)' }}
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ✨ AI Homework Wizard banner */}
            <button
              onClick={() => { setShowWizard(v => !v); setWizardResult(null); setWizardTopic('') }}
              className="w-full rounded-2xl p-4 flex items-center gap-4 active:scale-95 transition-all app-pressable"
              style={{ background: 'linear-gradient(135deg, #5B7FE8, #8B6CC1)', boxShadow: '0 8px 24px rgba(94,92,230,0.35)' }}
            >
              <div className="text-4xl">✨</div>
              <div className="flex-1 text-left">
                <div className="font-black text-base">AI Homework Wizard</div>
                <div className="text-xs app-muted font-bold">Describe a topic → AI builds homework → push to all kids</div>
              </div>
              <div className="text-lg app-muted">{showWizard ? '▲' : '▼'}</div>
            </button>

            {/* Wizard panel */}
            {showWizard && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(94,92,230,0.05)', border: '1.5px solid rgba(94,92,230,0.3)' }}>
                <div className="p-4">
                  <div className="text-xs app-muted font-bold mb-3">Quick topic chips</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['Counting 1–10', 'Animal Sounds', 'Colors & Shapes', 'Letters A–E', 'Sight Words', 'Feelings', 'Fruits & Veggies', 'Good Habits'].map(t => (
                      <button
                        key={t}
                        onClick={() => setWizardTopic(t)}
                        className="text-xs font-black px-3 py-1.5 rounded-full transition-all app-pressable"
                        style={{
                          background: wizardTopic === t ? 'rgba(94,92,230,0.6)' : 'var(--app-surface-soft)',
                          color: wizardTopic === t ? '#fff' : 'var(--app-text-muted)',
                          border: `1px solid ${wizardTopic === t ? '#5B7FE8' : 'var(--app-border)'}`,
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={wizardTopic}
                      onChange={e => setWizardTopic(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleWizardGenerate()}
                      placeholder="Or type your own topic..."
                      className="flex-1 app-field text-sm"
                    />
                    <button
                      onClick={handleWizardGenerate}
                      disabled={wizardLoading || !wizardTopic.trim()}
                      className="px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-1.5 app-pressable"
                      style={{ background: '#5B7FE8', opacity: (!wizardTopic.trim() || wizardLoading) ? 0.5 : 1 }}
                    >
                      {wizardLoading ? (
                        <>
                          <span className="animate-spin inline-block">⟳</span>
                          <span className="hidden sm:inline">Thinking…</span>
                        </>
                      ) : '✨ Generate'}
                    </button>
                  </div>

                  {/* AI thinking animation */}
                  {wizardLoading && (
                    <div className="mt-4 rounded-xl p-4 text-center" style={{ background: 'rgba(94,92,230,0.15)' }}>
                      <div className="text-3xl mb-2 animate-pulse">🤖</div>
                      <div className="text-xs font-bold app-muted">Sparkle is crafting the perfect homework…</div>
                    </div>
                  )}

                  {/* Generated preview card */}
                  {wizardResult && !wizardLoading && (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(94,92,230,0.1), rgba(191,90,242,0.06))', border: '1px solid rgba(94,92,230,0.4)' }}>
                        {/* Title row */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="text-4xl">{wizardResult.emoji || '📝'}</div>
                          <div className="flex-1">
                            <input
                              value={wizardTitle}
                              onChange={e => setWizardTitle(e.target.value)}
                              className="w-full bg-transparent font-black text-base outline-none border-b border-gray-200 pb-0.5 mb-1"
                            />
                            <div className="text-xs font-bold app-muted">{wizardResult.description}</div>
                          </div>
                          <span className="text-xs font-black px-2 py-1 rounded-full flex-shrink-0" style={{ background: 'rgba(94,92,230,0.4)', color: '#A78BFA' }}>✨ AI</span>
                        </div>

                        {/* Activities */}
                        <div className="space-y-1.5 mb-3">
                          {wizardResult.activities?.map((act: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-bold app-muted">
                              <span className="text-base">{act.emoji}</span>
                              <span>{act.instruction}</span>
                            </div>
                          ))}
                        </div>

                        {/* Editable meta row */}
                        <div className="flex gap-2 items-end border-t border-gray-200 pt-3">
                          <div className="flex-1">
                            <div className="text-xs font-bold app-muted mb-1">Due Date</div>
                            <input
                              type="date"
                              value={wizardDueDate}
                              onChange={e => setWizardDueDate(e.target.value)}
                              className="w-full app-field text-xs"
                            />
                          </div>
                          <div>
                            <div className="text-xs font-bold app-muted mb-1">⭐ Stars</div>
                            <input
                              type="number"
                              min={1} max={20}
                              value={wizardStars}
                              onChange={e => setWizardStars(Number(e.target.value))}
                              className="w-16 app-field text-xs text-center"
                            />
                          </div>
                          <div className="text-xs font-bold app-muted text-center">
                            <div>⏱️</div>
                            <div>{wizardResult.estimatedMinutes}min</div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setWizardResult(null); setWizardTopic('') }}
                          className="flex-1 py-2.5 rounded-xl font-bold text-xs app-pressable"
                          style={{ background: 'var(--app-surface-soft)', color: 'var(--app-text-muted)' }}
                        >
                          ↩ Start Over
                        </button>
                        <button
                          onClick={handleWizardGenerate}
                          disabled={wizardLoading}
                          className="flex-1 py-2.5 rounded-xl font-bold text-xs app-pressable"
                          style={{ background: 'rgba(94,92,230,0.3)', color: '#A78BFA' }}
                        >
                          🔄 Regenerate
                        </button>
                        <button
                          onClick={handleWizardAssign}
                          disabled={busy || !wizardDueDate}
                          className="flex-1 py-2.5 rounded-xl font-black text-xs app-pressable"
                          style={{ background: 'linear-gradient(135deg, #5B7FE8, #8B6CC1)', opacity: busy ? 0.6 : 1 }}
                        >
                          🚀 Push to All
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual Create HW form */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
              <div className="font-black mb-3">📝 Manual Assignment</div>
              <div className="space-y-2">
                <input
                  value={hwForm.title}
                  onChange={e => setHwForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Homework title"
                  className="w-full app-field text-sm"
                />
                <input
                  value={hwForm.moduleId}
                  onChange={e => setHwForm(p => ({ ...p, moduleId: e.target.value }))}
                  placeholder="Subject area (e.g. letters, numbers, shapes)"
                  className="w-full app-field text-sm"
                />
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-bold app-muted mb-1">Due Date</div>
                    <input
                      type="date"
                      value={hwForm.dueDate}
                      onChange={e => setHwForm(p => ({ ...p, dueDate: e.target.value }))}
                      className="w-full app-field text-sm"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold app-muted mb-1">⭐ Stars</div>
                    <input
                      type="number"
                      min={1} max={20}
                      value={hwForm.starsReward}
                      onChange={e => setHwForm(p => ({ ...p, starsReward: Number(e.target.value) }))}
                      className="w-20 app-field text-sm text-center"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateHomework}
                  disabled={busy || !hwForm.title || !hwForm.dueDate}
                  className="w-full py-3 rounded-xl font-black text-sm app-pressable"
                  style={{ background: '#F5A623', opacity: (!hwForm.title || !hwForm.dueDate) ? 0.5 : 1 }}
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
                  <div key={hw.id} className="rounded-2xl p-4" style={{ background: hw.aiGenerated ? 'rgba(94,92,230,0.1)' : 'rgba(255,255,255,0.05)', border: hw.aiGenerated ? '1px solid rgba(94,92,230,0.25)' : '1px solid transparent' }}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-black text-sm">{hw.title}</div>
                          {hw.aiGenerated && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(94,92,230,0.4)', color: '#A78BFA' }}>✨ AI</span>
                          )}
                        </div>
                        {hw.description && (
                          <div className="text-xs font-bold app-muted mt-0.5 leading-snug">{hw.description}</div>
                        )}
                        <div className="text-xs font-bold app-muted mt-0.5">Due: {fmt(hw.dueDate)} · ⭐{hw.starsReward}</div>
                      </div>
                      <button onClick={() => handleDeleteHomework(hw.id)} className="text-red-400/60 text-xs font-bold flex-shrink-0 app-pressable">🗑️</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full h-1.5" style={{ background: 'rgba(120,120,140,0.14)' }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? '#4CAF6A' : '#F5A623' }} />
                      </div>
                      <div className="text-xs font-bold app-muted">{done}/{total}</div>
                    </div>
                  </div>
                )
              })}
              {homework.length === 0 && <InlineEmpty emoji="📚" text="No homework assigned yet" />}
            </div>

            {/* Due-tomorrow reminders */}
            <button
              onClick={async () => {
                if (!selectedClass) return
                setBusy(true)
                try {
                  const r = await sendHomeworkReminders(selectedClass.id)
                  showToast(`⏰ Sent reminders to ${r.sent} student${r.sent !== 1 ? 's' : ''} for ${r.homeworkCount} assignment${r.homeworkCount !== 1 ? 's' : ''}!`)
                } catch { showToast('Failed to send reminders') }
                setBusy(false)
              }}
              disabled={busy}
              className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-all app-pressable"
              style={{ background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.25)' }}
            >
              <span className="text-2xl">⏰</span>
              <div className="text-left">
                <div className="font-black text-sm">Send Due-Tomorrow Reminders</div>
                <div className="text-xs font-bold app-muted">Push notifications to students with HW due tomorrow</div>
              </div>
            </button>
          </div>
        )}

        {/* ── SYLLABUS TAB ─────────────────────────────────────────────────── */}
        {tab === 'syllabus' && (
          <div className="space-y-4">
            {/* ✨ AI Lesson Auto-Builder */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(191,90,242,0.15),rgba(94,92,230,0.15))', border: '1px solid rgba(191,90,242,0.3)' }}>
              <button
                onClick={() => setShowAISyl(v => !v)}
                className="w-full p-4 flex items-center gap-3 app-pressable"
              >
                <span className="text-3xl">✨</span>
                <div className="text-left flex-1">
                  <div className="font-black">AI Lesson Auto-Builder</div>
                  <div className="text-xs font-bold app-muted">Type a topic → Claude builds a full syllabus</div>
                </div>
                <span className="text-white/50 text-lg">{showAISyl ? '▲' : '▼'}</span>
              </button>
              {showAISyl && (
                <div className="px-4 pb-4 space-y-3">
                  <input
                    value={aiSylTopic}
                    onChange={e => setAiSylTopic(e.target.value)}
                    placeholder="e.g. Animals, Colors, Numbers 1-20, Shapes..."
                    className="w-full app-field text-sm"
                  />
                  <button
                    onClick={async () => {
                      if (!aiSylTopic.trim() || !selectedClass) return
                      setAiSylLoading(true)
                      try {
                        const syl = await autoSyllabus({ topic: aiSylTopic.trim(), grade: selectedClass.grade || 'KG 1', count: 10, classId: selectedClass.id })
                        await loadClassData(selectedClass.id)
                        setAiSylTopic('')
                        setShowAISyl(false)
                        showToast(`✨ "${syl.title}" syllabus created & assigned!`)
                      } catch (e: any) { showToast(e.message) }
                      finally { setAiSylLoading(false) }
                    }}
                    disabled={aiSylLoading || !aiSylTopic.trim()}
                    className="w-full py-3 rounded-xl font-black text-sm active:scale-95 transition-all app-pressable"
                    style={{ background: 'linear-gradient(135deg,#8B6CC1,#5B7FE8)', opacity: (!aiSylTopic.trim() || aiSylLoading) ? 0.5 : 1 }}
                  >
                    {aiSylLoading ? '✨ Building…' : '✨ Auto-Build Syllabus'}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push('/teacher/syllabus/builder')}
              className="w-full rounded-2xl p-5 flex items-center gap-4 active:scale-95 transition-all app-pressable"
              style={{ background: 'linear-gradient(135deg,#4CAF6A,#5FBF7F)' }}
            >
              <div className="text-4xl">✏️</div>
              <div>
                <div className="font-black text-lg">Build New Syllabus</div>
                <div className="text-sm font-bold">Create custom lesson content</div>
              </div>
            </button>

            <div className="space-y-2">
              {syllabuses.map(syl => (
                <div key={syl.id} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                  <div className="text-3xl">{syl.icon || '📖'}</div>
                  <div className="flex-1">
                    <div className="font-black text-sm">{syl.title}</div>
                    <div className="text-xs font-bold app-muted">{syl.items?.length || 0} cards · {syl.published ? '✅ Published' : '📝 Draft'}</div>
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
                      className="text-xs font-black px-3 py-1 rounded-full app-pressable"
                      style={{ background: '#4CAF6A30', color: '#4CAF6A' }}
                    >
                      Publish
                    </button>
                  )}
                </div>
              ))}
              {syllabuses.length === 0 && <InlineEmpty emoji="📖" text="No syllabuses yet" />}
            </div>
          </div>
        )}

        {/* ── MESSAGES TAB ─────────────────────────────────────────────────── */}
        {tab === 'messages' && (
          <div className="space-y-4">
            {/* Send message form */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
              <div className="font-black mb-3">📨 Send to Class</div>
              <div className="space-y-2">
                <input
                  value={msgForm.subject}
                  onChange={e => setMsgForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="Subject"
                  className="w-full app-field text-sm"
                />
                <textarea
                  value={msgForm.body}
                  onChange={e => setMsgForm(p => ({ ...p, body: e.target.value }))}
                  placeholder="Your message..."
                  rows={4}
                  className="w-full app-field text-sm resize-none placeholder:text-gray-400"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={busy || !msgForm.subject || !msgForm.body}
                  className="w-full py-3 rounded-xl font-black text-sm app-pressable"
                  style={{ background: '#4CAF6A', opacity: (!msgForm.subject || !msgForm.body) ? 0.5 : 1 }}
                >
                  Send Message
                </button>
              </div>
            </div>

            {/* Message list */}
            <div className="space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className="rounded-2xl p-4" style={{ background: msg.read === false ? 'rgba(94,92,230,0.12)' : 'rgba(255,255,255,0.05)', border: msg.read === false ? '1px solid #5B7FE830' : '1px solid transparent' }}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      {msg.read === false && <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />}
                      <div className="font-black text-sm">{msg.subject}</div>
                    </div>
                    <div className="text-xs font-bold app-muted">{fmt(msg.createdAt)}</div>
                  </div>
                  <div className="text-xs font-bold app-muted mb-1">From: {msg.from}</div>
                  <div className="text-xs app-muted leading-relaxed">{msg.body}</div>
                </div>
              ))}
              {messages.length === 0 && <InlineEmpty emoji="💬" text="No messages yet" />}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE TAB ─────────────────────────────────────── */}
        {tab === 'attendance' && (
          <div className="p-4 space-y-4">
            {!selectedClass ? (
              <div className="text-center font-bold app-muted py-10">Select a class first</div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="flex-1 app-field text-sm"
                  />
                  <button onClick={saveAttendanceHandler} disabled={busy}
                    className="px-4 py-2.5 rounded-xl font-black text-sm app-pressable"
                    style={{ background: '#4CAF6A', opacity: busy ? 0.6 : 1 }}>
                    Save
                  </button>
                </div>

                {attendanceLoading ? (
                  <div className="text-center text-white/40 font-bold py-8">Loading...</div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-xs font-bold app-muted">
                        {students.filter(s => attendanceRecords[s.id] !== false).length}/{students.length} Present
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          const all: Record<string, boolean> = {}
                          students.forEach(s => { all[s.id] = true })
                          setAttendanceRecords(all)
                        }} className="text-green-400 text-xs font-bold bg-green-400/10 rounded-full px-3 py-1 app-pressable">All Present</button>
                        <button onClick={() => {
                          const all: Record<string, boolean> = {}
                          students.forEach(s => { all[s.id] = false })
                          setAttendanceRecords(all)
                        }} className="text-red-400 text-xs font-bold bg-red-400/10 rounded-full px-3 py-1 app-pressable">All Absent</button>
                      </div>
                    </div>
                    {students.map(s => {
                      const present = attendanceRecords[s.id] !== false
                      return (
                        <button key={s.id}
                          onClick={() => setAttendanceRecords(prev => ({ ...prev, [s.id]: !present }))}
                          className="w-full flex items-center gap-3 rounded-2xl p-3 transition-all active:scale-95 app-pressable"
                          style={{ background: present ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)', border: `1.5px solid ${present ? '#4CAF6A40' : '#E0525240'}` }}>
                          <div className="text-2xl">{s.avatar}</div>
                          <div className="flex-1 text-left">
                            <div className="font-black text-sm">{s.name}</div>
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
                <div className="rounded-2xl p-4 mt-4" style={{ background: 'rgba(94,92,230,0.1)', border: '1px solid #5B7FE830' }}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-black text-sm">🤖 AI Weekly Report</div>
                    <button onClick={generateReportHandler} disabled={reportLoading}
                      className="px-3 py-1.5 rounded-xl font-black text-xs app-pressable"
                      style={{ background: '#5B7FE8', opacity: reportLoading ? 0.6 : 1 }}>
                      {reportLoading ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                  {reportText ? (
                    <div className="text-sm leading-relaxed">{reportText}</div>
                  ) : (
                    <div className="text-xs font-bold app-muted">Generate an AI summary of this class's weekly progress.</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Student Deep-Dive Modal ─────────────────────────────────── */}
      {deepDiveStudent && (() => {
        const s = deepDiveStudent
        const hwDone = homework.filter(hw => hw.completions?.some((c: any) => c.studentId === s.id && c.done)).length
        const fb = feedbacks[s.id]
        const grade = fb?.grade || s.grade || null
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'var(--app-overlay)' }} onClick={() => setDeepDiveStudent(null)}>
            <div className="w-full max-w-[430px] rounded-t-3xl pb-10 overflow-hidden" style={{ background: 'var(--app-surface)' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, rgba(94,92,230,0.08), rgba(191,90,242,0.06))' }}>
                <div className="text-4xl">{s.avatar || '🧒'}</div>
                <div className="flex-1">
                  <div className="font-black text-lg">{s.name}</div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {grade && <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">{grade}</span>}
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">⭐ {s.stars}</span>
                    {s.streak > 0 && <span className="text-xs font-black px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">🔥 {s.streak}d</span>}
                  </div>
                </div>
                <button onClick={() => setDeepDiveStudent(null)} className="text-white/40 text-3xl leading-none app-pressable">×</button>
              </div>
              {/* Stats grid */}
              <div className="p-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'AI Lv', value: s.aiBestLevel, emoji: '🤖' },
                  { label: 'AI Sessions', value: s.aiSessions, emoji: '🧠' },
                  { label: 'HW Done', value: `${hwDone}/${homework.length}`, emoji: '📚' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl p-3 text-center" style={{ background: 'var(--app-surface-soft)' }}>
                    <div className="text-xl mb-1">{stat.emoji}</div>
                    <div className="font-black text-base">{stat.value}</div>
                    <div className="text-xs font-bold app-muted">{stat.label}</div>
                  </div>
                ))}
              </div>
              {/* Recent AI sessions */}
              {(s.aiSessionLogs || []).length > 0 && (
                <div className="px-4 pb-3">
                  <div className="text-xs font-bold app-muted mb-2">RECENT AI SESSIONS</div>
                  <div className="space-y-2">
                    {(s.aiSessionLogs || []).slice(0, 3).map((sess: any) => (
                      <div key={sess.id} className="flex items-center gap-3 rounded-xl p-2.5" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                        <span className="text-lg">🧠</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs truncate">{sess.topic}</div>
                          <div className="text-xs font-bold app-muted">{sess.correct}/{sess.total} · Lv {sess.maxLevel}</div>
                        </div>
                        <div className="text-yellow-400 font-black text-xs">⭐{sess.stars}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {fb?.note && (
                <div className="px-4 pb-4">
                  <div className="text-xs font-bold app-muted mb-1">TEACHER NOTE</div>
                  <div className="rounded-xl p-3 text-xs app-muted leading-relaxed" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>{fb.note}</div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>

    {/* Photo Capture Modal */}
    {showPhotoCapture && selectedClass && (
      <PhotoCapture
        classId={selectedClass.id}
        students={students.map((s: any) => ({ id: s.id, name: s.name, avatar: s.avatar }))}
        onPosted={() => {
          setShowPhotoCapture(false)
          setToast('📸 Activity shared with parents!')
          setTimeout(() => setToast(''), 3000)
        }}
        onClose={() => setShowPhotoCapture(false)}
      />
    )}
    </div>
  )
}
