// ── Text-to-Speech Service ────────────────────────────────────────────────
// 1. Google Cloud TTS  — Neural2 voices, FREE 1M chars/month
// 2. OpenAI TTS        — nova/echo/shimmer, paid
// 3. Microsoft Azure   — Neural voices, FREE 500K chars/month
// 4. null              → frontend falls back to Web Speech API (robotic)
//
// HARDCORE CACHE RULE: every result cached in AIResponseCache (30-day TTL).
// Same text + language + profile = zero API calls after first time.

import https from 'https'
import { makeCacheKey, getCachedResponse, setCachedResponse } from './cache.service'

export type TTSProfile = 'girl' | 'boy' | 'auto'

// ── Google Cloud TTS voice map ────────────────────────────────────────────
const GOOGLE_VOICES: Record<string, { girl: string; boy: string }> = {
  en: { girl: 'en-US-Neural2-F',   boy: 'en-US-Neural2-D'   },
  fr: { girl: 'fr-FR-Neural2-C',   boy: 'fr-FR-Neural2-B'   },
  es: { girl: 'es-ES-Neural2-A',   boy: 'es-ES-Neural2-B'   },
  ar: { girl: 'ar-XA-Wavenet-A',   boy: 'ar-XA-Wavenet-B'   },
  hi: { girl: 'hi-IN-Neural2-A',   boy: 'hi-IN-Neural2-B'   },
  zh: { girl: 'cmn-CN-Wavenet-A',  boy: 'cmn-CN-Wavenet-B'  },
  pt: { girl: 'pt-BR-Neural2-A',   boy: 'pt-BR-Neural2-B'   },
  de: { girl: 'de-DE-Neural2-A',   boy: 'de-DE-Neural2-B'   },
  tr: { girl: 'tr-TR-Wavenet-E',   boy: 'tr-TR-Wavenet-B'   },
  ur: { girl: 'ur-IN-Wavenet-A',   boy: 'ur-IN-Wavenet-B'   },
}
const GOOGLE_LANG_CODES: Record<string, string> = {
  en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-XA',
  hi: 'hi-IN', zh: 'cmn-CN', pt: 'pt-BR', de: 'de-DE',
  tr: 'tr-TR', ur: 'ur-IN',
}

// ── OpenAI voice map ──────────────────────────────────────────────────────
const OPENAI_VOICES: Record<TTSProfile, string> = {
  girl: 'nova',    // warm, friendly female
  boy:  'echo',    // clear, young male
  auto: 'shimmer', // gentle neutral
}

// ── Microsoft Azure Neural voice map ─────────────────────────────────────
const AZURE_VOICES: Record<string, { girl: string; boy: string }> = {
  en: { girl: 'en-US-JennyNeural',      boy: 'en-US-GuyNeural'       },
  fr: { girl: 'fr-FR-DeniseNeural',     boy: 'fr-FR-HenriNeural'     },
  es: { girl: 'es-ES-ElviraNeural',     boy: 'es-ES-AlvaroNeural'    },
  ar: { girl: 'ar-SA-ZariyahNeural',    boy: 'ar-SA-HamedNeural'     },
  hi: { girl: 'hi-IN-SwaraNeural',      boy: 'hi-IN-MadhurNeural'    },
  zh: { girl: 'zh-CN-XiaoxiaoNeural',   boy: 'zh-CN-YunxiNeural'     },
  pt: { girl: 'pt-BR-FranciscaNeural',  boy: 'pt-BR-AntonioNeural'   },
  de: { girl: 'de-DE-KatjaNeural',      boy: 'de-DE-ConradNeural'    },
  tr: { girl: 'tr-TR-EmelNeural',       boy: 'tr-TR-AhmetNeural'     },
  ur: { girl: 'ur-PK-UzmaNeural',       boy: 'ur-PK-AsadNeural'      },
}
const AZURE_LANG_CODES: Record<string, string> = {
  en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-SA',
  hi: 'hi-IN', zh: 'zh-CN', pt: 'pt-BR', de: 'de-DE',
  tr: 'tr-TR', ur: 'ur-PK',
}

// ── HTTP helper ───────────────────────────────────────────────────────────

function httpsPost(url: string, body: string | Buffer, headers: Record<string, string>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const bodyBuf = typeof body === 'string' ? Buffer.from(body) : body
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: { ...headers, 'Content-Length': String(bodyBuf.byteLength) },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString().slice(0, 200)}`))
          } else {
            resolve(Buffer.concat(chunks))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(bodyBuf)
    req.end()
  })
}

// ── 1. Google Cloud TTS ───────────────────────────────────────────────────

async function googleTTS(text: string, language: string, profile: TTSProfile): Promise<string | null> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) return null

  const lang = language in GOOGLE_LANG_CODES ? language : 'en'
  const voiceSet = GOOGLE_VOICES[lang] ?? GOOGLE_VOICES['en']
  const voiceName = profile === 'boy' ? voiceSet.boy : voiceSet.girl

  const payload = JSON.stringify({
    input: { text },
    voice: { languageCode: GOOGLE_LANG_CODES[lang], name: voiceName },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 0.85,
      pitch: profile === 'girl' ? 2 : profile === 'boy' ? -1 : 0,
    },
  })

  const buf = await httpsPost(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    payload,
    { 'Content-Type': 'application/json' }
  )

  const json = JSON.parse(buf.toString())
  if (!json.audioContent) throw new Error('Google TTS: no audioContent in response')
  return `data:audio/mp3;base64,${json.audioContent}`
}

// ── 2. OpenAI TTS ─────────────────────────────────────────────────────────

async function openaiTTS(text: string, profile: TTSProfile): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const payload = JSON.stringify({ model: 'tts-1', input: text, voice: OPENAI_VOICES[profile], speed: 0.9 })
  const buf = await httpsPost(
    'https://api.openai.com/v1/audio/speech',
    payload,
    { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }
  )

  return `data:audio/mp3;base64,${buf.toString('base64')}`
}

// ── 3. Microsoft Azure TTS ────────────────────────────────────────────────

async function azureTTS(text: string, language: string, profile: TTSProfile): Promise<string | null> {
  const apiKey = process.env.AZURE_TTS_KEY
  const region  = process.env.AZURE_TTS_REGION || 'eastus'
  if (!apiKey) return null

  const lang = language in AZURE_LANG_CODES ? language : 'en'
  const langCode = AZURE_LANG_CODES[lang]
  const voiceSet = AZURE_VOICES[lang] ?? AZURE_VOICES['en']
  const voiceName = profile === 'boy' ? voiceSet.boy : voiceSet.girl
  const rate = '-10%'  // slightly slower for children
  const pitch = profile === 'girl' ? '+5Hz' : profile === 'boy' ? '-5Hz' : '+0Hz'

  const ssml = `<speak version='1.0' xml:lang='${langCode}'><voice name='${voiceName}'><prosody rate='${rate}' pitch='${pitch}'>${text}</prosody></voice></speak>`

  const buf = await httpsPost(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    ssml,
    {
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'Ocp-Apim-Subscription-Key': apiKey,
    }
  )

  return `data:audio/mp3;base64,${buf.toString('base64')}`
}

// ── Public API ────────────────────────────────────────────────────────────

export interface TTSResult {
  dataUrl: string
  provider: 'google' | 'openai' | 'azure' | 'cache'
}

export async function synthesize(
  text: string,
  language = 'en',
  profile: TTSProfile = 'auto'
): Promise<TTSResult | null> {
  if (!text?.trim()) return null

  // Cache check first — same inputs never hit any API twice
  const cacheKey = makeCacheKey('tts', { text: text.trim(), language, profile })
  const cached = await getCachedResponse(cacheKey)
  if (cached) return { dataUrl: cached, provider: 'cache' }

  // 1. Google (primary — free 1M chars/month)
  try {
    const dataUrl = await googleTTS(text.trim(), language, profile)
    if (dataUrl) {
      await setCachedResponse(cacheKey, 'tts', dataUrl, 'google-tts')
      return { dataUrl, provider: 'google' }
    }
  } catch (err) {
    console.warn('[TTS] Google failed, trying OpenAI:', (err as Error).message)
  }

  // 2. OpenAI (secondary)
  try {
    const dataUrl = await openaiTTS(text.trim(), profile)
    if (dataUrl) {
      await setCachedResponse(cacheKey, 'tts', dataUrl, 'openai-tts')
      return { dataUrl, provider: 'openai' }
    }
  } catch (err) {
    console.warn('[TTS] OpenAI failed, trying Azure:', (err as Error).message)
  }

  // 3. Microsoft Azure (tertiary — free 500K chars/month)
  try {
    const dataUrl = await azureTTS(text.trim(), language, profile)
    if (dataUrl) {
      await setCachedResponse(cacheKey, 'tts', dataUrl, 'azure-tts')
      return { dataUrl, provider: 'azure' }
    }
  } catch (err) {
    console.warn('[TTS] Azure failed:', (err as Error).message)
  }

  // All providers failed → frontend uses Web Speech API fallback
  return null
}
