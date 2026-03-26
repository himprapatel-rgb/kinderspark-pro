'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAppStore as useStore } from '@/store/appStore'
import { updateProgress, updateStudent, getSyllabus } from '@/lib/api'
import { MODS } from '@/lib/modules'
import { speak } from '@/lib/speech'

export default function LessonPage() {
  const router = useRouter()
  const params = useParams()
  const rawId = params?.id as string || ''
  const user = useStore(s => s.user)
  const currentStudent = useStore(s => s.currentStudent)

  const student = currentStudent || user

  const [items, setItems] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#5B7FE8')
  const [icon, setIcon] = useState('📖')
  const [type, setType] = useState<string>('items')
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confetti, setConfetti] = useState(false)

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

  const card = items[idx]
  const total = items.length
  const pct = total > 0 ? Math.round(((idx + 1) / total) * 100) : 0

  const handleNext = async () => {
    if (idx < total - 1) {
      setIdx(i => i + 1)
      // Update progress
      if (student) {
        await updateProgress(student.id, moduleId, idx + 1).catch(() => {})
      }
    } else {
      // Finished
      setDone(true)
      setConfetti(true)
      if (student) {
        await updateProgress(student.id, moduleId, total).catch(() => {})
        const newStars = (student.stars || 0) + 10
        const newStreak = (student.streak || 0) + 1
        await updateStudent(student.id, { stars: newStars, streak: newStreak }).catch(() => {})
      }
    }
  }

  const handlePrev = () => {
    if (idx > 0) setIdx(i => i - 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-page">
        <div className="text-6xl animate-bounce">{icon}</div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: 'var(--app-bg)' }}>
        {confetti && <Confetti />}
        <div className="text-7xl mb-4 animate-bounce">🎉</div>
        <div className="text-3xl font-black mb-2" style={{ color: 'rgb(var(--foreground-rgb))' }}>Amazing!</div>
        <div className="text-white/70 font-bold text-center mb-6">
          You completed {title}!<br />+10 ⭐ stars earned!
        </div>
        <div className="flex gap-3">
          <button className="app-pressable" onClick={() => { setDone(false); setIdx(0) }}
            className="px-6 py-3 rounded-2xl font-black"
            style={{ background: color }}>
            Play Again
          </button>
          <button className="app-pressable" onClick={() => router.push('/child')}
            className="px-6 py-3 rounded-2xl font-black bg-white/20">
            Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col app-page app-container">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => router.push('/child')} className="text-white/85 font-bold app-pressable">← Back</button>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold app-muted mb-1">
            <span>{title}</span>
            <span>{idx + 1}/{total}</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
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
            className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-40 app-pressable flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#fff', boxShadow: `0 4px 16px ${color}40` }}>
            Next Card → <span className="text-xs opacity-70">{idx + 1}/{total}</span>
          </button>
        ) : (
          <button onClick={handleNext}
            className="w-full py-5 rounded-2xl font-black text-lg active:scale-95 transition-all app-pressable flex items-center justify-center gap-2"
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
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl active:scale-95 transition-all app-pressable"
            style={{ background: color + '18', border: `2px solid ${color}33` }}>
            🔊
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
          {card.hint && <div className="text-white/60 font-bold">{card.hint}</div>}
        </>
      )}
      {type === 'letters' && (
        <>
          <div className="text-9xl font-black text-white mb-2" style={{ color }}>{card.w}</div>
          <div className="text-5xl mb-2">{card.e}</div>
          {card.hint && <div className="text-white/60 font-bold text-sm">{card.hint}</div>}
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
          {card.hint && <div className="text-white/60 font-bold text-sm italic">"{card.hint}"</div>}
        </>
      )}
      {type === 'colors' && (
        <>
          <div className="w-24 h-24 rounded-full mx-auto mb-4 shadow-lg"
            style={{ background: getColorHex(card.w) }} />
          <div className="text-3xl font-black text-white mb-2">{card.w}</div>
          {card.hint && <div className="text-white/60 font-bold text-sm">{card.hint}</div>}
        </>
      )}
      {type === 'items' && (
        <>
          <div className="text-8xl mb-4">{card.e}</div>
          <div className="text-3xl font-black text-white mb-2">{card.w}</div>
          {card.hint && <div className="text-white/60 font-bold text-sm">{card.hint}</div>}
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

function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => i)
  const colors = ['#F5B731', '#F5A623', '#5B7FE8', '#4CAF6A', '#8B6CC1', '#E05252']
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map(i => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            background: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  )
}
