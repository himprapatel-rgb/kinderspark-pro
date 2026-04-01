'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { updateStudent } from '@/lib/api'
import { Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react'
import { AppIcon } from '@/components/icons'
import { playComplete, playSwipe, playStar } from '@/lib/sounds'

const ConfettiCanvas = dynamic(() => import('@/components/Confetti'), { ssr: false })
import { speak, stopSpeaking, isVoiceEnabled, setVoiceEnabled } from '@/lib/speech'

// ── Story Time ──────────────────────────────────────────────────────────────
// Interactive read-aloud stories with illustrations (emoji scenes).
// Each page auto-reads aloud, tap to advance. Earns stars on completion.

interface StoryPage {
  text: string
  scene: string[]  // emoji scene elements
  bg: string       // background gradient
}

interface Story {
  id: string
  title: string
  cover: string   // emoji
  color: string
  difficulty: 'easy' | 'medium' | 'hard'
  pages: StoryPage[]
}

const STORIES: Story[] = [
  {
    id: 'bear-friend',
    title: 'The Little Bear\'s New Friend',
    cover: '🐻',
    color: '#8B6CC1',
    difficulty: 'easy',
    pages: [
      { text: 'Once upon a time, a little bear lived in a big forest.', scene: ['🐻', '🌲', '🌲', '🌳', '🌲'], bg: 'linear-gradient(180deg, #E8F8ED, #D4F0DC)' },
      { text: 'One sunny morning, the bear went for a walk.', scene: ['☀️', '🐻', '🌸', '🌼', '🦋'], bg: 'linear-gradient(180deg, #FFF7E6, #FFEFCC)' },
      { text: 'He heard a small sound. "Chirp chirp!" said a little bird.', scene: ['🐻', '❓', '🐦', '🎵', '🎶'], bg: 'linear-gradient(180deg, #E8F4FC, #D4ECFA)' },
      { text: '"Hello! I am Bear," he said. "Will you be my friend?"', scene: ['🐻', '💬', '🐦', '💕'], bg: 'linear-gradient(180deg, #F2EEFA, #E8D8F8)' },
      { text: '"Yes!" chirped the bird. They played all day long!', scene: ['🐻', '🐦', '⭐', '🎉', '🌈'], bg: 'linear-gradient(180deg, #FFF7E6, #E8F8ED)' },
      { text: 'They became the best of friends. The end! 💛', scene: ['🐻', '🐦', '💛', '🏠', '🌅'], bg: 'linear-gradient(180deg, #FFE8CC, #FFF0E0)' },
    ],
  },
  {
    id: 'rainbow-fish',
    title: 'The Rainbow Fish',
    cover: '🐟',
    color: '#5B7FE8',
    difficulty: 'easy',
    pages: [
      { text: 'In the deep blue sea, there lived a beautiful rainbow fish.', scene: ['🌊', '🐟', '🐠', '🐡', '🫧'], bg: 'linear-gradient(180deg, #E8F4FC, #C8E6FC)' },
      { text: 'The fish had shiny, sparkly scales that glowed in the water.', scene: ['🐟', '✨', '✨', '💎', '🫧'], bg: 'linear-gradient(180deg, #D4ECFA, #B8DFFA)' },
      { text: 'But no one wanted to play with the fish because it was too proud.', scene: ['🐟', '😢', '🐠', '🐠', '🐠'], bg: 'linear-gradient(180deg, #E0E8F0, #D0D8E8)' },
      { text: 'An octopus said, "Share your scales and you will find friends."', scene: ['🐙', '💬', '🐟', '💡'], bg: 'linear-gradient(180deg, #F2EEFA, #E0D8F0)' },
      { text: 'The fish gave a shiny scale to each friend. Everyone was happy!', scene: ['🐟', '🐠', '🐡', '✨', '❤️'], bg: 'linear-gradient(180deg, #E8F8ED, #FFF7E6)' },
      { text: 'Sharing made the rainbow fish the happiest of all! 🌈', scene: ['🐟', '🐠', '🐡', '🐙', '🌈', '💕'], bg: 'linear-gradient(180deg, #FFF0E0, #FFE8D0)' },
    ],
  },
  {
    id: 'space-adventure',
    title: 'Trip to the Moon',
    cover: '🚀',
    color: '#F5A623',
    difficulty: 'medium',
    pages: [
      { text: 'Mia dreamed of going to the moon. She built a rocket from boxes!', scene: ['👧', '📦', '📦', '🔧', '🚀'], bg: 'linear-gradient(180deg, #FFF7E6, #FFEFCC)' },
      { text: 'Three, two, one... blast off! The rocket flew into the sky!', scene: ['🚀', '💨', '☁️', '☁️', '⭐'], bg: 'linear-gradient(180deg, #E8F4FC, #C8D8FC)' },
      { text: 'In space, she saw stars twinkling like tiny diamonds.', scene: ['🚀', '⭐', '✨', '💫', '🌟', '⭐'], bg: 'linear-gradient(180deg, #1a1a3e, #2d2d5e)' },
      { text: 'She landed on the moon. "It is so quiet here!" she whispered.', scene: ['🌕', '🚀', '👧', '👣', '🌑'], bg: 'linear-gradient(180deg, #2d2d5e, #3d3d6e)' },
      { text: 'She found a moon rock and put it in her pocket. What a souvenir!', scene: ['👧', '🪨', '✨', '🌕'], bg: 'linear-gradient(180deg, #3d3d6e, #2d2d5e)' },
      { text: 'Back on Earth, Mia told everyone about her adventure. The end! 🌍', scene: ['🌍', '👧', '🪨', '👨‍👩‍👧', '🏠'], bg: 'linear-gradient(180deg, #E8F4FC, #E8F8ED)' },
    ],
  },
  {
    id: 'garden-magic',
    title: 'The Magic Garden',
    cover: '🌻',
    color: '#4CAF6A',
    difficulty: 'easy',
    pages: [
      { text: 'Tom planted a tiny seed in the garden.', scene: ['👦', '🌱', '🏠', '☀️'], bg: 'linear-gradient(180deg, #E8F8ED, #D4F0DC)' },
      { text: 'He watered it every day and sang it a song.', scene: ['👦', '💧', '🌱', '🎵', '🎶'], bg: 'linear-gradient(180deg, #E8F4FC, #E8F8ED)' },
      { text: 'One morning, a beautiful flower bloomed!', scene: ['🌻', '✨', '👦', '😮', '☀️'], bg: 'linear-gradient(180deg, #FFF7E6, #FFEFCC)' },
      { text: 'A butterfly came to visit the flower.', scene: ['🌻', '🦋', '🌸', '🌺', '🐝'], bg: 'linear-gradient(180deg, #F2EEFA, #FFF0E0)' },
      { text: 'Soon the whole garden was full of flowers! Magic! 🌈', scene: ['🌻', '🌸', '🌺', '🌹', '🌼', '🌷', '🦋'], bg: 'linear-gradient(180deg, #FFE8D0, #E8F8ED)' },
    ],
  },
]

export default function StoryTimePage() {
  const router = useRouter()
  const user = useAppStore(s => s.user)
  const currentStudent = useAppStore(s => s.currentStudent)
  const student = currentStudent || user

  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [pageIdx, setPageIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!student) router.push('/')
    setVoiceOn(isVoiceEnabled())
  }, [student])

  const readPage = (text: string) => {
    if (!voiceOn) return
    setReading(true)
    speak(text, { rate: 0.7, onEnd: () => setReading(false) })
  }

  const startStory = (story: Story) => {
    setSelectedStory(story)
    setPageIdx(0)
    setDone(false)
    setTimeout(() => readPage(story.pages[0].text), 500)
  }

  const nextPage = () => {
    if (!selectedStory) return
    stopSpeaking()
    playSwipe()

    if (pageIdx + 1 >= selectedStory.pages.length) {
      // Story complete!
      setDone(true)
      playComplete()
      setShowConfetti(true)
      playStar()

      if (student?.id) {
        setSaving(true)
        updateStudent(student.id, {
          stars: (student.stars || 0) + 5,
        }).catch(() => {}).finally(() => setSaving(false))
      }

      speak('Great reading! You finished the story!', { rate: 0.8 })
    } else {
      setPageIdx(i => i + 1)
      setTimeout(() => readPage(selectedStory.pages[pageIdx + 1].text), 300)
    }
  }

  const prevPage = () => {
    if (pageIdx > 0) {
      stopSpeaking()
      playSwipe()
      setPageIdx(i => i - 1)
      if (selectedStory) {
        setTimeout(() => readPage(selectedStory.pages[pageIdx - 1].text), 300)
      }
    }
  }

  const toggleVoice = () => {
    const newState = !voiceOn
    setVoiceOn(newState)
    setVoiceEnabled(newState)
    if (!newState) stopSpeaking()
  }

  // ── STORY SELECTION ──
  if (!selectedStory) {
    return (
      <div className="min-h-screen pb-24 app-container animate-page-enter" style={{ background: 'var(--app-bg)' }}>
        {/* Header */}
        <div className="relative overflow-hidden doodle-surface"
          style={{ background: 'linear-gradient(145deg, #8B6CC1, #5B7FE8)', padding: '24px 20px 36px' }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.push('/child')} className="glass-btn">← Back</button>
            <div className="text-2xl">📖</div>
          </div>
          <h1 className="text-2xl font-black text-white">Story Time</h1>
          <p className="text-sm font-bold text-white/70">Pick a story to read!</p>
        </div>

        {/* Story cards */}
        <div className="p-4 space-y-4">
          {STORIES.map((story, i) => (
            <button
              key={story.id}
              onClick={() => startStory(story)}
              className="w-full rounded-3xl p-5 flex items-center gap-4 app-pressable animate-sparkle-on-hover text-left"
              style={{
                background: 'var(--app-surface)',
                border: '1px solid var(--app-border)',
                boxShadow: 'var(--app-shadow-sm)',
                animationDelay: `${i * 80}ms`,
              }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: story.color + '18', border: `2px solid ${story.color}33` }}>
                {story.cover}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-base truncate" style={{ color: 'rgb(var(--foreground-rgb))' }}>{story.title}</p>
                <p className="text-xs font-bold app-muted">{story.pages.length} pages</p>
                <div className="mt-1">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{
                      background: story.difficulty === 'easy' ? 'rgba(76,175,106,0.15)' : 'rgba(245,166,35,0.15)',
                      color: story.difficulty === 'easy' ? '#4CAF6A' : '#F5A623',
                    }}>
                    {story.difficulty === 'easy' ? '⭐ Easy' : '⭐⭐ Medium'}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} color="var(--app-text-muted)" />
            </button>
          ))}
        </div>

        <div className="text-center py-4">
          <p className="text-xs font-bold app-muted">Earn 5⭐ for each story you finish!</p>
        </div>
      </div>
    )
  }

  // ── STORY COMPLETE ──
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-page-enter"
        style={{ background: 'var(--app-bg)' }}>
        <ConfettiCanvas trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
        <div className="text-7xl mb-4 animate-bounce">📖</div>
        <div className="text-3xl font-black mb-2" style={{ color: 'rgb(var(--foreground-rgb))' }}>Story Complete!</div>
        <div className="app-muted font-bold text-center mb-2">{selectedStory.title}</div>
        <div className="text-lg font-black mb-6" style={{ color: '#F5B731' }}>+5 ⭐ stars earned!</div>

        <div className="flex gap-3">
          <button onClick={() => { setDone(false); setPageIdx(0); setTimeout(() => readPage(selectedStory.pages[0].text), 300) }}
            className="px-6 py-3 rounded-2xl font-black inline-flex items-center gap-2"
            style={{ background: selectedStory.color, color: '#fff' }}>
            <AppIcon name="class" size="sm" roleTone="child" decorative /> Read Again
          </button>
          <button onClick={() => { setSelectedStory(null); setDone(false); stopSpeaking() }}
            className="px-6 py-3 rounded-2xl font-black inline-flex items-center gap-2"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            📚 More Stories
          </button>
          <button onClick={() => { stopSpeaking(); router.push('/child') }}
            className="px-6 py-3 rounded-2xl font-black inline-flex items-center gap-2"
            style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <AppIcon name="home" size="sm" roleTone="child" decorative /> Home
          </button>
        </div>
      </div>
    )
  }

  // ── READING ──
  const page = selectedStory.pages[pageIdx]
  const totalPages = selectedStory.pages.length
  const progress = ((pageIdx + 1) / totalPages) * 100

  return (
    <div className="min-h-screen flex flex-col" style={{ background: page.bg }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => { stopSpeaking(); setSelectedStory(null) }}
          className="font-bold app-pressable sticker-bubble px-3 py-1.5" style={{ color: 'rgb(var(--foreground-rgb))' }}>
          ← Stories
        </button>
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold app-muted mb-1">
            <span>{selectedStory.title}</span>
            <span>{pageIdx + 1}/{totalPages}</span>
          </div>
          <div className="rounded-full h-2" style={{ background: 'rgba(120,120,140,0.18)' }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: selectedStory.color }} />
          </div>
        </div>
        <button onClick={toggleVoice} className="w-8 h-8 rounded-full flex items-center justify-center app-pressable sticker-bubble">
          {voiceOn ? <Volume2 size={16} color={selectedStory.color} /> : <VolumeX size={16} color="var(--app-text-muted)" />}
        </button>
      </div>

      {/* Scene illustration */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 app-container">
        {/* Emoji scene */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 animate-page-enter" key={pageIdx}>
          {page.scene.map((emoji, i) => (
            <div
              key={i}
              className="text-5xl transition-all"
              style={{
                animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                animationDelay: `${i * 200}ms`,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>

        {/* Story text */}
        <div className="w-full max-w-sm rounded-3xl p-6 text-center animate-page-enter sticker-bubble"
          key={`text-${pageIdx}`}>
          <p className="text-xl font-bold leading-relaxed" style={{ color: 'rgb(var(--foreground-rgb))' }}>
            {page.text}
          </p>
          {reading && (
            <div className="flex items-center justify-center gap-2 mt-3 text-xs font-bold" style={{ color: selectedStory.color }}>
              <Volume2 size={14} className="animate-pulse" /> Reading aloud...
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-6 flex items-center gap-4">
        <button
          onClick={prevPage}
          disabled={pageIdx === 0}
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl disabled:opacity-20 active:scale-95 transition-all app-pressable sticker-bubble"
        >
          <ChevronLeft size={24} />
        </button>

        <button
          onClick={() => readPage(page.text)}
          className="w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all app-pressable sticker-bubble"
          style={{ background: selectedStory.color + '18', border: `2px solid ${selectedStory.color}33` }}
        >
          <Volume2 size={22} color={selectedStory.color} />
        </button>

        <button
          onClick={nextPage}
          className="flex-1 py-4 rounded-2xl font-black text-base active:scale-95 transition-all app-pressable animate-sparkle-on-hover flex items-center justify-center gap-2"
          style={{
            background: pageIdx + 1 >= totalPages
              ? 'linear-gradient(135deg, var(--app-success), #5FBF7F)'
              : `linear-gradient(135deg, ${selectedStory.color}, ${selectedStory.color}cc)`,
            color: '#fff',
            boxShadow: `0 4px 16px ${selectedStory.color}40`,
          }}
        >
          {pageIdx + 1 >= totalPages ? '🎉 Finish Story' : 'Next Page →'}
        </button>
      </div>
    </div>
  )
}
