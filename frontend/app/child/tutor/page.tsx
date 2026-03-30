'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { saveAISession, getTutorFeedback, updateStudent, runAiSparkTask, logQuizResponse } from '@/lib/api'
import { TUTOR_TOPICS, QB } from '@/lib/modules'
import {
  speak, speakQuestion, speakEncouragement, speakAnswer,
  speakGreeting, speakTopicIntro, speakResults,
  setVoiceEnabled, isVoiceEnabled, stopSpeaking,
} from '@/lib/speech'
import { getTodayMood, gentleMode } from '@/lib/emotion'
import { Bot, Home, RotateCcw, Volume2, VolumeX, X, Mic } from 'lucide-react'
import ConfettiCanvas from '@/components/Confetti'
import { playCorrect, playWrong, playComplete, playBadge } from '@/lib/sounds'

type Phase = 'topics' | 'quiz' | 'results'

const TOTAL_Q = 10

// Encouraging phrases for correct answers
const CORRECT_PHRASES = [
  'Correct! Amazing! 🎉',
  'You got it! Superstar! ⭐',
  'Right! You are so smart! 🧠',
  'Perfect! Keep going! 🚀',
  'Yes! That is correct! 💪',
  'Wonderful! Great job! 🌟',
]

const WRONG_PHRASES = [
  'Nice try, sweet learner. The right answer is',
  'Almost there, you are doing great. The answer is',
  'That was brave to try. Let us learn it together: ',
  'Good effort. The answer was',
]

export default function TutorPage() {
  const router = useRouter()
  const user = useStore(s => s.user)
  const currentStudent = useStore(s => s.currentStudent)

  const student = currentStudent || user
  const mood = getTodayMood(student?.id)
  const isGentle = gentleMode(mood)

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
  const [voiceOn, setVoiceOn] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [hintSpark, setHintSpark] = useState('')
  const [hintText, setHintText] = useState('')
  const [hintBusy, setHintBusy] = useState(false)

  // Speak greeting on mount
  useEffect(() => {
    if (student?.name && phase === 'topics') {
      setTimeout(() => speakGreeting(student.name), 500)
    }
    return () => stopSpeaking()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleVoice = useCallback(() => {
    const newState = !voiceOn
    setVoiceOn(newState)
    setVoiceEnabled(newState)
    if (!newState) stopSpeaking()
  }, [voiceOn])

  const startQuiz = (topicId: string) => {
    const pool = QB[topicId] || []
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, TOTAL_Q)
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
    setHintSpark('')
    setHintText('')
    setPhase('quiz')

    // Voice: introduce the topic
    const topicInfo = TUTOR_TOPICS.find(t => t.id === topicId)
    if (topicInfo) {
      speakTopicIntro(topicInfo.label)
    }
  }

  const currentQ = questions[qIdx]

  useEffect(() => {
    setHintSpark('')
    setHintText('')
  }, [qIdx])

  const fetchTutorHint = async () => {
    if (!hintSpark.trim() || hintBusy) return
    setHintBusy(true)
    try {
      const topicLabel = TUTOR_TOPICS.find(t => t.id === topic)?.label || topic
      const res = await runAiSparkTask({
        taskId: 'tutor-hint-spark',
        spark: hintSpark.trim(),
        topic: topicLabel,
      })
      const h = typeof res?.hint === 'string' ? res.hint : ''
      setHintText(h)
      if (h && voiceOn) {
        speak(h, { rate: isGentle ? 0.68 : 0.82, pitch: isGentle ? 1.0 : 1.08 })
      }
    } catch {
      setHintText('No hint right now — try again soon!')
    } finally {
      setHintBusy(false)
    }
  }

  // Auto-read question when it changes
  useEffect(() => {
    if (phase === 'quiz' && currentQ && !answered) {
      const timer = setTimeout(() => {
        if (isGentle) speak(currentQ.q, { rate: 0.68, pitch: 1.0 })
        else speakQuestion(currentQ.q)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [qIdx, phase, currentQ, answered, isGentle])

  const handleAnswer = (choice: string) => {
    if (answered) return
    setSelected(choice)
    setAnswered(true)
    const isCorrect = choice === currentQ.a
    if (student?.id && topic) {
      void logQuizResponse({
        studentId: student.id,
        moduleId: `tutor:${topic}`,
        questionId: `q${qIdx}`,
        answer: choice,
        isCorrect,
      }).catch(() => {})
    }
    if (isCorrect) {
      playCorrect()
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

      // Voice: random encouragement
      const phrase = CORRECT_PHRASES[Math.floor(Math.random() * CORRECT_PHRASES.length)]
      speakEncouragement(phrase)
    } else {
      playWrong()
      setStreak(0)

      // Voice: say the correct answer
      const phrase = WRONG_PHRASES[Math.floor(Math.random() * WRONG_PHRASES.length)]
      if (isGentle) speak(`${phrase} ${currentQ.a}.`, { rate: 0.62, pitch: 0.98 })
      else speakAnswer(`${phrase} ${currentQ.a}.`)
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

  const [showConfetti, setShowConfetti] = useState(false)

  const finishQuiz = async () => {
    setPhase('results')
    const accuracy = Math.round((correct / TOTAL_Q) * 100)
    const stars = Math.round((correct / TOTAL_Q) * 3)

    if (accuracy >= 60) {
      playComplete()
      setShowConfetti(true)
    }

    // Voice: announce results
    speakResults(correct, TOTAL_Q)

    if (student) {
      setLoadingFeedback(true)
      try {
        const topicLabel = TUTOR_TOPICS.find(t => t.id === topic)?.label || topic
        const [feedbackRes, sessionRes] = await Promise.all([
          getTutorFeedback({
            correct,
            total: TOTAL_Q,
            topic: topicLabel,
            topicId: topic,
            studentId: student.id,
            maxLevel,
          }),
          saveAISession({ studentId: student.id, topic, correct, total: TOTAL_Q, stars, maxLevel, accuracy }),
          updateStudent(student.id, {
            stars: (student.stars || 0) + stars,
            aiSessions: (student.aiSessions || 0) + 1,
            aiBestLevel: Math.max(student.aiBestLevel || 1, maxLevel),
          }),
        ])
        setAiFeedback(feedbackRes.feedback)
        if (sessionRes?.newBadges?.length) {
          setNewBadges(sessionRes.newBadges)
          playBadge()
        }

        // Voice: read AI feedback
        if (feedbackRes.feedback) {
          setTimeout(() => speak(feedbackRes.feedback, { rate: 0.75 }), 1500)
        }
      } catch {
        const fallback = 'Amazing job completing your quiz today! You are a superstar learner!'
        setAiFeedback(fallback)
        setTimeout(() => speak(fallback, { rate: 0.75 }), 1000)
      } finally {
        setLoadingFeedback(false)
      }
    }
  }

  // Repeat current question
  const repeatQuestion = () => {
    if (currentQ) {
      if (isGentle) speak(currentQ.q, { rate: 0.68, pitch: 1.0 })
      else speakQuestion(currentQ.q)
    }
  }

  const accuracy = TOTAL_Q > 0 ? Math.round((correct / TOTAL_Q) * 100) : 0
  const stars = Math.round((correct / TOTAL_Q) * 3)

  // ─── Voice Toggle Button (shared) ────────────────────────────────
  const VoiceToggle = () => (
    <button
      onClick={toggleVoice}
      className="w-9 h-9 rounded-full flex items-center justify-center app-pressable transition-all"
      style={{
        background: voiceOn ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.15)',
        border: `1px solid ${voiceOn ? 'rgba(48,209,88,0.4)' : 'rgba(255,69,58,0.3)'}`,
      }}
      title={voiceOn ? 'Voice ON — tap to mute' : 'Voice OFF — tap to enable'}
    >
      {voiceOn ? <Volume2 size={16} color="#30D158" /> : <VolumeX size={16} color="#FF453A" />}
    </button>
  )

  // ─── TOPIC SELECTION PHASE ──────────────────────────────────────
  if (phase === 'topics') {
    return (
      <div className="min-h-screen flex flex-col app-container" style={{ background: 'var(--app-bg)' }}>
        <div className="flex items-center justify-between p-5 doodle-surface">
          <button onClick={() => { stopSpeaking(); router.push('/child') }} className="font-bold app-pressable sticker-bubble px-3 py-1.5" style={{ color: 'rgb(var(--foreground-rgb))' }}>← Back</button>
          <VoiceToggle />
        </div>
        <div className="px-5 pb-10">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3 inline-flex items-center justify-center w-20 h-20 sticker-bubble">
              <Bot size={38} color="var(--app-accent)" />
            </div>
            <div className="text-2xl font-black">AI Tutor Sparkle</div>
            <div className="app-muted font-bold">Choose a topic to practice!</div>
            {voiceOn && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black"
                style={{ background: 'rgba(48,209,88,0.12)', color: '#30D158', border: '1px solid rgba(48,209,88,0.3)' }}>
                <Volume2 size={10} /> Voice Guide Active
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TUTOR_TOPICS.map(t => (
              <button key={t.id}
                onClick={() => startQuiz(t.id)}
                className="rounded-2xl p-5 flex flex-col items-center gap-2 active:scale-95 transition-all app-pressable"
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

  // ─── RESULTS PHASE ──────────────────────────────────────────────
  if (phase === 'results') {
    const topicInfo = TUTOR_TOPICS.find(t => t.id === topic)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--app-bg)' }}>

        {/* Voice toggle */}
        <div className="absolute top-5 right-5">
          <VoiceToggle />
        </div>

        <ConfettiCanvas trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
        <div className="text-7xl mb-3 animate-bounce">
          {accuracy >= 80 ? '🏆' : accuracy >= 60 ? '🌟' : '💪'}
        </div>
        <div className="text-3xl font-black mb-1">
          {accuracy >= 80 ? 'Excellent!' : accuracy >= 60 ? 'Good Job!' : 'Keep Trying!'}
        </div>
        <div className="app-muted font-bold mb-6">{topicInfo?.label} Quiz Complete</div>

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
            <div className="flex items-center justify-center gap-2 text-sm font-bold app-muted">
              <div className="w-4 h-4 border-2 border-purple-400/40 border-t-purple-400 rounded-full animate-spin" />
              Sparkle is thinking...
            </div>
          ) : aiFeedback ? (
            <div className="rounded-xl p-3 text-sm font-bold text-center leading-relaxed relative" style={{ background: 'rgba(94,92,230,0.08)', border: '1px solid rgba(94,92,230,0.2)' }}>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full absolute -top-2 left-3"
                style={{ background: 'rgba(94,92,230,0.3)', color: '#A78BFA' }}>✨ AI Feedback</span>
              {aiFeedback}
              {voiceOn && (
                <button onClick={() => speak(aiFeedback, { rate: 0.75 })}
                  className="ml-2 inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full app-pressable"
                  style={{ background: 'rgba(48,209,88,0.15)', color: '#30D158' }}>
                  <Volume2 size={10} /> Listen
                </button>
              )}
            </div>
          ) : null}
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
          <button onClick={() => { stopSpeaking(); router.push('/child') }}
            className="flex-1 py-3 rounded-2xl font-black bg-white/20 inline-flex items-center justify-center gap-2 app-pressable">
            <Home size={16} /> Home
          </button>
        </div>
      </div>
    )
  }

  // ─── QUIZ PHASE ─────────────────────────────────────────────────
  const topicInfo = TUTOR_TOPICS.find(t => t.id === topic)
  const choices = currentQ?.choices || []

  return (
    <div className="min-h-screen flex flex-col app-container" style={{ background: 'var(--app-bg)' }}>
      {/* HUD */}
      <div className="p-4 flex items-center gap-3">
        <button onClick={() => { stopSpeaking(); setPhase('topics') }} className="font-bold app-pressable sticker-bubble w-9 h-9 flex items-center justify-center" style={{ color: 'rgb(var(--foreground-rgb))' }}><X size={16} /></button>
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
        <VoiceToggle />
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
        <div className="rounded-full h-2" style={{ background: 'rgba(120,120,140,0.18)' }}>
          <div className="h-2 rounded-full transition-all"
            style={{ width: `${(qIdx / TOTAL_Q) * 100}%`, background: topicInfo?.color || '#5B7FE8' }} />
        </div>
      </div>

      {/* Sparkle speech bubble with repeat button */}
      <div className="px-4 mb-4 flex gap-3 items-start">
        <div className="text-4xl sticker-bubble w-12 h-12 flex items-center justify-center">
          <Bot size={24} color="var(--app-accent)" />
        </div>
        <div className="flex-1 rounded-2xl rounded-tl-none p-3 relative" style={{ background: 'var(--app-surface)', border: '1px solid rgba(120,120,140,0.2)' }}>
          <div className="font-bold text-sm" style={{ color: 'rgba(32,36,52,0.9)' }}>
            {answered
              ? selected === currentQ?.a ? '🎉 Correct! You got it!' : `❌ The answer was "${currentQ?.a}"`
              : 'Think carefully and choose the right answer! 🤔'}
          </div>
          {/* Repeat question button */}
          {!answered && voiceOn && (
            <button
              onClick={repeatQuestion}
              className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center app-pressable"
              style={{ background: 'rgba(94,92,230,0.2)', border: '1px solid rgba(94,92,230,0.3)' }}
              title="Hear question again"
            >
              <Volume2 size={12} color="#5E5CE6" />
            </button>
          )}
        </div>
      </div>

      {/* Question card */}
      <div className="px-4 mb-5">
        <div className="rounded-2xl p-5 text-center relative" style={{ background: 'var(--app-surface)', border: '1px solid rgba(120,120,140,0.2)' }}>
          <div className="text-5xl mb-3">{currentQ?.e}</div>
          <div className="font-black text-lg" style={{ color: 'rgb(32,36,52)' }}>{currentQ?.q}</div>

          {/* Listen button on question card */}
          {voiceOn && (
            <button
              onClick={repeatQuestion}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black app-pressable"
              style={{ background: 'rgba(48,209,88,0.12)', color: '#30D158', border: '1px solid rgba(48,209,88,0.25)' }}
            >
              <Volume2 size={12} /> Listen Again
            </button>
          )}
        </div>
      </div>

      {!answered && (
        <div className="px-4 mb-4 rounded-2xl p-3" style={{ background: 'rgba(94,92,230,0.06)', border: '1px solid rgba(94,92,230,0.18)' }}>
          <div className="text-[11px] font-black app-muted mb-2">Need a tiny nudge? Add one short line (your words only):</div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <input
              value={hintSpark}
              onChange={(e) => setHintSpark(e.target.value)}
              maxLength={80}
              placeholder='e.g. "The big number confuses me"'
              className="flex-1 min-w-0 app-field text-xs font-bold"
            />
            <button
              type="button"
              onClick={fetchTutorHint}
              disabled={hintBusy || !hintSpark.trim()}
              className="min-h-11 px-4 rounded-xl text-xs font-black app-pressable shrink-0"
              style={{
                background: 'rgba(94,92,230,0.2)',
                color: '#5E5CE6',
                border: '1px solid rgba(94,92,230,0.35)',
                opacity: hintBusy || !hintSpark.trim() ? 0.5 : 1,
              }}
            >
              {hintBusy ? '…' : 'Hint ✨'}
            </button>
          </div>
          {hintText ? (
            <div className="mt-2 text-xs font-bold leading-relaxed" style={{ color: 'rgb(32,36,52)' }}>
              💡 {hintText}
            </div>
          ) : null}
        </div>
      )}

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
              <button key={choice}
                onClick={() => handleAnswer(choice)}
                disabled={answered}
                className="rounded-2xl p-4 text-center active:scale-95 transition-all app-pressable"
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
