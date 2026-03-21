'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import {
  getStudents, getClasses, getHomework, getSyllabuses, getMessages,
  createStudent, createClass, createHomework, sendMessage,
  saveFeedback, deleteHomework, deleteSyllabus, publishSyllabus,
  assignSyllabus, generateReport, deleteStudent
} from '@/lib/api'
import { MODS } from '@/lib/modules'

const GRADES = ['KG 1', 'KG 2', 'Grade 1', 'Grade 2']
const AVATARS = ['👧','👦','🧒','🦸','🧙','🧑','👶','🦊','🐯']
const FEEDBACK_GRADES = ['A+', 'A', 'B', 'C', 'NW']

export default function TeacherPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const logout = useStore(s => s.logout)

  const [tab, setTab] = useState(0)
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [homework, setHomework] = useState<any[]>([])
  const [syllabuses, setSyllabuses] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showAddClass, setShowAddClass] = useState(false)
  const [showAddHW, setShowAddHW] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [showGrade, setShowGrade] = useState<any>(null)
  const [showReport, setShowReport] = useState(false)
  const [reportText, setReportText] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

  // Forms
  const [studentForm, setStudentForm] = useState({ name: '', age: '5', avatar: '👧', pin: '' })
  const [classForm, setClassForm] = useState({ name: '', grade: 'KG 1' })
  const [hwForm, setHwForm] = useState({ title: '', moduleId: '', dueDate: '', assignedTo: 'all' })
  const [msgForm, setMsgForm] = useState({ to: 'all', subject: '', body: '' })
  const [gradeForm, setGradeForm] = useState({ grade: '', note: '' })

  const loadData = useCallback(async (cls?: any) => {
    try {
      const clsData = await getClasses()
      setClasses(clsData)
      const current = cls || clsData[0]
      if (current) {
        setSelectedClass(current)
        const [sts, hw, syl, msgs] = await Promise.all([
          getStudents(current.id),
          getHomework(current.id),
          getSyllabuses(current.id),
          getMessages({ classId: current.id }),
        ])
        setStudents(sts)
        setHomework(hw)
        setSyllabuses(syl)
        setMessages(msgs)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) { router.push('/'); return }
    loadData()
  }, [user, router, loadData])

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cls = classes.find(c => c.id === e.target.value)
    if (cls) loadData(cls)
  }

  const handleAddStudent = async () => {
    if (!studentForm.name || !studentForm.pin || !selectedClass) return
    try {
      await createStudent({ ...studentForm, age: parseInt(studentForm.age), classId: selectedClass.id })
      setShowAddStudent(false)
      setStudentForm({ name: '', age: '5', avatar: '👧', pin: '' })
      loadData(selectedClass)
    } catch (e: any) { alert(e.message) }
  }

  const handleAddClass = async () => {
    if (!classForm.name) return
    try {
      const cls = await createClass(classForm)
      setShowAddClass(false)
      setClassForm({ name: '', grade: 'KG 1' })
      loadData(cls)
    } catch (e: any) { alert(e.message) }
  }

  const handleAddHW = async () => {
    if (!hwForm.title || !hwForm.dueDate || !selectedClass) return
    try {
      await createHomework({ ...hwForm, classId: selectedClass.id })
      setShowAddHW(false)
      setHwForm({ title: '', moduleId: '', dueDate: '', assignedTo: 'all' })
      loadData(selectedClass)
    } catch (e: any) { alert(e.message) }
  }

  const handleSendMessage = async () => {
    if (!msgForm.subject || !msgForm.body) return
    try {
      await sendMessage({ ...msgForm, from: user.name, fromId: user.id, classId: selectedClass?.id })
      setShowMessage(false)
      setMsgForm({ to: 'all', subject: '', body: '' })
      loadData(selectedClass)
    } catch (e: any) { alert(e.message) }
  }

  const handleSaveGrade = async () => {
    if (!showGrade) return
    try {
      await saveFeedback({ studentId: showGrade.id, grade: gradeForm.grade, note: gradeForm.note })
      setShowGrade(null)
      setGradeForm({ grade: '', note: '' })
      loadData(selectedClass)
    } catch (e: any) { alert(e.message) }
  }

  const handleGenerateReport = async () => {
    if (!selectedClass) return
    setReportLoading(true)
    try {
      const { report } = await generateReport(selectedClass.id)
      setReportText(report)
    } catch {
      setReportText('Your class has had a wonderful week of learning and growing together!')
    } finally {
      setReportLoading(false)
    }
  }

  const TABS = ['🏫 Class', '📚 HW', '📖 Syllabus', '💬 Messages']

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a2e' }}>
        <div className="text-white/60 font-bold">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f0f1a' }}>
      {/* Tab bar */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-black/90 backdrop-blur border-b border-white/10">
        <div className="flex">
          {TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`flex-1 py-3 text-xs font-black transition-colors ${
                tab === i ? 'text-accent border-t-2 border-accent' : 'text-white/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-12 pb-20">
        {/* CLASS TAB */}
        {tab === 0 && (
          <div>
            {/* Hero */}
            <div className="m-3 rounded-3xl p-5" style={{ background: 'linear-gradient(135deg, #5E5CE6, #BF5AF2)' }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-white/70 text-xs font-bold">Teacher</div>
                  <div className="text-white text-xl font-black">{user?.name}</div>
                </div>
                <button onClick={() => { logout(); router.push('/') }} className="text-white/50 text-xs font-bold border border-white/30 rounded-full px-3 py-1">
                  Logout
                </button>
              </div>
              <select
                value={selectedClass?.id || ''}
                onChange={handleClassChange}
                className="w-full bg-white/20 text-white font-bold text-sm rounded-xl px-3 py-2 mb-3 border border-white/30"
              >
                {classes.map(c => <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
              </select>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: students.length, l: 'Students' },
                  { v: homework.length, l: 'HW' },
                  { v: syllabuses.length, l: 'Lessons' },
                  { v: messages.length, l: 'Messages' },
                ].map(s => (
                  <div key={s.l} className="bg-white/20 rounded-xl p-2 text-center">
                    <div className="text-white text-lg font-black">{s.v}</div>
                    <div className="text-white/70 text-xs font-bold">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 px-3 mb-4">
              <button onClick={() => { setShowReport(true); handleGenerateReport() }}
                className="flex-1 py-2 rounded-xl text-white text-xs font-black"
                style={{ background: '#30D158' }}>
                📊 Report
              </button>
              <button onClick={() => setShowAddClass(true)}
                className="flex-1 py-2 rounded-xl text-white text-xs font-black"
                style={{ background: '#5E5CE6' }}>
                + Class
              </button>
              <button onClick={() => setShowAddStudent(true)}
                className="flex-1 py-2 rounded-xl text-white text-xs font-black"
                style={{ background: '#BF5AF2' }}>
                + Student
              </button>
            </div>

            {/* Student list */}
            <div className="px-3 space-y-3">
              {students.map(s => {
                const totalCards = MODS.reduce((a, m) => a + m.items.length, 0)
                const doneCards = s.progress?.reduce((a: number, p: any) => a + p.cards, 0) || 0
                const pct = Math.min(100, Math.round((doneCards / totalCards) * 100))
                return (
                  <div key={s.id} className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-3xl">{s.avatar}</div>
                      <div className="flex-1">
                        <div className="text-white font-black text-sm flex items-center gap-2">
                          {s.name}
                          {s.grade && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-black text-black"
                              style={{ background: s.grade === 'A+' || s.grade === 'A' ? '#30D158' : s.grade === 'B' ? '#FF9F0A' : '#FF453A' }}>
                              {s.grade}
                            </span>
                          )}
                        </div>
                        <div className="text-white/50 text-xs font-bold">Age {s.age} • ⭐ {s.stars} • 🔥 {s.streak}d</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-xs font-bold text-purple-400">Lvl {s.aiBestLevel}</div>
                        <button
                          onClick={() => { setShowGrade(s); setGradeForm({ grade: s.grade || '', note: s.feedback?.note || '' }) }}
                          className="text-xs font-bold px-2 py-1 rounded-lg"
                          style={{ background: '#5E5CE620' }}
                        >📝 Grade</button>
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: '#5E5CE6' }} />
                    </div>
                    <div className="text-white/40 text-xs font-bold mt-1">{pct}% complete</div>
                  </div>
                )
              })}
              {students.length === 0 && (
                <div className="text-center text-white/30 font-bold py-10">No students yet. Add one!</div>
              )}
            </div>
          </div>
        )}

        {/* HW TAB */}
        {tab === 1 && (
          <div className="px-3">
            <div className="flex justify-between items-center mb-4 pt-2">
              <h2 className="text-white font-black text-lg">Homework</h2>
              <button onClick={() => setShowAddHW(true)}
                className="px-4 py-2 rounded-xl text-white text-xs font-black"
                style={{ background: '#5E5CE6' }}>
                + Assign
              </button>
            </div>
            <div className="space-y-3">
              {homework.map(hw => {
                const total = students.length
                const done = hw.completions?.filter((c: any) => c.done).length || 0
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                const mod = MODS.find(m => m.id === hw.moduleId)
                return (
                  <div key={hw.id} className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl">{mod?.icon || '📚'}</div>
                        <div>
                          <div className="text-white font-black text-sm">{hw.title}</div>
                          <div className="text-white/50 text-xs font-bold">Due: {hw.dueDate}</div>
                        </div>
                      </div>
                      <button onClick={() => { deleteHomework(hw.id).then(() => loadData(selectedClass)) }}
                        className="text-red-400 text-xs font-bold">✕</button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/10 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: '#30D158' }} />
                      </div>
                      <div className="text-white/60 text-xs font-bold">{done}/{total}</div>
                    </div>
                  </div>
                )
              })}
              {homework.length === 0 && (
                <div className="text-center text-white/30 font-bold py-10">No homework assigned yet.</div>
              )}
            </div>
          </div>
        )}

        {/* SYLLABUS TAB */}
        {tab === 2 && (
          <div>
            <div className="m-3 rounded-3xl p-4" style={{ background: 'linear-gradient(135deg, #FF9F0A, #FF453A)' }}>
              <div className="text-white font-black text-lg mb-1">Custom Lessons</div>
              <div className="text-white/80 text-sm font-bold">{syllabuses.length} syllabuses • {syllabuses.reduce((a, s) => a + (s.items?.length || 0), 0)} total cards</div>
            </div>
            <div className="flex gap-2 px-3 mb-4">
              <button onClick={() => router.push('/teacher/builder')}
                className="flex-1 py-2 rounded-xl text-white text-xs font-black"
                style={{ background: '#FF9F0A' }}>
                + Build
              </button>
              <button onClick={() => router.push('/teacher/builder?template=1')}
                className="flex-1 py-2 rounded-xl text-white text-xs font-black"
                style={{ background: '#5E5CE6' }}>
                ✨ Template
              </button>
            </div>
            <div className="px-3 space-y-3">
              {syllabuses.map(syl => (
                <div key={syl.id} className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-3xl">{syl.icon}</div>
                    <div className="flex-1">
                      <div className="text-white font-black text-sm flex items-center gap-2">
                        {syl.title}
                        {syl.published && <span className="text-xs text-green-400 font-bold">✓ Published</span>}
                      </div>
                      <div className="text-white/50 text-xs font-bold">{syl.items?.length || 0} cards</div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => router.push(`/teacher/builder?id=${syl.id}`)}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ background: '#5E5CE640' }}>
                      ✏️ Edit
                    </button>
                    {!syl.published && (
                      <button onClick={() => publishSyllabus(syl.id).then(() => loadData(selectedClass))}
                        className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ background: '#30D15840' }}>
                        Publish
                      </button>
                    )}
                    <button onClick={() => assignSyllabus(syl.id, 'all', selectedClass?.id).then(() => loadData(selectedClass))}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ background: '#FF9F0A40' }}>
                      Assign
                    </button>
                    <button onClick={() => deleteSyllabus(syl.id).then(() => loadData(selectedClass))}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-red-400" style={{ background: '#FF453A20' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {syllabuses.length === 0 && (
                <div className="text-center text-white/30 font-bold py-10">No syllabuses yet. Build one!</div>
              )}
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {tab === 3 && (
          <div className="px-3">
            <div className="flex justify-between items-center mb-4 pt-2">
              <h2 className="text-white font-black text-lg">Messages</h2>
              <button onClick={() => setShowMessage(true)}
                className="px-4 py-2 rounded-xl text-white text-xs font-black"
                style={{ background: '#5E5CE6' }}>
                + Compose
              </button>
            </div>
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className="rounded-2xl p-4" style={{ background: '#1a1a2e' }}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-white font-black text-sm">{msg.subject}</div>
                    <div className="text-white/40 text-xs font-bold">{new Date(msg.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-white/50 text-xs font-bold mb-1">To: {msg.to}</div>
                  <div className="text-white/70 text-xs">{msg.body.slice(0, 100)}...</div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-white/30 font-bold py-10">No messages yet.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}

      {/* Add Student Modal */}
      {showAddStudent && (
        <Modal onClose={() => setShowAddStudent(false)} title="Add Student">
          <div className="space-y-3">
            <input placeholder="Student name" value={studentForm.name}
              onChange={e => setStudentForm(f => ({...f, name: e.target.value}))}
              className="input-field" />
            <input placeholder="Age" type="number" value={studentForm.age}
              onChange={e => setStudentForm(f => ({...f, age: e.target.value}))}
              className="input-field" />
            <input placeholder="4-digit PIN" value={studentForm.pin} maxLength={4}
              onChange={e => setStudentForm(f => ({...f, pin: e.target.value}))}
              className="input-field" />
            <div>
              <div className="text-white/60 text-xs font-bold mb-2">Avatar</div>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map(a => (
                  <button key={a} onClick={() => setStudentForm(f => ({...f, avatar: a}))}
                    className={`text-2xl p-1 rounded-lg ${studentForm.avatar === a ? 'bg-accent' : 'bg-white/10'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleAddStudent}
              className="w-full py-3 rounded-xl text-white font-black"
              style={{ background: '#5E5CE6' }}>
              Add Student
            </button>
          </div>
        </Modal>
      )}

      {/* Add Class Modal */}
      {showAddClass && (
        <Modal onClose={() => setShowAddClass(false)} title="Add Class">
          <div className="space-y-3">
            <input placeholder="Class name" value={classForm.name}
              onChange={e => setClassForm(f => ({...f, name: e.target.value}))}
              className="input-field" />
            <select value={classForm.grade}
              onChange={e => setClassForm(f => ({...f, grade: e.target.value}))}
              className="input-field">
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
            <button onClick={handleAddClass}
              className="w-full py-3 rounded-xl text-white font-black"
              style={{ background: '#5E5CE6' }}>
              Create Class
            </button>
          </div>
        </Modal>
      )}

      {/* Assign HW Modal */}
      {showAddHW && (
        <Modal onClose={() => setShowAddHW(false)} title="Assign Homework">
          <div className="space-y-3">
            <input placeholder="Homework title" value={hwForm.title}
              onChange={e => setHwForm(f => ({...f, title: e.target.value}))}
              className="input-field" />
            <select value={hwForm.moduleId}
              onChange={e => setHwForm(f => ({...f, moduleId: e.target.value}))}
              className="input-field">
              <option value="">Select module (optional)</option>
              {MODS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.title}</option>)}
            </select>
            <input type="date" value={hwForm.dueDate}
              onChange={e => setHwForm(f => ({...f, dueDate: e.target.value}))}
              className="input-field" />
            <select value={hwForm.assignedTo}
              onChange={e => setHwForm(f => ({...f, assignedTo: e.target.value}))}
              className="input-field">
              <option value="all">All students</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={handleAddHW}
              className="w-full py-3 rounded-xl text-white font-black"
              style={{ background: '#5E5CE6' }}>
              Assign Homework
            </button>
          </div>
        </Modal>
      )}

      {/* Send Message Modal */}
      {showMessage && (
        <Modal onClose={() => setShowMessage(false)} title="Send Message">
          <div className="space-y-3">
            <select value={msgForm.to}
              onChange={e => setMsgForm(f => ({...f, to: e.target.value}))}
              className="input-field">
              <option value="all">All Parents</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}'s parent</option>)}
            </select>
            <input placeholder="Subject" value={msgForm.subject}
              onChange={e => setMsgForm(f => ({...f, subject: e.target.value}))}
              className="input-field" />
            <textarea placeholder="Message body" value={msgForm.body} rows={4}
              onChange={e => setMsgForm(f => ({...f, body: e.target.value}))}
              className="input-field resize-none" />
            <button onClick={handleSendMessage}
              className="w-full py-3 rounded-xl text-white font-black"
              style={{ background: '#5E5CE6' }}>
              Send Message
            </button>
          </div>
        </Modal>
      )}

      {/* Grade Modal */}
      {showGrade && (
        <Modal onClose={() => setShowGrade(null)} title={`Grade: ${showGrade.name}`}>
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {FEEDBACK_GRADES.map(g => (
                <button key={g} onClick={() => setGradeForm(f => ({...f, grade: g}))}
                  className={`px-4 py-2 rounded-xl font-black text-sm ${gradeForm.grade === g ? 'text-black' : 'text-white/60'}`}
                  style={{ background: gradeForm.grade === g ? (g === 'A+' || g === 'A' ? '#30D158' : g === 'B' ? '#FF9F0A' : '#FF453A') : '#ffffff20' }}>
                  {g}
                </button>
              ))}
            </div>
            <textarea placeholder="Add a note (optional)" value={gradeForm.note} rows={3}
              onChange={e => setGradeForm(f => ({...f, note: e.target.value}))}
              className="input-field resize-none" />
            <button onClick={handleSaveGrade}
              className="w-full py-3 rounded-xl text-white font-black"
              style={{ background: '#5E5CE6' }}>
              Save Grade
            </button>
          </div>
        </Modal>
      )}

      {/* Weekly Report Modal */}
      {showReport && (
        <Modal onClose={() => setShowReport(false)} title="Weekly Report">
          <div className="space-y-3">
            {reportLoading ? (
              <div className="text-center text-white/60 py-8">Generating with AI...</div>
            ) : (
              <>
                <div className="bg-white/10 rounded-xl p-4 text-white/80 text-sm font-bold leading-relaxed">
                  {reportText || 'No report generated yet.'}
                </div>
                <button onClick={handleGenerateReport}
                  className="w-full py-2 rounded-xl text-white font-black text-sm"
                  style={{ background: '#30D158' }}>
                  Regenerate
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      <style>{`
        .input-field {
          width: 100%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          padding: 10px 14px;
          color: white;
          font-weight: 700;
          font-size: 14px;
          outline: none;
          font-family: Nunito, sans-serif;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.3); }
        .input-field option { color: black; }
      `}</style>
    </div>
  )
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-[430px] rounded-t-3xl p-5 pb-10"
        style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-black text-lg">{title}</h3>
          <button onClick={onClose} className="text-white/50 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
