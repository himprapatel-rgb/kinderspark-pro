// KinderSpark Speech Engine
//
// Priority order:
//   1. Google Cloud TTS  (human quality, primary)   via POST /api/tts
//   2. OpenAI TTS        (human quality, secondary) via POST /api/tts
//   3. Web Speech API    (robotic, offline fallback)
//
// Audio is cached server-side — same text never hits the API twice.

export type VoiceProfile = 'auto' | 'girl' | 'boy'

const VOICE_PROFILE_KEY = 'ks_voice_profile'
const VOICE_ENABLED_KEY = 'ks_voice_enabled'

let voiceEnabled = true
let selectedVoice: SpeechSynthesisVoice | null = null
let speechRate = 0.82
let speechPitch = 1.06
let voiceProfile: VoiceProfile = 'auto'

// Track whether the API TTS is working (skip retries after first confirmed fail)
let apiTTSAvailable: boolean | null = null  // null = not yet tested

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const part = document.cookie
    .split('; ')
    .find((row) => row.startsWith('kinderspark_csrf='))
  if (!part) return null
  return decodeURIComponent(part.split('=')[1] || '')
}

function getApiBaseForSpeech(): string {
  const fromRuntime = (window as any).__NEXT_DATA__?.runtimeConfig?.NEXT_PUBLIC_API_URL as string | undefined
  const fromEnv = process.env.NEXT_PUBLIC_API_URL
  const raw = (fromRuntime || fromEnv || '').replace(/\/$/, '')
  if (!raw) return ''
  // Support both ".../api" and bare origin values.
  return raw.endsWith('/api') ? raw : `${raw}/api`
}

// ── Persist prefs ─────────────────────────────────────────────────────────

function loadPersistedPrefs() {
  if (typeof window === 'undefined') return
  const enabledRaw = localStorage.getItem(VOICE_ENABLED_KEY)
  if (enabledRaw === '0') voiceEnabled = false
  const profileRaw = localStorage.getItem(VOICE_PROFILE_KEY)
  if (profileRaw === 'girl' || profileRaw === 'boy' || profileRaw === 'auto') {
    voiceProfile = profileRaw
  }
}

// ── Web Speech (fallback) ─────────────────────────────────────────────────

function normalize(s: string) {
  return String(s || '').toLowerCase()
}

function scoreVoice(v: SpeechSynthesisVoice, profile: VoiceProfile): number {
  const n = normalize(v.name)
  const lang = normalize(v.lang)
  let score = 0
  if (lang.startsWith('en-')) score += 30
  else if (lang.startsWith('en')) score += 20
  if (v.localService) score += 8
  if (/neural|natural|enhanced|premium|wavenet/.test(n)) score += 14
  if (/espeak|festival|mbrola|robot|desktop/.test(n)) score -= 12
  if (/samantha|ava|allison|siri/.test(n)) score += 16
  if (/zira|aria|jenny|guy|davis/.test(n)) score += 14
  if (/google/.test(n)) score += 10
  if (profile === 'girl') {
    if (/female|woman|girl|samantha|ava|allison|zira|jenny|aria|hazel|susan|karen|tessa|moira/.test(n)) score += 18
    if (/male|man|boy|guy|davis|daniel/.test(n)) score -= 7
  } else if (profile === 'boy') {
    if (/male|man|boy|guy|davis|daniel|alex|fred|tom/.test(n)) score += 18
    if (/female|woman|girl|samantha|ava|allison|zira|jenny|aria/.test(n)) score -= 7
  } else {
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
    if (s > bestScore) { bestScore = s; best = v }
  }
  return best || voices[0] || null
}

function tuneForProfile(profile: VoiceProfile) {
  if (profile === 'girl')      { speechRate = 0.84; speechPitch = 1.10 }
  else if (profile === 'boy')  { speechRate = 0.82; speechPitch = 0.96 }
  else                         { speechRate = 0.82; speechPitch = 1.05 }
}

function webSpeakFallback(text: string, options?: { rate?: number; pitch?: number; onEnd?: () => void }) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = options?.rate ?? speechRate
  utterance.pitch = options?.pitch ?? speechPitch
  utterance.volume = 1
  if (!selectedVoice) selectedVoice = getBestVoice(voiceProfile)
  if (selectedVoice) utterance.voice = selectedVoice
  if (options?.onEnd) utterance.onend = options.onEnd
  speechSynthesis.speak(utterance)
}

// ── API TTS (Google → OpenAI) ─────────────────────────────────────────────

async function apiSpeak(text: string, onEnd?: () => void): Promise<boolean> {
  if (apiTTSAvailable === false) return false
  if (typeof window === 'undefined') return false

  try {
    const apiBase = getApiBaseForSpeech()
    if (!apiBase) return false
    const csrf = getCsrfToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (csrf) headers['x-csrf-token'] = csrf

    const res = await fetch(`${apiBase}/tts`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        text,
        language: getLanguage(),
        profile: voiceProfile,
      }),
    })

    const data = await res.json()

    // Server told us no provider is configured — don't retry
    if (data.fallback) {
      apiTTSAvailable = false
      return false
    }

    if (!data.dataUrl) return false

    apiTTSAvailable = true

    const audio = new Audio(data.dataUrl)
    audio.playbackRate = 0.92
    if (onEnd) audio.onended = onEnd
    await audio.play()
    return true
  } catch {
    // Network error or not authenticated — use fallback silently
    return false
  }
}

// Detect current language from app store (best-effort)
function getLanguage(): string {
  if (typeof window === 'undefined') return 'en'
  try {
    const raw = localStorage.getItem('kinderspark-store')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed?.state?.settings?.lang || 'en'
    }
  } catch {}
  return 'en'
}

// ── Init ──────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadPersistedPrefs()
  tuneForProfile(voiceProfile)
  speechSynthesis.onvoiceschanged = () => { selectedVoice = getBestVoice(voiceProfile) }
  selectedVoice = getBestVoice(voiceProfile)
}

// ── Core speak function ───────────────────────────────────────────────────

export function speak(text: string, options?: { rate?: number; pitch?: number; onEnd?: () => void }) {
  if (typeof window === 'undefined') return
  if (!voiceEnabled) return

  // Try API TTS first (human voice), fall back to Web Speech
  apiSpeak(text, options?.onEnd).then((used) => {
    if (!used) webSpeakFallback(text, options)
  })
}

// ── Convenience functions ─────────────────────────────────────────────────

export function speakQuestion(text: string, onEnd?: () => void) {
  speak(text, { rate: 0.72, pitch: 1.1, onEnd })
}

export function speakEncouragement(text: string) {
  speak(text, { rate: 0.85, pitch: 1.25 })
}

export function speakAnswer(text: string) {
  speak(text, { rate: 0.65, pitch: 1.0 })
}

export function speakGreeting(name: string) {
  speak(`Hi ${name}! Ready to learn? Let's go!`, { rate: 0.7, pitch: 1.2 })
}

export function speakTopicIntro(topicLabel: string) {
  speak(`Let's practice ${topicLabel}! Think carefully and choose the right answer.`, { rate: 0.75, pitch: 1.15 })
}

export function speakResults(correct: number, total: number) {
  const pct = Math.round((correct / total) * 100)
  if (pct >= 80) speak(`Amazing! You got ${correct} out of ${total}! You are a superstar!`, { rate: 0.8, pitch: 1.3 })
  else if (pct >= 60) speak(`Good job! You got ${correct} out of ${total}. Keep practicing!`, { rate: 0.8, pitch: 1.15 })
  else speak(`You got ${correct} out of ${total}. Don't worry, practice makes perfect!`, { rate: 0.75, pitch: 1.1 })
}

// ── Controls ──────────────────────────────────────────────────────────────

export function setVoiceEnabled(enabled: boolean) {
  voiceEnabled = enabled
  if (typeof window !== 'undefined') localStorage.setItem(VOICE_ENABLED_KEY, enabled ? '1' : '0')
  if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.cancel()
}

export function isVoiceEnabled(): boolean { return voiceEnabled }

export function setVoiceProfile(profile: VoiceProfile) {
  voiceProfile = profile
  tuneForProfile(profile)
  if (typeof window !== 'undefined') localStorage.setItem(VOICE_PROFILE_KEY, profile)
  selectedVoice = getBestVoice(profile)
}

export function getVoiceProfile(): VoiceProfile { return voiceProfile }

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.cancel()
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  return speechSynthesis.speaking
}

export function setSpeechRate(rate: number) { speechRate = Math.max(0.5, Math.min(1.5, rate)) }
export function setSpeechPitch(pitch: number) { speechPitch = Math.max(0.5, Math.min(2.0, pitch)) }
