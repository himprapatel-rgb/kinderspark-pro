'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { playTap, playComplete, playSwipe } from '@/lib/sounds'
import { hapticTap, hapticSuccess } from '@/lib/capacitor'
import type { SupportedLang } from '@/lib/i18n'

const ONBOARDING_KEY = 'kinderspark-onboarding-done'

// Safe localStorage wrapper — managed iPads with strict MDM can throw SecurityError
function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch {}
}
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function lsRemove(key: string): void {
  try { localStorage.removeItem(key) } catch {}
}

// ── Slide Data ──────────────────────────────────────────────────────────────
const slides = [
  {
    key: 'welcome' as const,
    emoji: '✨',
    bg: 'linear-gradient(135deg, #5B7FE8 0%, #8B6CC1 100%)',
    illustration: (
      <div className="relative w-48 h-48 mx-auto mb-6">
        {/* Book */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{
            fontSize: '80px',
            animation: 'float 3s ease-in-out infinite',
          }}>📚</div>
        </div>
        {/* Sparkles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${20 + Math.sin(i * 1.05) * 35}%`,
            left: `${20 + Math.cos(i * 1.05) * 35}%`,
            fontSize: '20px',
            animation: `twinkle ${1.5 + i * 0.3}s ease-in-out infinite ${i * 0.2}s`,
            opacity: 0.8,
          }}>✨</div>
        ))}
      </div>
    ),
    titleKey: 'onboarding_welcome',
    descKey: 'onboarding_welcome_desc',
  },
  {
    key: 'learn' as const,
    emoji: '🎮',
    bg: 'linear-gradient(135deg, #4CAF6A 0%, #2E7D5A 100%)',
    illustration: (
      <div className="relative w-48 h-48 mx-auto mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{
            fontSize: '80px',
            animation: 'bounce-subtle 2s ease-in-out infinite',
          }}>🎓</div>
        </div>
        {/* Floating icons */}
        {['🎨', '🔢', '🔤', '🧩'].map((em, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: `${15 + i * 20}%`,
            left: i % 2 === 0 ? '5%' : '75%',
            fontSize: '28px',
            animation: `float ${2 + i * 0.5}s ease-in-out infinite ${i * 0.3}s`,
          }}>{em}</div>
        ))}
      </div>
    ),
    titleKey: 'onboarding_learn',
    descKey: 'onboarding_learn_desc',
  },
  {
    key: 'grow' as const,
    emoji: '📊',
    bg: 'linear-gradient(135deg, #F5A623 0%, #D4881A 100%)',
    illustration: (
      <div className="relative w-48 h-48 mx-auto mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{
            fontSize: '80px',
            animation: 'float 3s ease-in-out infinite',
          }}>🌱</div>
        </div>
        {/* Growing badges */}
        {['⭐', '🏅', '🏆'].map((em, i) => (
          <div key={i} style={{
            position: 'absolute',
            bottom: `${10 + i * 15}%`,
            right: `${15 + i * 10}%`,
            fontSize: '24px',
            animation: `pop-in 0.6s ease-out ${0.8 + i * 0.3}s both`,
          }}>{em}</div>
        ))}
      </div>
    ),
    titleKey: 'onboarding_grow',
    descKey: 'onboarding_grow_desc',
  },
]

interface OnboardingProps {
  onComplete: () => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [animatingOut, setAnimatingOut] = useState(false)
  const { t, lang, setLang, languages } = useTranslation()

  const isLast = currentSlide === slides.length - 1

  const goNext = () => {
    if (isLast) {
      hapticSuccess()
      playComplete()
      lsSet(ONBOARDING_KEY, 'true')
      setAnimatingOut(true)
      setTimeout(() => onComplete(), 500)
      return
    }
    hapticTap()
    playSwipe()
    setCurrentSlide(prev => prev + 1)
  }

  const skip = () => {
    hapticTap()
    playTap()
    lsSet(ONBOARDING_KEY, 'true')
    setAnimatingOut(true)
    setTimeout(() => onComplete(), 300)
  }

  const slide = slides[currentSlide]

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${animatingOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: slide.bg }}
    >
      {/* Language selector at top */}
      <div className="absolute top-12 left-0 right-0 flex justify-center gap-2 px-4">
        {languages.map((l) => (
          <button
            key={l.code}
            onClick={() => { hapticTap(); playTap(); setLang(l.code) }}
            className="px-3 py-1.5 rounded-full text-sm font-bold transition-all"
            style={{
              background: lang === l.code ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: lang === l.code ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
              transform: lang === l.code ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {l.flag} {l.nativeName}
          </button>
        ))}
      </div>

      {/* Skip button */}
      {!isLast && (
        <button
          onClick={skip}
          className="absolute top-12 right-6 px-4 py-2 text-white/70 text-sm font-semibold hover:text-white transition-colors"
        >
          {t('onboarding_skip')} →
        </button>
      )}

      {/* Main content */}
      <div
        className="flex flex-col items-center text-center px-8 max-w-md transition-all duration-300"
        style={{
          animation: 'slide-up 0.5s ease-out',
        }}
        key={currentSlide}
      >
        {slide.illustration}

        <h1 className="text-3xl font-black text-white mb-3 drop-shadow-lg">
          {t(slide.titleKey as any)}
        </h1>
        <p className="text-lg text-white/85 leading-relaxed font-medium">
          {t(slide.descKey as any)}
        </p>
      </div>

      {/* Dots */}
      <div className="flex gap-3 mt-10">
        {slides.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === currentSlide ? 32 : 10,
              height: 10,
              background: i === currentSlide ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </div>

      {/* Next/Start button */}
      <button
        onClick={goNext}
        className="mt-10 px-10 py-4 rounded-2xl text-lg font-black transition-all app-pressable"
        style={{
          background: 'rgba(255,255,255,0.25)',
          color: '#fff',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255,255,255,0.4)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        {isLast ? t('onboarding_start') : t('next')} {isLast ? '🚀' : '→'}
      </button>

      {/* Keyframe animations are defined in globals.css — removed inline <style> to prevent re-injection on re-render */}
    </div>
  )
}

/** Check if onboarding has been completed */
export function isOnboardingDone(): boolean {
  if (typeof window === 'undefined') return true
  return lsGet(ONBOARDING_KEY) === 'true'
}

/** Reset onboarding (for testing) */
export function resetOnboarding() {
  if (typeof window !== 'undefined') {
    lsRemove(ONBOARDING_KEY)
  }
}
