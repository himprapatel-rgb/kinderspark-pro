// ── KinderSpark Speech Engine ────────────────────────────────────────────────
// Uses Web Speech API for TTS — no external dependencies, works on all modern browsers

let voiceEnabled = true
let selectedVoice: SpeechSynthesisVoice | null = null
let speechRate = 0.78
let speechPitch = 1.15

// ── Voice Selection (prefer child-friendly voices) ──────────────────────────
function getBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null

  // Prefer these voice names (most child-friendly)
  const preferred = [
    'samantha', 'karen', 'kate', 'tessa', 'moira',     // macOS/iOS
    'microsoft zira', 'microsoft hazel', 'microsoft susan', // Windows
    'google us english', 'google uk english female',       // Chrome
  ]

  for (const pref of preferred) {
    const match = voices.find((v) => v.name.toLowerCase().includes(pref))
    if (match) return match
  }

  // Fallback: any English female voice
  const english = voices.filter((v) => v.lang.startsWith('en'))
  const female = english.find((v) =>
    /female|samantha|kate|zira|hazel|susan|karen|tessa/i.test(v.name)
  )
  if (female) return female

  // Any English voice
  return english[0] || voices[0] || null
}

// Load voices (they load async on some browsers)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => {
    if (!selectedVoice) selectedVoice = getBestVoice()
  }
  // Try immediate load too
  selectedVoice = getBestVoice()
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

  if (!selectedVoice) selectedVoice = getBestVoice()
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
  if (!enabled) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
  }
}

export function isVoiceEnabled(): boolean {
  return voiceEnabled
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
