// KinderSpark Speech Engine
// Uses Web Speech API with better "natural child-friendly" voice picking.

export type VoiceProfile = 'auto' | 'girl' | 'boy'

const VOICE_PROFILE_KEY = 'ks_voice_profile'
const VOICE_ENABLED_KEY = 'ks_voice_enabled'

let voiceEnabled = true
let selectedVoice: SpeechSynthesisVoice | null = null
let speechRate = 0.82
let speechPitch = 1.06
let voiceProfile: VoiceProfile = 'auto'

function normalize(s: string) {
  return String(s || '').toLowerCase()
}

function loadPersistedPrefs() {
  if (typeof window === 'undefined') return
  const enabledRaw = localStorage.getItem(VOICE_ENABLED_KEY)
  if (enabledRaw === '0') voiceEnabled = false
  const profileRaw = localStorage.getItem(VOICE_PROFILE_KEY)
  if (profileRaw === 'girl' || profileRaw === 'boy' || profileRaw === 'auto') {
    voiceProfile = profileRaw
  }
}

function scoreVoice(v: SpeechSynthesisVoice, profile: VoiceProfile): number {
  const n = normalize(v.name)
  const lang = normalize(v.lang)
  let score = 0

  // Prefer English first, then close variants.
  if (lang.startsWith('en-')) score += 30
  else if (lang.startsWith('en')) score += 20

  // Prefer local/native voices when possible.
  if (v.localService) score += 8

  // Natural / neural sounding hints.
  if (/neural|natural|enhanced|premium|wavenet/.test(n)) score += 14

  // Penalize known robotic/legacy voices.
  if (/espeak|festival|mbrola|robot|desktop/.test(n)) score -= 12

  // Platform-friendly popular voices.
  if (/samantha|ava|allison|siri/.test(n)) score += 16
  if (/zira|aria|jenny|guy|davis/.test(n)) score += 14
  if (/google/.test(n)) score += 10

  // Profile preference.
  if (profile === 'girl') {
    if (/female|woman|girl|samantha|ava|allison|zira|jenny|aria|hazel|susan|karen|tessa|moira/.test(n)) score += 18
    if (/male|man|boy|guy|davis|daniel/.test(n)) score -= 7
  } else if (profile === 'boy') {
    if (/male|man|boy|guy|davis|daniel|alex|fred|tom/.test(n)) score += 18
    if (/female|woman|girl|samantha|ava|allison|zira|jenny|aria/.test(n)) score -= 7
  } else {
    // Auto defaults to warm neutral/female-ish for early learners.
    if (/samantha|ava|allison|zira|jenny|aria|hazel|susan/.test(n)) score += 10
  }

  return score
}

function getBestVoice(profile: VoiceProfile = voiceProfile): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null

  let best: SpeechSynthesisVoice | null = null
  let bestScore = -10_000
  for (const v of voices) {
    const s = scoreVoice(v, profile)
    if (s > bestScore) {
      bestScore = s
      best = v
    }
  }
  return best || voices[0] || null
}

function tuneForProfile(profile: VoiceProfile) {
  if (profile === 'girl') {
    speechRate = 0.84
    speechPitch = 1.10
  } else if (profile === 'boy') {
    speechRate = 0.82
    speechPitch = 0.96
  } else {
    speechRate = 0.82
    speechPitch = 1.05
  }
}

// Load voices (async on some browsers)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadPersistedPrefs()
  tuneForProfile(voiceProfile)
  speechSynthesis.onvoiceschanged = () => {
    selectedVoice = getBestVoice(voiceProfile)
  }
  selectedVoice = getBestVoice(voiceProfile)
}

// ── Core speak function ─────────────────────────────────────────────────────
export function speak(text: string, options?: { rate?: number; pitch?: number; onEnd?: () => void }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  if (!voiceEnabled) return

  speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = options?.rate ?? speechRate
  utterance.pitch = options?.pitch ?? speechPitch
  utterance.volume = 1

  if (!selectedVoice) selectedVoice = getBestVoice(voiceProfile)
  if (selectedVoice) utterance.voice = selectedVoice

  if (options?.onEnd) {
    utterance.onend = options.onEnd
  }

  speechSynthesis.speak(utterance)
}

// ── Convenience functions for the tutor ─────────────────────────────────────

/** Speak a question with appropriate pacing */
export function speakQuestion(text: string, onEnd?: () => void) {
  speak(text, { rate: 0.72, pitch: 1.1, onEnd })
}

/** Speak encouragement (slightly faster, higher pitch) */
export function speakEncouragement(text: string) {
  speak(text, { rate: 0.85, pitch: 1.25 })
}

/** Speak the correct answer slowly for learning */
export function speakAnswer(text: string) {
  speak(text, { rate: 0.65, pitch: 1.0 })
}

/** Speak a greeting (warm, slow) */
export function speakGreeting(name: string) {
  speak(`Hi ${name}! Ready to learn? Let's go!`, { rate: 0.7, pitch: 1.2 })
}

/** Speak topic introduction */
export function speakTopicIntro(topicLabel: string) {
  speak(`Let's practice ${topicLabel}! Think carefully and choose the right answer.`, { rate: 0.75, pitch: 1.15 })
}

/** Speak results summary */
export function speakResults(correct: number, total: number) {
  const pct = Math.round((correct / total) * 100)
  if (pct >= 80) {
    speak(`Amazing! You got ${correct} out of ${total}! You are a superstar!`, { rate: 0.8, pitch: 1.3 })
  } else if (pct >= 60) {
    speak(`Good job! You got ${correct} out of ${total}. Keep practicing!`, { rate: 0.8, pitch: 1.15 })
  } else {
    speak(`You got ${correct} out of ${total}. Don't worry, practice makes perfect!`, { rate: 0.75, pitch: 1.1 })
  }
}

// ── Controls ────────────────────────────────────────────────────────────────

export function setVoiceEnabled(enabled: boolean) {
  voiceEnabled = enabled
  if (typeof window !== 'undefined') {
    localStorage.setItem(VOICE_ENABLED_KEY, enabled ? '1' : '0')
  }
  if (!enabled) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
  }
}

export function isVoiceEnabled(): boolean {
  return voiceEnabled
}

export function setVoiceProfile(profile: VoiceProfile) {
  voiceProfile = profile
  tuneForProfile(profile)
  if (typeof window !== 'undefined') {
    localStorage.setItem(VOICE_PROFILE_KEY, profile)
  }
  selectedVoice = getBestVoice(profile)
}

export function getVoiceProfile(): VoiceProfile {
  return voiceProfile
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis.cancel()
  }
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  return speechSynthesis.speaking
}

export function setSpeechRate(rate: number) {
  speechRate = Math.max(0.5, Math.min(1.5, rate))
}

export function setSpeechPitch(pitch: number) {
  speechPitch = Math.max(0.5, Math.min(2.0, pitch))
}
