'use client'

// ── Sound Effects System ────────────────────────────────────────────────────
// Generates sounds programmatically using Web Audio API — zero external files.
// Each sound is a tiny synth patch that plays instantly.

let audioCtx: AudioContext | null = null
let soundEnabled = true

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch {
      return null
    }
  }
  // Resume if suspended (autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled
  if (typeof window !== 'undefined') {
    localStorage.setItem('kinderspark-sounds', enabled ? 'on' : 'off')
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kinderspark-sounds')
    if (stored === 'off') return false
  }
  return soundEnabled
}

// ── Individual sounds ────────────────────────────────────────────────────────

/** Happy "ding!" for correct answers */
export function playCorrect() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // Two notes: C5 → E5 quick arpeggio
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const gain = ctx.createGain()

  osc1.type = 'sine'
  osc1.frequency.setValueAtTime(523, t) // C5
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(659, t + 0.08) // E5

  gain.gain.setValueAtTime(0.25, t)
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4)

  osc1.connect(gain)
  osc2.connect(gain)
  gain.connect(ctx.destination)

  osc1.start(t)
  osc1.stop(t + 0.15)
  osc2.start(t + 0.08)
  osc2.stop(t + 0.4)
}

/** Soft "boop" for wrong answers — not punishing */
export function playWrong() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'triangle'
  osc.frequency.setValueAtTime(280, t)
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.2)

  gain.gain.setValueAtTime(0.15, t)
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.3)
}

/** Triumphant completion fanfare */
export function playComplete() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // C5 → E5 → G5 → C6 arpeggio
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t + i * 0.12)
    gain.gain.setValueAtTime(0.2, t + i * 0.12)
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t + i * 0.12)
    osc.stop(t + i * 0.12 + 0.35)
  })
}

/** Badge/achievement unlock — magical sparkle */
export function playBadge() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // Ascending sparkle notes with shimmer
  const notes = [784, 988, 1175, 1319, 1568]
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t + i * 0.08)
    gain.gain.setValueAtTime(0.12, t + i * 0.08)
    gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t + i * 0.08)
    osc.stop(t + i * 0.08 + 0.3)
  })
}

/** Soft tap/click — for button presses */
export function playTap() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, t)
  gain.gain.setValueAtTime(0.08, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.06)
}

/** Swipe / card transition — whoosh */
export function playSwipe() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // White noise burst shaped as a swoosh
  const bufferSize = ctx.sampleRate * 0.15
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }

  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filter = ctx.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.setValueAtTime(2000, t)
  filter.frequency.exponentialRampToValueAtTime(8000, t + 0.1)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.06, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start(t)
}

/** Star earned — sparkle ding */
export function playStar() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(1047, t) // C6
  osc.frequency.exponentialRampToValueAtTime(1319, t + 0.1) // E6
  gain.gain.setValueAtTime(0.15, t)
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.25)
}
