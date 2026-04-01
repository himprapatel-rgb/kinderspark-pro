'use client'
import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { saveAISession, updateStudent } from '@/lib/api'
import { RotateCcw } from 'lucide-react'
import { AppIcon } from '@/components/icons'
import { playCorrect, playWrong, playComplete, playTap, playStar } from '@/lib/sounds'

const ConfettiCanvas = dynamic(() => import('@/components/Confetti'), { ssr: false })
import { speak } from '@/lib/speech'

// ── Counting Game ───────────────────────────────────────────────────────────
// Children count objects (emojis) and tap the correct number.
// Difficulty adapts: start with 1-5, ramp up to 1-10, then 1-20.

type Phase = 'ready' | 'playing' | 'results'

const OBJECTS = [
  { emoji: '🍎', name: 'apples' },
  { emoji: '⭐', name: 'stars' },
  { emoji: '🐟', name: 'fish' },
  { emoji: '🌸', name: 'flowers' },
  { emoji: '🦋', name: 'butterflies' },
  { emoji: '🐣', name: 'chicks' },
  { emoji: '🎈', name: 'balloons' },
  { emoji: '🍪', name: 'cookies' },
  { emoji: '🐞', name: 'ladybugs' },
  { emoji: '🌟', name: 'stars' },
  { emoji: '🐶', name: 'puppies' },
  { emoji: '🧁', name: 'cupcakes' },
]

const ROUNDS = 10
const STARS_PER_CORRECT = 2

function generateQuestion(maxNum: number) {
  const obj = OBJECTS[Math.floor(Math.random() * OBJECTS.length)]
  const count = Math.floor(Math.random() * maxNum) + 1

  // Generate 3 wrong options + correct
  const options = new Set<number>([count])
  while (options.size < 4) {
    const wrong = Math.max(1, count + Math.floor(Math.random() * 5) - 2)
    if (wrong !== count && wrong > 0 && wrong <= maxNum + 3) options.add(wrong)
  }

  return {
    emoji: obj.emoji,
    name: obj.name,
    count,
    options: Array.from(options).sort(() => Math.random() - 0.5),
  }
}

export default function CountingGame() {
  const router = useRouter()
  const user = useAppStore(s => s.user)
  const currentStudent = useAppStore(s => s.currentStudent)
  const student = currentStudent || user

  const [phase, setPhase] = useState<Phase>('ready')
  const [questions, setQuestions] = useState<ReturnType<typeof generateQuestion>[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tappedItems, setTappedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!student) router.push('/')
  }, [student])

  const startGame = useCallback(() => {
    // First 4 questions: 1-5, next 3: 1-8, last 3: 1-12
    const qs: ReturnType<typeof generateQuestion>[] = []
    for (let i = 0; i < 4; i++) qs.push(generateQuestion(5))
    for (let i = 0; i < 3; i++) qs.push(generateQuestion(8))
    for (let i = 0; i < 3; i++) qs.push(generateQuestion(12))
    setQuestions(qs)
    setQIdx(0)
    setScore(0)
    setSelected(null)
    setStreak(0)
    setMaxStreak(0)
    setTappedItems(new Set())
    setPhase('playing')
    speak('Let\'s count! How many do you see?', { rate: 0.8 })
  }, [])

  const handleAnswer = (num: number) => {
    if (selected !== null) return
    setSelected(num)
    const correct = questions[qIdx].count

    if (num === correct) {
      playCorrect()
      setScore(s => s + 1)
      const newStreak = streak + 1
      setStreak(newStreak)
      setMaxStreak(ms => Math.max(ms, newStreak))
      speak(`Yes! ${correct} ${questions[qIdx].name}!`, { rate: 0.85 })
    } else {
      playWrong()
      setStreak(0)
      speak(`Not quite. There are ${correct} ${questions[qIdx].name}.`, { rate: 0.8 })
    }

    setTimeout(() => {
      setSelected(null)
      setTappedItems(new Set())
      if (qIdx + 1 >= ROUNDS) {
        finishGame(num === correct ? score + 1 : score)
      } else {
        setQIdx(i => i + 1)
      }
    }, 1500)
  }

  const handleItemTap = (idx: number) => {
    if (selected !== null) return
    playTap()
    setTappedItems(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const finishGame = async (finalScore: number) => {
    setPhase('results')
    const accuracy = Math.round((finalScore / ROUNDS) * 100)

    if (accuracy >= 60) {
      playComplete()
      setShowConfetti(true)
    }

    speak(
      accuracy >= 80 ? `Amazing! You got ${finalScore} out of ${ROUNDS}!` :
      accuracy >= 50 ? `Good job! You got ${finalScore} right!` :
      `Keep practicing! You got ${finalScore} right.`,
      { rate: 0.8 }
    )

    if (!student?.id) return
    setSaving(true)
    const starsEarned = finalScore * STARS_PER_CORRECT
    try {
      await Promise.all([
        saveAISession({
          studentId: student.id,
          topic: 'Counting',
          correct: finalScore,
          total: ROUNDS,
          stars: starsEarned,
          maxLevel: accuracy >= 90 ? 5 : accuracy >= 70 ? 4 : accuracy >= 50 ? 3 : 2,
          accuracy,
        }),
        updateStudent(student.id, {
          stars: (student.stars || 0) + starsEarned,
        }),
      ])
    } catch { /* best effort */ }
    setSaving(false)
  }

  const q = questions[qIdx]
  const starsEarned = score * STARS_PER_CORRECT
  const accuracy = ROUNDS > 0 ? Math.round((score / ROUNDS) * 100) : 0

  // ── READY ──
  if (phase === 'ready') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 pb-24 animate-page-enter"
        style={{ background: 'linear-gradient(180deg, #FFF7E6, var(--app-bg))' }}>
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-6 animate-bounce-subtle sticker-bubble"
          style={{ background: 'linear-gradient(135deg, #4CAF6A, #34C759)', boxShadow: '0 8px 32px rgba(76,175,106,0.45)' }}>
          🔢
        </div>
        <h1 className="text-3xl font-black mb-2">Counting Fun</h1>
        <p className="text-base font-bold app-muted mb-2 text-center">Count the objects and pick the right number!</p>

        <div className="flex gap-4 mb-10 mt-4">
          {[
            { label: `${ROUNDS} rounds`, icon: '🎯' },
            { label: `${STARS_PER_CORRECT}⭐ each`, icon: '⭐' },
            { label: 'Adaptive', icon: '📈' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl px-3 py-2 flex flex-col items-center gap-1"
              style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
              <span className="text-xl">{s.icon}</span>
              <span className="text-[11px] font-bold app-muted">{s.label}</span>
            </div>
          ))}
        </div>

        <button onClick={startGame}
          className="w-full max-w-[280px] py-5 rounded-3xl font-black text-xl active:scale-95 transition-all relative overflow-hidden app-pressable animate-sparkle-on-hover"
          style={{ background: 'linear-gradient(135deg, #4CAF6A, #34C759)', boxShadow: '0 8px 32px rgba(76,175,106,0.5)', color: '#fff' }}>
          <div className="absolute inset-0 shimmer" />
          <span className="relative">Count! 🔢</span>
        </button>
        <button onClick={() => router.back()} className="mt-5 text-sm font-bold app-muted app-pressable">← Back</button>
      </div>
    )
  }

  // ── RESULTS ──
  if (phase === 'results') {
    const grade = accuracy >= 90 ? '🏆 Perfect!' : accuracy >= 70 ? '⭐ Great job!' : accuracy >= 50 ? '👍 Good try!' : '💪 Keep going!'
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 pb-24 animate-page-enter"
        style={{ background: 'linear-gradient(180deg, #E8F8ED, var(--app-bg))' }}>
        <ConfettiCanvas trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
        <div className="text-7xl mb-4 animate-bounce">{accuracy >= 70 ? '🎉' : '💪'}</div>
        <h1 className="text-3xl font-black mb-1">{grade}</h1>
        <p className="text-sm font-bold app-muted mb-8">{score}/{ROUNDS} correct</p>

        <div className="w-full max-w-[320px] grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Score', value: `${score}/${ROUNDS}`, color: '#4CAF6A' },
            { label: 'Stars', value: `+${starsEarned}⭐`, color: '#F5B731' },
            { label: 'Streak', value: `${maxStreak}🔥`, color: '#D4881A' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-3 text-center"
              style={{ background: s.color + '18', border: `1px solid ${s.color}33` }}>
              <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[11px] font-bold app-muted">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 w-full max-w-[320px]">
          <button onClick={() => { setPhase('ready'); setShowConfetti(false) }}
            className="flex-1 py-3 rounded-2xl font-black inline-flex items-center justify-center gap-2 app-pressable"
            style={{ background: '#4CAF6A', color: '#fff' }}>
            <RotateCcw size={16} /> Again
          </button>
          <button onClick={() => router.push('/child')}
            className="flex-1 py-3 rounded-2xl font-black inline-flex items-center justify-center gap-2 app-pressable"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <AppIcon name="home" size="sm" roleTone="child" decorative /> Home
          </button>
        </div>
      </div>
    )
  }

  // ── PLAYING ──
  if (!q) return null
  const pct = Math.round(((qIdx + 1) / ROUNDS) * 100)

  return (
    <div className="min-h-screen flex flex-col app-container" style={{ background: 'var(--app-bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => router.push('/child')} className="font-bold app-pressable sticker-bubble px-3 py-1.5">← Back</button>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold app-muted mb-1">
            <span>Round {qIdx + 1}/{ROUNDS}</span>
            <span>{score} correct {streak > 1 ? `🔥${streak}` : ''}</span>
          </div>
          <div className="rounded-full h-2" style={{ background: 'rgba(120,120,140,0.18)' }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: '#4CAF6A' }} />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <p className="text-lg font-black mb-4 text-center" style={{ color: 'rgb(var(--foreground-rgb))' }}>
          How many {q.name}? 🤔
        </p>

        {/* Objects grid — tap to count */}
        <div className="w-full max-w-sm rounded-3xl p-5 mb-6 animate-page-enter"
          style={{ background: 'rgba(76,175,106,0.08)', border: '2px solid rgba(76,175,106,0.2)' }}>
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: q.count }, (_, i) => (
              <button
                key={i}
                onClick={() => handleItemTap(i)}
                className="text-4xl transition-all app-pressable"
                style={{
                  transform: tappedItems.has(i) ? 'scale(1.25)' : 'scale(1)',
                  opacity: tappedItems.has(i) ? 1 : 0.75,
                  filter: tappedItems.has(i) ? 'drop-shadow(0 0 8px rgba(76,175,106,0.5))' : 'none',
                }}
              >
                {q.emoji}
              </button>
            ))}
          </div>
          {tappedItems.size > 0 && (
            <div className="text-center mt-3 text-sm font-black" style={{ color: '#4CAF6A' }}>
              You counted: {tappedItems.size}
            </div>
          )}
        </div>

        {/* Answer options */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {q.options.map((opt) => {
            const isSelected = selected === opt
            const isCorrect = opt === q.count
            const showResult = selected !== null

            let bg = 'var(--app-surface)'
            let border = '2px solid var(--app-border)'
            let textColor = 'rgb(var(--foreground-rgb))'

            if (showResult && isCorrect) {
              bg = 'rgba(76,175,106,0.2)'
              border = '2px solid #4CAF6A'
              textColor = '#2F9E52'
            } else if (showResult && isSelected && !isCorrect) {
              bg = 'rgba(224,82,82,0.15)'
              border = '2px solid #E05252'
              textColor = '#E05252'
            }

            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={selected !== null}
                className="py-4 rounded-2xl font-black text-2xl transition-all app-pressable disabled:cursor-default"
                style={{ background: bg, border, color: textColor }}
              >
                {opt}
                {showResult && isCorrect && ' ✓'}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
