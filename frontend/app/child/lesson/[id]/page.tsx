'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useParams } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { updateProgress, updateStudent, getSyllabus, getProgress } from '@/lib/api'
import { MODS, type Module } from '@/lib/modules'
import {
  orderedPathMods,
  getNextModuleAfter,
  getRecommendedNextModule,
  touchPracticeTimestamp,
  estimateLessonMinutes,
} from '@/lib/learnPath'
import { speak } from '@/lib/speech'
import { RotateCcw, Volume2, Map } from 'lucide-react'
import { AppIcon } from '@/components/icons'
import { playComplete, playSwipe, playStar } from '@/lib/sounds'

const ConfettiCanvas = dynamic(() => import('@/components/Confetti'), { ssr: false })
import { useTranslation } from '@/hooks/useTranslation'

export default function LessonPage() {
  const router = useRouter()
  const params = useParams()
  const rawId = params?.id as string || ''
  const user = useStore(s => s.user)
  const currentStudent = useStore(s => s.currentStudent)

  const student = currentStudent || user
  const { t } = useTranslation()

  const [items, setItems] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#5B7FE8')
  const [icon, setIcon] = useState('📖')
  const [type, setType] = useState<string>('items')
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confetti, setConfetti] = useState(false)
  const [nextModule, setNextModule] = useState<Module | null>(null)

  const isSyllabus = rawId.startsWith('syl_')
  const moduleId = isSyllabus ? rawId : rawId

  useEffect(() => {
    if (!student) { router.push('/'); return }
    loadLesson()
  }, [rawId, student])

  const loadLesson = async () => {
    if (isSyllabus) {
      const syllabusId = rawId.replace('syl_', '')
      try {
        const syl = await getSyllabus(syllabusId)
        setItems(syl.items.map((item: any) => ({ w: item.word, e: item.emoji, hint: item.hint })))
        setTitle(syl.title)
        setColor(syl.color)
        setIcon(syl.icon)
        setType('items')
      } catch {
        router.push('/child')
      }
    } else {
      const mod = MODS.find(m => m.id === rawId)
      if (!mod) { router.push('/child'); return }
      setItems(mod.items)
      setTitle(mod.title)
      setColor(mod.color)
      setIcon(mod.icon)
      setType(mod.type)
    }
    setLoading(false)
  }

  const total = items.length
  const card = items[idx]
  const pct = total > 0 ? Math.round(((idx + 1) / total) * 100) : 0
  const sessionEst = estimateLessonMinutes(total)
  const cardsToGo = Math.max(0, total - idx - 1)

  const handleNext = async () => {
    if (idx < total - 1) {
      playSwipe()
      setIdx(i => i + 1)
      // Update progress
      if (student) {
        await updateProgress(student.id, moduleId, idx + 1, { lessonTotal: total }).catch(() => {})
      }
    } else {
      // Finished
      playComplete()
      setDone(true)
      setConfetti(true)
      if (student) {
        playStar()
        await updateProgress(student.id, moduleId, total, { lessonTotal: total }).catch(() => {})
        const newStars = (student.stars || 0) + 10
        const newStreak = (student.streak || 0) + 1
        await updateStudent(student.id, { stars: newStars, streak: newStreak }).catch(() => {})
        if (!isSyllabus) touchPracticeTimestamp(moduleId)
      }
    }
  }

  const handlePrev = () => {
    if (idx > 0) setIdx(i => i - 1)
  }

  useEffect(() => {
    if (!done || !student) return
    const run = async () => {
      try {
        const list = await getProgress(student.id)
        const map: Record<string, number> = {}
        ;(list || []).forEach((p: any) => {
          map[p.moduleId] = p.cards
        })
        const p = orderedPathMods()
        if (isSyllabus) {
          setNextModule(getRecommendedNextModule(p, map))
        } else {
          setNextModule(getNextModuleAfter(p, moduleId, map, true))
        }
      } catch {
        setNextModule(null)
      }
    }
    run()
  }, [done, student, isSyllabus, moduleId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-page">
        <div className="text-6xl animate-bounce">{icon}</div>
      </div>
    )
  }

  if (done) {
    const prevStreak = Number((student as any)?.streak ?? 0)
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5 pb-10"
        style={{ background: 'var(--app-bg)' }}
      >
        <ConfettiCanvas trigger={confetti} onComplete={() => setConfetti(false)} />
        <div className="text-7xl mb-3 animate-bounce">🎉</div>
        <div className="text-2xl font-black mb-1 text-center" style={{ color: 'rgb(var(--foreground-rgb))' }}>
          {t('learn_complete_title')}
        </div>
        <div className="text-base font-black mb-1" style={{ color }}>
          +10 ⭐ · {t('done')} ✓
        </div>
        <div className="app-muted font-bold text-center text-sm mb-1 max-w-xs">{title}</div>
        {student != null && (
          <div className="text-xs font-black mb-5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(245,166,35,0.15)', color: '#D4881A' }}>
            🔥 {prevStreak + 1}d · {t('learn_complete_streak')}
          </div>
        )}
        {student == null && <div className="mb-5" />}
        <div className="flex flex-col gap-2.5 w-full max-w-sm">
          {nextModule && (
            <button
              type="button"
              onClick={() => router.push(`/child/lesson/${nextModule.id}`)}
              className="w-full min-h-11 py-3.5 rounded-2xl font-black text-sm inline-flex items-center justify-center gap-2 app-pressable animate-sparkle-on-hover"
              style={{
                background: 'linear-gradient(135deg, var(--app-gold), var(--app-warning))',
                color: '#2B1F10',
                boxShadow: '0 6px 20px rgba(245,183,49,0.35)',
              }}
            >
              <AppIcon name="aiTutor" size={18} roleTone="child" decorative />
              {t('learn_next_lesson')}: {nextModule.icon} {nextModule.title}
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push('/child/learn')}
              className="flex-1 min-h-11 py-3 rounded-2xl font-black text-sm inline-flex items-center justify-center gap-2 app-pressable"
              style={{ background: 'rgba(94,92,230,0.18)', color: '#5B7FE8', border: '1px solid rgba(94,92,230,0.35)' }}
            >
              <Map size={16} /> {t('learn_path_title').split(' ')[0]}…
            </button>
            <button
              type="button"
              onClick={() => router.push('/child')}
              className="flex-1 min-h-11 py-3 rounded-2xl font-black text-sm inline-flex items-center justify-center gap-2 app-pressable bg-white/12"
            >
              <AppIcon name="home" size="sm" roleTone="child" decorative /> Home
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setDone(false)
              setIdx(0)
            }}
            className="w-full py-2.5 rounded-xl font-bold text-sm app-pressable inline-flex items-center justify-center gap-2 app-muted"
            style={{ background: 'var(--app-surface-soft)' }}
          >
            <RotateCcw size={16} /> Play Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col app-page app-container">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 doodle-surface">
        <button onClick={() => router.push('/child')} className="font-bold app-pressable sticker-bubble px-3 py-1.5" style={{ color: 'rgb(var(--foreground-rgb))' }}>← Back</button>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs font-bold app-muted mb-0.5 gap-2">
            <span className="truncate">{title}</span>
            <span className="shrink-0">{idx + 1}/{total}</span>
          </div>
          <p className="text-[10px] font-bold app-muted mb-1">
            {t('learn_min_estimate').replace('{n}', String(sessionEst))}
            {total > 0 && idx < total ? ` · ${t('learn_cards_left').replace('{n}', String(cardsToGo))}` : ''}
          </p>
          <div className="rounded-full h-2" style={{ background: 'rgba(120,120,140,0.18)' }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
      </div>

      {/* Card content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {card && <LessonCard card={card} type={type} color={color} onSpeak={() => speak(card.w)} />}
      </div>

      {/* Navigation */}
      <div className="p-6 space-y-3">
        {/* Main next/finish button — big and obvious */}
        {idx < total - 1 ? (
          <button onClick={handleNext} disabled={!card}
            className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-40 app-pressable flex items-center justify-center gap-2 animate-sparkle-on-hover"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#fff', boxShadow: `0 4px 16px ${color}40` }}>
            Next Card → <span className="text-xs opacity-70">{idx + 1}/{total}</span>
          </button>
        ) : (
          <button onClick={handleNext}
            className="w-full py-5 rounded-2xl font-black text-lg active:scale-95 transition-all app-pressable flex items-center justify-center gap-2 animate-sparkle-on-hover"
            style={{ background: `linear-gradient(135deg, var(--app-success), #5FBF7F)`, color: '#fff', boxShadow: '0 4px 20px rgba(43,165,94,0.35)' }}>
            🎉 All Done! Earn Stars
          </button>
        )}

        {/* Secondary controls row */}
        <div className="flex items-center justify-between">
          <button onClick={handlePrev} disabled={idx === 0}
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl disabled:opacity-20 active:scale-95 transition-all app-pressable"
            style={{ background: 'rgba(120,120,140,0.08)', color: 'var(--app-text-muted)' }}>
            ←
          </button>

          <button onClick={() => speak(card?.w || '')}
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl active:scale-95 transition-all app-pressable sticker-bubble"
            style={{ background: color + '18', border: `2px solid ${color}33` }}>
            <Volume2 size={22} color={color} />
          </button>

          <div className="w-12 text-center text-xs font-black app-muted">{idx + 1}/{total}</div>
        </div>
      </div>
    </div>
  )
}

function LessonCard({ card, type, color, onSpeak }: any) {
  return (
    <div className="w-full max-w-sm rounded-3xl p-8 text-center animate-bounce-in"
      style={{ background: color + '15', border: `2px solid ${color}33` }}>
      {type === 'numbers' && (
        <>
          <div className="text-8xl font-black text-white mb-2">{card.e}</div>
          <div className="text-4xl font-black text-white mb-4">{card.w}</div>
          {card.hint && <div className="app-muted font-bold">{card.hint}</div>}
        </>
      )}
      {type === 'letters' && (
        <>
          <div className="text-9xl font-black text-white mb-2" style={{ color }}>{card.w}</div>
          <div className="text-5xl mb-2">{card.e}</div>
          {card.hint && <div className="app-muted font-bold text-sm">{card.hint}</div>}
        </>
      )}
      {type === 'words' && (
        <>
          <div className="text-6xl mb-3">{card.e}</div>
          <div className="text-3xl font-black text-white mb-3">{card.w}</div>
          <div className="flex gap-2 justify-center mb-3">
            {card.w.split('').map((l: string, i: number) => (
              <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center font-black"
                style={{ background: color }}>
                {l}
              </div>
            ))}
          </div>
          {card.hint && <div className="app-muted font-bold text-sm italic">"{card.hint}"</div>}
        </>
      )}
      {type === 'colors' && (
        <>
          <div className="w-24 h-24 rounded-full mx-auto mb-4 shadow-lg"
            style={{ background: getColorHex(card.w) }} />
          <div className="text-3xl font-black text-white mb-2">{card.w}</div>
          {card.hint && <div className="app-muted font-bold text-sm">{card.hint}</div>}
        </>
      )}
      {type === 'items' && (
        <>
          <div className="text-8xl mb-4">{card.e}</div>
          <div className="text-3xl font-black text-white mb-2">{card.w}</div>
          {card.hint && <div className="app-muted font-bold text-sm">{card.hint}</div>}
        </>
      )}
    </div>
  )
}

function getColorHex(name: string): string {
  const map: Record<string, string> = {
    Red: '#E05252', Blue: '#0A84FF', Green: '#4CAF6A', Yellow: '#F5B731',
    Orange: '#F5A623', Purple: '#8B6CC1', Pink: '#FF375F', Brown: '#A0522D',
    Black: '#1a1a1a', White: '#ffffff',
  }
  return map[name] || '#5B7FE8'
}

