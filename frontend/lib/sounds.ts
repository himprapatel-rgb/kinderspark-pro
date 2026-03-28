'use client'

// ── Sound Effects System ────────────────────────────────────────────────────
// Generates sounds programmatically using Web Audio API — zero external files.
// Each sound is a tiny synth patch that plays instantly.
// Also includes a looping background music engine for the child dashboard.

let audioCtx: AudioContext | null = null
let soundEnabled = true
let musicEnabled = true
let bgMusicNodes: { sources: OscillatorNode[]; gains: GainNode[]; masterGain: GainNode } | null = null

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

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled
  if (typeof window !== 'undefined') {
    localStorage.setItem('kinderspark-music', enabled ? 'on' : 'off')
  }
  if (!enabled) stopBackgroundMusic()
}

export function isMusicEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('kinderspark-music')
    if (stored === 'off') return false
  }
  return musicEnabled
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

/** Level-up — ascending power chord */
export function playLevelUp() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  // Power chord sweep: C4 → C5 → C6
  const freqs = [262, 392, 523, 784, 1047]
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = i < 3 ? 'square' : 'sine'
    osc.frequency.setValueAtTime(freq, t + i * 0.1)
    gain.gain.setValueAtTime(0.1, t + i * 0.1)
    gain.gain.exponentialRampToValueAtTime(0.005, t + i * 0.1 + 0.5)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t + i * 0.1)
    osc.stop(t + i * 0.1 + 0.5)
  })
}

/** Notification ping — gentle attention-getter */
export function playNotification() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, t)
  gain.gain.setValueAtTime(0.12, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.15)

  // Second ping slightly higher
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.setValueAtTime(1100, t + 0.12)
  gain2.gain.setValueAtTime(0.1, t + 0.12)
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(t + 0.12)
  osc2.stop(t + 0.3)
}

/** Countdown tick — for quizzes and timed activities */
export function playTick() {
  if (!isSoundEnabled()) return
  const ctx = getCtx()
  if (!ctx) return
  const t = ctx.currentTime

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(1000, t)
  gain.gain.setValueAtTime(0.04, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.03)
}

// ── Background Music Engine ────────────────────────────────────────────────
// Calming, looping, generative background melody for the child dashboard.
// Uses multiple oscillators to create a gentle, evolving ambient pad.

/** Start looping background music (child dashboard) */
export function startBackgroundMusic() {
  if (!isMusicEnabled()) return
  if (bgMusicNodes) return // already playing
  const ctx = getCtx()
  if (!ctx) return

  const masterGain = ctx.createGain()
  masterGain.gain.setValueAtTime(0, ctx.currentTime)
  masterGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2) // fade in
  masterGain.connect(ctx.destination)

  // Ambient pad: C major chord with gentle detuning
  const chordFreqs = [262, 330, 392, 523] // C4, E4, G4, C5
  const sources: OscillatorNode[] = []
  const gains: GainNode[] = []

  chordFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    // Gentle vibrato
    osc.detune.setValueAtTime(0, ctx.currentTime)
    // LFO-like detune via scheduling
    const lfoRate = 0.3 + i * 0.1
    const schedule = () => {
      const now = ctx.currentTime
      osc.detune.linearRampToValueAtTime(8, now + 1 / lfoRate)
      osc.detune.linearRampToValueAtTime(-8, now + 2 / lfoRate)
      osc.detune.linearRampToValueAtTime(0, now + 3 / lfoRate)
    }
    schedule()

    g.gain.setValueAtTime(i === 0 ? 0.5 : 0.3, ctx.currentTime)
    osc.connect(g)
    g.connect(masterGain)
    osc.start()
    sources.push(osc)
    gains.push(g)
  })

  bgMusicNodes = { sources, gains, masterGain }
}

/** Stop background music with fade-out */
export function stopBackgroundMusic() {
  if (!bgMusicNodes) return
  const ctx = getCtx()
  if (!ctx) return

  const { sources, masterGain } = bgMusicNodes
  masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1)
  setTimeout(() => {
    sources.forEach(s => { try { s.stop() } catch {} })
    bgMusicNodes = null
  }, 1200)
}

/** Check if background music is currently playing */
export function isBackgroundMusicPlaying(): boolean {
  return bgMusicNodes !== null
}
