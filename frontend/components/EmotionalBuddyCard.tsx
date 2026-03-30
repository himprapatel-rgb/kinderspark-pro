'use client'
import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useTranslation } from '@/hooks/useTranslation'
import { speakEncouragement } from '@/lib/speech'
import { Mood, getTodayMood, setTodayMood } from '@/lib/emotion'

const MOODS: Array<{ id: Mood; emoji: string }> = [
  { id: 'happy', emoji: '😊' },
  { id: 'excited', emoji: '🤩' },
  { id: 'okay', emoji: '🙂' },
  { id: 'sad', emoji: '😔' },
  { id: 'tired', emoji: '🥱' },
]

export default function EmotionalBuddyCard() {
  const { t } = useTranslation()
  const student = useAppStore((s) => s.currentStudent || s.user)
  const [savedMood, setSavedMood] = useState<Mood | null>(() => {
    return getTodayMood(student?.id)
  })

  const line = useMemo(() => {
    switch (savedMood) {
      case 'happy': return t('child_feel_line_happy')
      case 'excited': return t('child_feel_line_excited')
      case 'okay': return t('child_feel_line_okay')
      case 'sad': return t('child_feel_line_sad')
      case 'tired': return t('child_feel_line_tired')
      default: return t('child_feel_prompt')
    }
  }, [savedMood, t])

  const chooseMood = (m: Mood) => {
    setSavedMood(m)
    if (student?.id) setTodayMood(student.id, m)
    speakEncouragement(
      m === 'sad' || m === 'tired'
        ? t('child_feel_voice_soft')
        : t('child_feel_voice_bright')
    )
  }

  return (
    <section
      className="rounded-3xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(76,175,106,0.14), rgba(91,127,232,0.12))',
        border: '1.5px solid rgba(76,175,106,0.35)',
      }}
      aria-label={t('child_feel_title')}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.16)' }}>
          💛
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-base inline-flex items-center gap-1.5">
            <Sparkles size={14} /> {t('child_feel_title')}
          </p>
          <p className="text-[11px] font-bold app-muted mt-1">{t('child_feel_sub')}</p>
          <p className="text-sm font-black mt-2">{line}</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 mt-3">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => chooseMood(m.id)}
            className="min-h-11 rounded-xl text-xl app-pressable"
            style={{
              background: savedMood === m.id ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.12)',
              border: savedMood === m.id ? '1.5px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.2)',
            }}
            aria-label={m.id}
          >
            {m.emoji}
          </button>
        ))}
      </div>
    </section>
  )
}

