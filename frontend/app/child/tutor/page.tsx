'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { saveAISession, getTutorFeedback, updateStudent } from '@/lib/api'
import { TUTOR_TOPICS, QB } from '@/lib/modules'
import { speak } from '@/lib/speech'
import { Bot, Home, RotateCcw, Volume2, X } from 'lucide-react'

type Phase = 'topics' | 'quiz' | 'results'

const TOTAL_Q = 10

export default function TutorPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const currentStudent = useStore(s => s.currentStudent)

  const student = currentStudent || user

  const [phase, setPhase] = useState<Phase>('topics')
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState<any[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [maxLevel, setMaxLevel] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [aiFeedback, setAiFeedback] = useState('')
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [newBadges, setNewBadges] = useState<any[]>([])

  const startQuiz = (topicId: string) => {
    const pool = QB[topicId] || []
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, TOTAL_Q)
    // Pad with first items if not enough
    while (shuffled.length < TOTAL_Q) shuffled.push(...pool.slice(0, TOTAL_Q - shuffled.length))
    setTopic(topicId)
    setQuestions(shuffled.slice(0, TOTAL_Q))
    setQIdx(0)
    setCorrect(0)
    setStreak(0)
    setMaxStreak(0)
    setLevel(1)
    setMaxLevel(1)
    setSelected(null)
    setAnswered(false)
    setAiFeedback('')
    setNewBadges([])
    setPhase('quiz')
  }

  const currentQ = questions[qIdx]

  const handleAnswer = (choice: string) => {
    if (answered) return
    setSelected(choice)
    setAnswered(true)
    const isCorrect = choice === currentQ.a
    if (isCorrect) {
      const newCorrect = correct + 1
      const newStreak = streak + 1
      const newMaxStreak = Math.max(maxStreak, newStreak)
      const newLevel = Math.min(5, Math.floor(newCorrect / 2) + 1)
      const newMaxLevel = Math.max(maxLevel, newLevel)
      setCorrect(newCorrect)
      setStreak(newStreak)
      setMaxStreak(newMaxStreak)
      setLevel(newLevel)
      setMaxLevel(newMaxLevel)
      speak('Correct! Great job!')
    } else {
      setStreak(0)
      speak('Not quite. Try again next time!')
    }
  }

  const handleNext = () => {
    if (qIdx < TOTAL_Q - 1) {
      setQIdx(i => i + 1)
      setSelected(null)
      setAnswered(false)
    } else {
      finishQuiz()
    }
  }

  const finishQuiz = async () => {
    setPhase('results')
    const accuracy = Math.round((correct / TOTAL_Q) * 100)
    const stars = Math.round((correct / TOTAL_Q) * 3)

    if (student) {
      setLoadingFeedback(true)
      try {
        const [feedbackRes, sessionRes] = await Promise.all([
          getTutorFeedback({ correct, total: TOTAL_Q, topic, maxLevel }),
          saveAISession({ studentId: student.id, topic, correct, total: TOTAL_Q, stars, maxLevel, accuracy }),
          updateStudent(student.id, {
            stars: (student.stars || 0) + stars,
            aiSessions: (student.aiSessions || 0) + 1,
            aiBestLevel: Math.max(student.aiBestLevel || 1, maxLevel),
          }),
        ])
        setAiFeedback(feedbackRes.feedback)
        if (sessionRes?.newBadges?.length) setNewBadges(sessionRes.newBadges)
      } catch {
        setAiFeedback('Amazing job completing your quiz today! 🌟 You are a superstar learner!')
      } finally {
        setLoadingFeedback(false)
      }
    }
  }

  const accuracy = TOTAL_Q > 0 ? Math.round((correct / TOTAL_Q) * 100) : 0
  const stars = Math.round((correct / TOTAL_Q) * 3)

  if (phase === 'topics') {
    return (
      <div className="min-h-screen flex flex-col app-container" style={{ background: 'var(--app-bg)' }}>
        <div className="flex items-center gap-3 p-5 doodle-surface">
          <button onClick={() => router.push('/child')} className="font-bold app-pressable sticker-bubble px-3 py-1.5" style={{ color: 'rgb(var(--foreground-rgb))' }}>← Back</button>
        </div>
        <div className="px-5 pb-10">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3 inline-flex items-center justify-center w-20 h-20 sticker-bubble"><Bot size={38} color="var(--app-accent)" /></div>
            <div className="text-2xl font-black">AI Tutor Sparkle</div>
            <div className="app-muted font-bold">Choose a topic to practice!</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TUTOR_TOPICS.map(t => (
              <button className="app-pressable" key={t.id} onClick={() => startQuiz(t.id)}
                className="rounded-2xl p-5 flex flex-col items-center gap-2 active:scale-95 transition-all"
                style={{ background: t.color + '22', border: `2px solid ${t.color}44` }}>
                <div className="text-4xl sticker-bubble w-14 h-14 flex items-center justify-center" style={{ transform: 'rotate(-4deg)' }}>{t.emoji}</div>
                <div className="font-black text-sm" style={{ color: 'rgb(32,36,52)' }}>{t.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'results') {
    const topicInfo = TUTOR_TOPICS.find(t => t.id === topic)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--app-bg)' }}>
        <div className="text-7xl mb-3 animate-bounce">
          {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '🌟' : '💪'}
        </div>
        <div className="text-3xl font-black mb-1">
          {accuracy >= 80 ? 'Excellent!' : accuracy >= 60 ? 'Good Job!' : 'Keep Trying!'}
        </div>
        <div className="text-white/60 font-bold mb-6">{topicInfo?.label} Quiz Complete</div>

        {/* Stats */}
        <div className="w-full rounded-2xl p-5 mb-5" style={{ background: 'var(--app-surface)', border: '1px solid rgba(120,120,140,0.2)' }}>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-yellow-400 text-2xl font-black">{correct}/{TOTAL_Q}</div>
              <div className="text-xs font-bold app-muted">Score</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 text-2xl font-black">{accuracy}%</div>
              <div className="text-xs font-bold app-muted">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-purple-400 text-2xl font-black">Lvl {maxLevel}</div>
              <div className="text-xs font-bold app-muted">Max Level</div>
            </div>
          </div>
          <div className="flex justify-center gap-2 mb-4">
            {[0,1,2].map(i => (
              <div key={i} className="text-3xl">{i < stars ? '⭐' : '☆'}</div>
            ))}
          </div>
          {loadingFeedback ? (
            <div className="text-sm font-bold app-muted text-center">Getting AI feedback...</div>
          ) : (
            <div className="bg-white/5 rounded-xl p-3 text-white/80 text-sm font-bold text-center leading-relaxed">
              {aiFeedback}
            </div>
          )}
        </div>

        {newBadges.length > 0 && (
          <div className="w-full rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(255,214,10,0.15), rgba(255,159,10,0.15))', border: '1px solid rgba(255,214,10,0.3)' }}>
            <div className="text-center font-black text-sm mb-3">🎉 New Badge{newBadges.length > 1 ? 's' : ''} Unlocked!</div>
            <div className="flex flex-wrap justify-center gap-3">
              {newBadges.map((b: any) => (
                <div key={b.type} className="flex flex-col items-center gap-1">
                  <div className="text-4xl animate-bounce">{b.emoji}</div>
                  <div className="text-yellow-300 text-xs font-black text-center">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 w-full">
          <button onClick={() => startQuiz(topic)}
            className="flex-1 py-3 rounded-2xl font-black inline-flex items-center justify-center gap-2 app-pressable"
            style={{ background: '#5B7FE8', color: '#fff' }}>
            <RotateCcw size={16} /> Play Again
          </button>
          <button onClick={() => router.push('/child')}
            className="flex-1 py-3 rounded-2xl font-black bg-white/20 inline-flex items-center justify-center gap-2 app-pressable">
            <Home size={16} /> Home
          </button>
        </div>
      </div>
    )
  }

  // Quiz phase
  const topicInfo = TUTOR_TOPICS.find(t => t.id === topic)
  const choices = currentQ?.choices || []

  return (
    <div className="min-h-screen flex flex-col app-container" style={{ background: 'var(--app-bg)' }}>
      {/* HUD */}
      <div className="p-4 flex items-center gap-3">
          <button onClick={() => setPhase('topics')} className="font-bold app-pressable sticker-bubble w-9 h-9 flex items-center justify-center" style={{ color: 'rgb(var(--foreground-rgb))' }}><X size={16} /></button>
        <div className="flex-1 flex gap-4 justify-center">
          <div className="text-center">
            <div className="font-black text-sm">{qIdx + 1}/{TOTAL_Q}</div>
            <div className="text-xs app-muted">Q</div>
          </div>
          <div className="text-center">
            <div className="text-green-400 font-black text-sm">{correct}</div>
            <div className="text-xs app-muted">✓</div>
          </div>
          <div className="text-center">
            <div className="text-orange-400 font-black text-sm">🔥 {streak}</div>
            <div className="text-xs app-muted">Streak</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-black text-sm">Lvl {level}</div>
            <div className="text-xs app-muted">Level</div>
          </div>
        </div>
      </div>

      {/* Difficulty bar */}
      <div className="px-4 mb-4">
        <div className="flex gap-1">
          {[1,2,3,4,5].map(l => (
            <div key={l} className="flex-1 h-1.5 rounded-full transition-all"
              style={{ background: l <= level ? topicInfo?.color || '#5B7FE8' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-4">
        <div className="bg-gray-200 rounded-full h-2">
          <div className="h-2 rounded-full transition-all"
            style={{ width: `${(qIdx / TOTAL_Q) * 100}%`, background: topicInfo?.color || '#5B7FE8' }} />
        </div>
      </div>

      {/* Sparkle speech bubble */}
      <div className="px-4 mb-4 flex gap-3 items-start">
        <div className="text-4xl sticker-bubble w-12 h-12 flex items-center justify-center"><Bot size={24} color="var(--app-accent)" /></div>
        <div className="flex-1 rounded-2xl rounded-tl-none p-3" style={{ background: 'var(--app-surface)', border: '1px solid rgba(120,120,140,0.2)' }}>
          <div className="font-bold text-sm" style={{ color: 'rgba(32,36,52,0.9)' }}>
            {answered
              ? selected === currentQ?.a ? '🎉 Correct! You got it!' : `❌ The answer was "${currentQ?.a}"`
              : 'Think carefully and choose the right answer! 🤔'}
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="px-4 mb-5">
        <div className="rounded-2xl p-5 text-center" style={{ background: 'var(--app-surface)', border: '1px solid rgba(120,120,140,0.2)' }}>
          <div className="text-5xl mb-3">{currentQ?.e}</div>
          <div className="font-black text-lg" style={{ color: 'rgb(32,36,52)' }}>{currentQ?.q}</div>
        </div>
      </div>

      {/* Answer grid */}
      <div className="px-4 flex-1">
        <div className="grid grid-cols-2 gap-3">
          {choices.map((choice: string) => {
            let bg = 'var(--app-surface)'
            let border = 'rgba(120,120,140,0.22)'
            if (answered) {
              if (choice === currentQ.a) { bg = '#4CAF6A40'; border = '#4CAF6A' }
              else if (choice === selected) { bg = '#E0525240'; border = '#E05252' }
            }
            return (
              <button className="app-pressable" key={choice}
                onClick={() => handleAnswer(choice)}
                disabled={answered}
                className="rounded-2xl p-4 text-center active:scale-95 transition-all"
                style={{ background: bg, border: `2px solid ${border}` }}>
                <div className="font-black text-base" style={{ color: 'rgb(32,36,52)' }}>{choice}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Next button */}
      {answered && (
        <div className="p-4">
          <button onClick={handleNext}
            className="w-full py-4 rounded-2xl font-black text-lg active:scale-95 transition-all app-pressable"
            style={{ background: topicInfo?.color || '#5B7FE8', color: '#fff' }}>
            {qIdx === TOTAL_Q - 1 ? 'See Results! 🎉' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  )
}
