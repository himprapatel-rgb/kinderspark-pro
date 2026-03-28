'use client'
import { useState, useEffect } from 'react'
import { 
  isSoundEnabled, setSoundEnabled,
  isMusicEnabled, setMusicEnabled,
  startBackgroundMusic, stopBackgroundMusic, isBackgroundMusicPlaying,
  playTap, playCorrect, playComplete, playBadge, playLevelUp, playNotification,
} from '@/lib/sounds'
import { useTranslation } from '@/hooks/useTranslation'
import { Volume2, VolumeX, Music, Music2 } from 'lucide-react'

/**
 * Sound & Music settings panel.
 * Can be rendered inline inside any settings/profile page.
 */
export default function SoundSettings() {
  const { t } = useTranslation()
  const [soundOn, setSoundOn] = useState(true)
  const [musicOn, setMusicOn] = useState(true)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setSoundOn(isSoundEnabled())
    setMusicOn(isMusicEnabled())
    setPlaying(isBackgroundMusicPlaying())
  }, [])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    if (next) playTap()
  }

  const toggleMusic = () => {
    const next = !musicOn
    setMusicOn(next)
    setMusicEnabled(next)
    if (next) {
      startBackgroundMusic()
      setPlaying(true)
    } else {
      stopBackgroundMusic()
      setPlaying(false)
    }
  }

  const previewSounds = [
    { label: 'Tap', fn: playTap },
    { label: 'Correct ✓', fn: playCorrect },
    { label: 'Complete 🎉', fn: playComplete },
    { label: 'Badge 🏅', fn: playBadge },
    { label: 'Level Up ⬆', fn: playLevelUp },
    { label: 'Notify 🔔', fn: playNotification },
  ]

  return (
    <div className="space-y-4">
      {/* Sound Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(120,120,140,0.08)' }}>
        <div className="flex items-center gap-3">
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          <span className="font-semibold text-sm">{t('sounds')}</span>
        </div>
        <button
          onClick={toggleSound}
          className="w-12 h-7 rounded-full relative transition-colors duration-200"
          style={{ background: soundOn ? '#4CAF6A' : 'rgba(120,120,140,0.2)' }}
        >
          <div
            className="w-5 h-5 rounded-full bg-white absolute top-1 transition-all duration-200 shadow-md"
            style={{ left: soundOn ? 26 : 4 }}
          />
        </button>
      </div>

      {/* Music Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(120,120,140,0.08)' }}>
        <div className="flex items-center gap-3">
          {playing ? <Music2 size={20} className="animate-pulse" /> : <Music size={20} />}
          <span className="font-semibold text-sm">{t('music')}</span>
        </div>
        <button
          onClick={toggleMusic}
          className="w-12 h-7 rounded-full relative transition-colors duration-200"
          style={{ background: musicOn ? '#5B7FE8' : 'rgba(120,120,140,0.2)' }}
        >
          <div
            className="w-5 h-5 rounded-full bg-white absolute top-1 transition-all duration-200 shadow-md"
            style={{ left: musicOn ? 26 : 4 }}
          />
        </button>
      </div>

      {/* Sound Preview (only when sounds enabled) */}
      {soundOn && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(120,120,140,0.6)' }}>
            Preview sounds:
          </p>
          <div className="flex flex-wrap gap-2">
            {previewSounds.map((s) => (
              <button
                key={s.label}
                onClick={s.fn}
                className="px-3 py-1.5 rounded-lg text-xs font-bold app-pressable transition-transform"
                style={{ background: 'rgba(120,120,140,0.1)' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
