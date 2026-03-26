'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { MODS } from '@/lib/modules'
import { updateProgress, saveAISession } from '@/lib/api'

const QUESTIONS_PER_ROUND = 10
const STARS_PER_CORRECT = 3

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Question {
  emoji: string
  word: string
  hint?: string
  choices: string[]
  correct: string
  modColor: string
}

function buildQuestions(count: number): Question[] {
  // Pool all items from all modules
  const pool: { emoji: string; word: string; hint?: string; color: string }[] = []
  for (const mod of MODS) {
    for (const item of mod.items) {
      pool.push({ emoji: item.e, word: item.w, hint: item.hint, color: mod.color })
    }
  }
  const shuffled = shuffle(pool).slice(0, count + 20) // extra for distractors

  const questions: Question[] = []
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const item = shuffled[i]
    // Pick 3 wrong answers from other items
    const others = shuffled.filter((_, j) => j !== i).map(x => x.word)
    const distractors = shuffle(others).slice(0, 3)
    const choices = shuffle([item.word, ...distractors])
    questions.push({
      emoji: item.emoji,
      word: item.word,
      hint: item.hint,
      choices,
      correct: item.word,
      modColor: item.color,
    })
  }
  return questions
}

type Screen = 'ready' | 'playing' | 'result'

export default function WordMatchPage() {
  const router = useRouter()
  const user = useAppStore(s => s.user)
  const currentStudent = useAppStore(s => s.currentStudent)
  const student = currentStudent || user

  const [screen, setScreen] = useState<Screen>('ready')
  const [questions, setQuestions] = useState<Question[]>([])
  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [saving, setSaving] = useState(false)

  const startGame = useCallback(() => {
    setQuestions(buildQuestions(QUESTIONS_PER_ROUND))
    setCurrent(0)
    setScore(0)
    setSelected(null)
    setFeedback(null)
    setStreak(0)
    setMaxStreak(0)
    setScreen('playing')
  }, [])

  useEffect(() => { if (!student) router.push('/') }, [student])

  const handleChoice = (choice: string) => {
    if (selected) return
    setSelected(choice)
    const isCorrect = choice === questions[current].correct
    setFeedback(isCorrect ? 'correct' : 'wrong')

    if (isCorrect) {
      const newStreak = streak + 1
      setScore(s => s + 1)
      setStreak(newStreak)
      setMaxStreak(ms => Math.max(ms, newStreak))
    } else {
      setStreak(0)
    }

    setTimeout(() => {
      setSelected(null)
      setFeedback(null)
      if (current + 1 >= questions.length) {
        finishGame(isCorrect ? score + 1 : score)
      } else {
        setCurrent(c => c + 1)
      }
    }, 900)
  }

  const finishGame = async (finalScore: number) => {
    setScreen('result')
    if (!student?.id) return
    setSaving(true)
    const starsEarned = finalScore * STARS_PER_CORRECT
    const accuracy = Math.round((finalScore / QUESTIONS_PER_ROUND) * 100)
    try {
      await saveAISession({
        studentId: student.id,
        topic: 'Word Match',
        correct: finalScore,
        total: QUESTIONS_PER_ROUND,
        stars: starsEarned,
        maxLevel: accuracy >= 90 ? 5 : accuracy >= 70 ? 4 : accuracy >= 50 ? 3 : accuracy >= 30 ? 2 : 1,
        accuracy,
      })
    } catch { /* best effort */ }
    setSaving(false)
  }

  const q = questions[current]
  const starsEarned = score * STARS_PER_CORRECT
  const accuracy = questions.length ? Math.round((score / QUESTIONS_PER_ROUND) * 100) : 0

  // ── READY screen ──
  if (screen === 'ready') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5 pb-24"
        style={{ background: 'linear-gradient(180deg, var(--theme-bg-tint, #1a0a2e) 0%, #0d0d1a 100%)' }}
      >
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-6 animate-bounce-subtle"
          style={{
            background: 'linear-gradient(135deg, #FF9F0A, #FF6B35)',
            boxShadow: '0 8px 32px rgba(255,159,10,0.45)',
          }}
        >
          🔤
        </div>
        <h1 className="text-white text-3xl font-black mb-2">Word Match</h1>
        <p className="text-white/50 text-base font-bold mb-2 text-center">
          Match the emoji to the correct word!
        </p>
        <div className="flex gap-4 mb-10 mt-4">
          {[
            { label: `${QUESTIONS_PER_ROUND} rounds`, icon: '🎯' },
            { label: `${STARS_PER_CORRECT}⭐ per hit`, icon: '⭐' },
            { label: 'All topics', icon: '📚' },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl px-3 py-2 flex flex-col items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <span className="text-xl">{s.icon}</span>
              <span className="text-white/60 text-[11px] font-bold">{s.label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={startGame}
          className="w-full max-w-[280px] py-5 rounded-3xl text-white font-black text-xl active:scale-95 transition-all relative overflow-hidden app-pressable"
          style={{
            background: 'linear-gradient(135deg, #FF9F0A, #FF6B35)',
            boxShadow: '0 8px 32px rgba(255,159,10,0.5)',
          }}
        >
          <div className="absolute inset-0 shimmer" />
          <span className="relative">Play ▶</span>
        </button>
        <button className="app-pressable"
          onClick={() => router.back()}
          className="mt-5 text-white/30 text-sm font-bold"
        >
          ← Back
        </button>
      </div>
    )
  }

  // ── RESULT screen ──
  if (screen === 'result') {
    const grade = accuracy >= 90 ? '🏆 Perfect!' : accuracy >= 70 ? '⭐ Great job!' : accuracy >= 50 ? '👍 Good try!' : '💪 Keep going!'
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5 pb-24"
        style={{ background: 'linear-gradient(180deg, var(--theme-bg-tint, #1a0a2e) 0%, #0d0d1a 100%)' }}
      >
        <div className="text-7xl mb-4 animate-bounce">{accuracy >= 70 ? '🎉' : '💪'}</div>
        <h1 className="text-white text-3xl font-black mb-1">{grade}</h1>
        <p className="text-white/50 text-sm font-bold mb-8">{score}/{QUESTIONS_PER_ROUND} correct</p>

        {/* Stats */}
        <div className="w-full max-w-[320px] grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Score', value: `${score}/${QUESTIONS_PER_ROUND}`, icon: '🎯', color: '#5E5CE6' },
            { label: 'Stars', value: `+${starsEarned}⭐`, icon: '⭐', color: '#FFD60A' },
            { label: 'Best Streak', value: `${maxStreak}🔥`, icon: '🔥', color: '#FF6B35' },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl p-3 text-center"
              style={{ background: s.color + '18', border: `1px solid ${s.color}35` }}
            >
              <p className="font-black text-base" style={{ color: s.color }}>{s.value}</p>
              <p className="text-white/50 text-[10px] font-bold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Accuracy ring */}
        <div className="relative mb-8">
          <svg width="120" height="120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke={accuracy >= 70 ? '#30D158' : '#FF9F0A'} strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${accuracy * 3.14} 314`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-white font-black text-2xl">{accuracy}%</span>
            <span className="text-white/40 text-[10px] font-bold">accuracy</span>
          </div>
        </div>

        <button
          onClick={startGame}
          className="w-full max-w-[280px] py-4 rounded-2xl text-white font-black text-lg active:scale-95 transition-all mb-3 app-pressable"
          style={{ background: 'linear-gradient(135deg, #FF9F0A, #FF6B35)', boxShadow: '0 6px 24px rgba(255,159,10,0.4)' }}
        >
          Play Again 🔄
        </button>
        <button className="app-pressable"
          onClick={() => router.back()}
          className="w-full max-w-[280px] py-3.5 rounded-2xl font-black text-sm active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
        >
          ← Back Home
        </button>
      </div>
    )
  }

  // ── PLAYING screen ──
  if (!q) return null
  const progress = ((current) / QUESTIONS_PER_ROUND) * 100

  return (
    <div
      className="min-h-screen flex flex-col pb-24"
      style={{ background: 'linear-gradient(180deg, var(--theme-bg-tint, #1a0a2e) 0%, #0d0d1a 100%)' }}
    >
      {/* Header */}
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button className="app-pressable" onClick={() => setScreen('ready')} className="text-white/40 text-xl font-bold w-8">←</button>
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #FFD60A, #FF9F0A)' }}
            >
              <div className="absolute inset-0 shimmer" />
            </div>
          </div>
          <span className="text-white/60 text-xs font-black w-10 text-right">{current}/{QUESTIONS_PER_ROUND}</span>
        </div>

        {/* Score & streak row */}
        <div className="flex gap-2">
          <div className="rounded-2xl px-3 py-1.5 flex items-center gap-1.5" style={{ background: 'rgba(255,215,10,0.15)', border: '1px solid rgba(255,215,10,0.25)' }}>
            <span className="text-sm">⭐</span>
            <span className="text-yellow-300 font-black text-sm">{score * STARS_PER_CORRECT}</span>
          </div>
          {streak >= 2 && (
            <div className="rounded-2xl px-3 py-1.5 flex items-center gap-1.5 animate-pop" style={{ background: 'rgba(255,107,53,0.2)', border: '1px solid rgba(255,107,53,0.3)' }}>
              <span className="text-sm">🔥</span>
              <span className="text-orange-300 font-black text-sm">{streak}x</span>
            </div>
          )}
        </div>
      </div>

      {/* Emoji card */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 gap-6">
        <div
          className={`w-40 h-40 rounded-3xl flex items-center justify-center transition-all duration-300 ${feedback === 'correct' ? 'scale-110' : feedback === 'wrong' ? 'animate-shake' : ''}`}
          style={{
            background: feedback === 'correct'
              ? 'linear-gradient(135deg, #30D15840, #27AE7A40)'
              : feedback === 'wrong'
              ? 'linear-gradient(135deg, #FF453A30, #FF2D5530)'
              : q.modColor + '22',
            border: `3px solid ${feedback === 'correct' ? '#30D158' : feedback === 'wrong' ? '#FF453A' : q.modColor + '55'}`,
            boxShadow: feedback === 'correct'
              ? '0 0 40px rgba(48,209,88,0.4)'
              : feedback === 'wrong'
              ? '0 0 40px rgba(255,69,58,0.4)'
              : `0 8px 32px ${q.modColor}25`,
          }}
        >
          <span style={{ fontSize: 72 }}>{q.emoji}</span>
        </div>

        {q.hint && (
          <p className="text-white/40 text-sm font-bold text-center italic">"{q.hint}"</p>
        )}

        <p className="text-white/70 text-base font-black uppercase tracking-widest">What's this?</p>

        {/* Choices */}
        <div className="w-full max-w-[360px] grid grid-cols-2 gap-3">
          {q.choices.map((choice) => {
            const isSelected = selected === choice
            const isCorrect = choice === q.correct
            let bg = 'rgba(255,255,255,0.07)'
            let border = 'rgba(255,255,255,0.12)'
            let textColor = 'white'

            if (isSelected && feedback === 'correct') { bg = 'rgba(48,209,88,0.25)'; border = '#30D158'; textColor = '#30D158' }
            else if (isSelected && feedback === 'wrong') { bg = 'rgba(255,69,58,0.25)'; border = '#FF453A'; textColor = '#FF453A' }
            else if (selected && isCorrect && feedback === 'wrong') { bg = 'rgba(48,209,88,0.2)'; border = '#30D158'; textColor = '#30D158' }

            return (
              <button className="app-pressable"
                key={choice}
                onClick={() => handleChoice(choice)}
                disabled={!!selected}
                className="rounded-2xl py-4 px-3 font-black text-base transition-all active:scale-95 disabled:cursor-default"
                style={{
                  background: bg,
                  border: `2px solid ${border}`,
                  color: textColor,
                  boxShadow: isSelected ? `0 4px 20px ${border}40` : 'none',
                }}
              >
                {choice}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
