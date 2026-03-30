'use client'
import { useState, useCallback } from 'react'
import { TUTOR_TOPICS, QB } from '@/lib/modules'
import { getTutorFeedback, saveAISession } from '@/lib/api'

interface AiTutorProps {
  studentId?: string
  onComplete?: (stars: number) => void
}

type Screen = 'topics' | 'quiz' | 'results'

const QUESTIONS_PER_SESSION = 5

export default function AiTutor({ studentId, onComplete }: AiTutorProps) {
  const [screen, setScreen] = useState<Screen>('topics')
  const [topic, setTopic] = useState('')
  const [questions, setQuestions] = useState<any[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [level, setLevel] = useState(1)
  const [maxLevel, setMaxLevel] = useState(1)
  const [feedback, setFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const startQuiz = useCallback((topicId: string) => {
    const pool = QB[topicId] || []
    // Shuffle and pick
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    setQuestions(shuffled.slice(0, QUESTIONS_PER_SESSION))
    setTopic(topicId)
    setQIndex(0)
    setCorrect(0)
    setSelected(null)
    setLevel(1)
    setMaxLevel(1)
    setScreen('quiz')
  }, [])

  const handleAnswer = useCallback(async (choice: string) => {
    if (selected) return
    setSelected(choice)

    const q = questions[qIndex]
    const isCorrect = choice === q.a
    if (isCorrect) {
      setCorrect((c) => c + 1)
      const newLevel = Math.min(5, level + 1)
      setLevel(newLevel)
      setMaxLevel((ml) => Math.max(ml, newLevel))
    } else {
      setLevel((l) => Math.max(1, l - 1))
    }

    await new Promise((r) => setTimeout(r, 800))

    if (qIndex + 1 >= questions.length) {
      // End of quiz
      const totalCorrect = correct + (isCorrect ? 1 : 0)
      const stars = Math.round((totalCorrect / questions.length) * 3)

      setFeedbackLoading(true)
      try {
        const topicMeta = TUTOR_TOPICS.find((t) => t.id === topic)
        const fb = await getTutorFeedback({
          correct: totalCorrect,
          total: questions.length,
          topic: topicMeta?.label || topic,
          topicId: topic,
          maxLevel,
          ...(studentId ? { studentId } : {}),
        })
        setFeedback(fb.feedback)
      } catch {
        setFeedback('Amazing job! You are learning so fast! Keep it up! 🌟')
      } finally {
        setFeedbackLoading(false)
      }

      if (studentId) {
        try {
          await saveAISession({
            studentId,
            topic,
            correct: totalCorrect,
            total: questions.length,
            stars,
            maxLevel,
            accuracy: Math.round((totalCorrect / questions.length) * 100),
          })
        } catch {
          // ignore
        }
      }

      if (onComplete) onComplete(stars)
      setScreen('results')
    } else {
      setQIndex((i) => i + 1)
      setSelected(null)
    }
  }, [selected, questions, qIndex, correct, level, maxLevel, topic, studentId, onComplete])

  const currentQ = questions[qIndex]
  const topicMeta = TUTOR_TOPICS.find((t) => t.id === topic)
  const accuracy = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
  const stars = Math.round((correct / Math.max(questions.length, 1)) * 3)

  if (screen === 'topics') {
    return (
      <div className="space-y-4">
        <div className="text-white font-black text-xl text-center">Choose a Topic 📚</div>
        <div className="grid grid-cols-2 gap-3">
          {TUTOR_TOPICS.map((t) => (
            <button
              key={t.id}
              onClick={() => startQuiz(t.id)}
              className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95"
              style={{ background: `${t.color}22`, border: `2px solid ${t.color}44` }}
            >
              <span className="text-4xl">{t.emoji}</span>
              <span className="text-white font-black text-sm">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (screen === 'results') {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="text-7xl animate-bounce-slow">
          {stars >= 3 ? '🏆' : stars >= 2 ? '⭐' : '💪'}
        </div>
        <div className="text-white font-black text-2xl">Quiz Complete!</div>
        <div className="text-5xl font-black" style={{ color: '#F5B731' }}>
          {correct}/{questions.length}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <span key={i} className="text-3xl" style={{ opacity: i <= stars ? 1 : 0.3 }}>⭐</span>
          ))}
        </div>
        <div
          className="rounded-2xl p-4 text-center font-bold text-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
        >
          {feedbackLoading ? '...' : feedback}
        </div>

        {/* Stats */}
        <div className="w-full grid grid-cols-3 gap-2">
          {[
            { label: 'Accuracy', value: `${accuracy}%`, color: '#4CAF6A' },
            { label: 'Level', value: `Lv ${maxLevel}`, color: '#5B7FE8' },
            { label: 'Stars', value: `+${stars}⭐`, color: '#F5B731' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-3 flex flex-col items-center gap-1"
              style={{ background: `${stat.color}22` }}
            >
              <div className="font-black text-base" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-white/50 text-xs font-bold">{stat.label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setScreen('topics')}
          className="w-full py-4 rounded-2xl font-black text-white text-base transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #5B7FE8, #8B6CC1)' }}
        >
          Play Again! 🎮
        </button>
      </div>
    )
  }

  // Quiz screen
  if (!currentQ) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{topicMeta?.emoji}</span>
          <span className="text-white font-black text-sm">{topicMeta?.label}</span>
        </div>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i < qIndex ? '#4CAF6A' : i === qIndex ? '#5B7FE8' : 'rgba(255,255,255,0.2)'
              }}
            />
          ))}
        </div>
      </div>

      {/* Level bar */}
      <div>
        <div className="flex justify-between text-xs font-bold text-white/40 mb-1">
          <span>Level {level}/5</span>
          <span>⭐ {correct} correct</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(level / 5) * 100}%`, background: '#5B7FE8' }}
          />
        </div>
      </div>

      {/* Question */}
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: 'rgba(255,255,255,0.07)' }}
      >
        <div className="text-5xl mb-3">{currentQ.e}</div>
        <div className="text-white font-black text-lg">{currentQ.q}</div>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-2 gap-2">
        {currentQ.choices.map((choice: string) => {
          const isSelected = selected === choice
          const isCorrect = choice === currentQ.a
          let bg = 'rgba(255,255,255,0.08)'
          let border = 'rgba(255,255,255,0.15)'
          if (selected) {
            if (isCorrect) { bg = 'rgba(48,209,88,0.25)'; border = '#4CAF6A' }
            else if (isSelected) { bg = 'rgba(255,69,58,0.25)'; border = '#E05252' }
          }

          return (
            <button
              key={choice}
              onClick={() => handleAnswer(choice)}
              disabled={!!selected}
              className="py-3 px-4 rounded-2xl font-black text-white text-sm transition-all active:scale-95 disabled:cursor-not-allowed"
              style={{ background: bg, border: `2px solid ${border}` }}
            >
              {selected && isCorrect && '✅ '}
              {selected && isSelected && !isCorrect && '❌ '}
              {choice}
            </button>
          )
        })}
      </div>
    </div>
  )
}
