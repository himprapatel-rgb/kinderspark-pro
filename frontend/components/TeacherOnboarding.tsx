'use client'
import { useState } from 'react'
import { ArrowRight, CheckCircle } from 'lucide-react'

// ── Teacher Onboarding Flow ─────────────────────────────────────────────────
// Shows a friendly step-by-step guide when a teacher has no classes yet.
// Guides them to: 1) Create a class  2) Add students  3) Start teaching

interface TeacherOnboardingProps {
  teacherName: string
  onCreateClass: (name: string) => Promise<void>
  onDismiss: () => void
}

const STEPS = [
  {
    title: 'Create Your First Class',
    description: 'Give your classroom a name — like "Sunshine KG 1" or "Stars Group A"',
    color: '#5B7FE8',
    emoji: '📚',
  },
  {
    title: 'Add Your Students',
    description: 'Add each child with a name and 4-digit PIN. They\'ll use the PIN to log in.',
    color: '#4CAF6A',
    emoji: '👧🏻👦🏽',
  },
  {
    title: 'Start Teaching!',
    description: 'Create homework, build syllabuses with AI, and watch your students learn.',
    color: '#F5A623',
    emoji: '🚀',
  },
]

export default function TeacherOnboarding({ teacherName, onCreateClass, onDismiss }: TeacherOnboardingProps) {
  const [step, setStep] = useState(0)
  const [className, setClassName] = useState('')
  const [creating, setCreating] = useState(false)

  const firstName = teacherName?.split(' ')[0] || 'Teacher'

  const handleCreate = async () => {
    if (!className.trim()) return
    setCreating(true)
    try {
      await onCreateClass(className.trim())
      setStep(1)
    } catch {
      // error handled externally
    }
    setCreating(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-page-enter"
      style={{ background: 'var(--app-bg)' }}>
      
      {/* Welcome header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4 animate-bounce-subtle">👋</div>
        <h1 className="text-2xl font-black mb-2" style={{ color: 'rgb(var(--foreground-rgb))' }}>
          Welcome, {firstName}!
        </h1>
        <p className="text-sm font-bold" style={{ color: 'var(--app-text-muted)' }}>
          Let's get your classroom set up in 2 minutes
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all"
              style={{
                background: i < step ? 'var(--app-success)' : i === step ? s.color : 'var(--app-surface-soft)',
                color: i <= step ? '#fff' : 'var(--app-text-muted)',
                border: `2px solid ${i <= step ? 'transparent' : 'var(--app-border)'}`,
              }}
            >
              {i < step ? <CheckCircle size={16} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-0.5 rounded-full transition-all"
                style={{ background: i < step ? 'var(--app-success)' : 'var(--app-border)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Current step card */}
      <div className="w-full max-w-sm">
        {step === 0 && (
          <div className="rounded-3xl p-6 animate-page-enter"
            style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', boxShadow: 'var(--app-shadow-lg)' }}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">{STEPS[0].emoji}</div>
              <h2 className="font-black text-lg mb-1">{STEPS[0].title}</h2>
              <p className="text-xs font-bold" style={{ color: 'var(--app-text-muted)' }}>{STEPS[0].description}</p>
            </div>
            <input
              type="text"
              placeholder="e.g. Sunshine KG 1"
              value={className}
              onChange={e => setClassName(e.target.value)}
              className="app-field w-full mb-4 text-center text-base"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={!className.trim() || creating}
              className="w-full py-3.5 rounded-2xl font-black text-sm app-pressable flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: STEPS[0].color, color: '#fff', boxShadow: `0 4px 16px ${STEPS[0].color}40` }}
            >
              {creating ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Class <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="rounded-3xl p-6 animate-page-enter"
            style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', boxShadow: 'var(--app-shadow-lg)' }}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">✅</div>
              <h2 className="font-black text-lg mb-1">Class Created!</h2>
              <p className="text-xs font-bold" style={{ color: 'var(--app-text-muted)' }}>
                "{className}" is ready. Now head to your dashboard to add students.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl p-3"
                style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                <div className="text-2xl">👧🏻</div>
                <div>
                  <p className="font-black text-sm">Add students</p>
                  <p className="text-xs font-bold" style={{ color: 'var(--app-text-muted)' }}>Go to Students tab → Add Student</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl p-3"
                style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                <div className="text-2xl">📝</div>
                <div>
                  <p className="font-black text-sm">Create homework</p>
                  <p className="text-xs font-bold" style={{ color: 'var(--app-text-muted)' }}>Use AI to generate homework instantly</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl p-3"
                style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
                <div className="text-2xl">📸</div>
                <div>
                  <p className="font-black text-sm">Share activities</p>
                  <p className="text-xs font-bold" style={{ color: 'var(--app-text-muted)' }}>Capture classroom moments for parents</p>
                </div>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="w-full py-3.5 mt-5 rounded-2xl font-black text-sm app-pressable flex items-center justify-center gap-2"
              style={{ background: 'var(--app-success)', color: '#fff', boxShadow: '0 4px 16px rgba(76,175,106,0.4)' }}
            >
              Go to Dashboard <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Skip link */}
      {step === 0 && (
        <button onClick={onDismiss} className="mt-6 text-xs font-bold app-pressable" style={{ color: 'var(--app-text-muted)' }}>
          Skip for now →
        </button>
      )}
    </div>
  )
}
