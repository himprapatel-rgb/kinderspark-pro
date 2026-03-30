'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { generatePoemSpark, getSparkArtifacts } from '@/lib/api'
import { speak, stopSpeaking, isVoiceEnabled, setVoiceEnabled } from '@/lib/speech'

const MINUTES_OPTS = [3, 4, 5, 6, 7, 8] as const

export default function ChildPoemPage() {
  const router = useRouter()
  const user = useAppStore((s) => s.user)
  const currentStudent = useAppStore((s) => s.currentStudent)
  const student = currentStudent || user

  const [spark, setSpark] = useState('')
  const [targetMinutes, setTargetMinutes] = useState<number>(4)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [poem, setPoem] = useState('')
  const [saved, setSaved] = useState<any[]>([])
  const [voiceOn, setVoiceOn] = useState(true)

  useEffect(() => {
    if (!student) {
      router.push('/')
      return
    }
    setVoiceOn(isVoiceEnabled())
    getSparkArtifacts('poem-listen-spark')
      .then((rows) => setSaved(Array.isArray(rows) ? rows : []))
      .catch(() => {})
    return () => {
      stopSpeaking()
    }
  }, [student, router])

  const onGenerate = async () => {
    if (!spark.trim() || busy) return
    setBusy(true)
    try {
      const res = await generatePoemSpark({ spark: spark.trim(), targetMinutes })
      setTitle(res.title || 'Your poem')
      setPoem(res.poem || '')
      const rows = await getSparkArtifacts('poem-listen-spark').catch(() => [])
      setSaved(Array.isArray(rows) ? rows : [])
    } catch {
      setTitle('Try again')
      setPoem('We could not reach the poem helper. Check your connection and try again!')
    } finally {
      setBusy(false)
    }
  }

  const onListen = () => {
    if (!poem) return
    speak(`${title}. ${poem.replace(/\n+/g, ' ')}`, { rate: 0.92 })
  }

  const toggleVoice = () => {
    const next = !voiceOn
    setVoiceOn(next)
    setVoiceEnabled(next)
    if (!next) stopSpeaking()
  }

  return (
    <div className="min-h-screen pb-28 app-container" style={{ background: 'var(--app-bg)' }}>
      <div
        className="px-4 pt-10 pb-4 flex items-center justify-between gap-2"
        style={{ background: 'linear-gradient(145deg, var(--theme-color, #5B7FE8), var(--theme-secondary, #8B6CC1))' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 rounded-2xl flex items-center justify-center app-pressable text-white/90"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="font-black text-lg text-white inline-flex items-center gap-2">
            <Sparkles size={18} /> AI Poem
          </h1>
        </div>
        <button
          type="button"
          onClick={toggleVoice}
          className="w-10 h-10 rounded-2xl flex items-center justify-center app-pressable text-white"
          style={{ background: 'rgba(255,255,255,0.15)' }}
          aria-label={voiceOn ? 'Mute voice' : 'Enable voice'}
        >
          {voiceOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <p className="text-xs font-bold app-muted leading-relaxed">
          Add <strong>one word</strong> or a <strong>very short line</strong>. KinderSpark builds a gentle poem you can listen to (about 3–8 minutes).
        </p>

        <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <label className="text-xs font-black app-muted block mb-2">Your idea (spark)</label>
          <input
            value={spark}
            onChange={(e) => setSpark(e.target.value)}
            maxLength={80}
            placeholder="e.g. dinosaurs, friendship, rainbows"
            className="w-full app-input text-sm font-bold mb-3"
          />
          <label className="text-xs font-black app-muted block mb-2">How long to listen</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {MINUTES_OPTS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTargetMinutes(m)}
                className="min-h-11 px-3 rounded-xl text-xs font-black app-pressable"
                style={{
                  background: targetMinutes === m ? 'rgba(91,127,232,0.25)' : 'var(--app-surface-soft)',
                  border: targetMinutes === m ? '1.5px solid var(--theme-color, #5B7FE8)' : '1px solid var(--app-border)',
                }}
              >
                {m} min
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={busy || !spark.trim()}
            className="w-full py-3.5 rounded-2xl font-black app-pressable active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #5B7FE8, #8B6CC1)',
              color: '#fff',
              opacity: busy || !spark.trim() ? 0.5 : 1,
            }}
          >
            {busy ? 'Writing your poem…' : 'Make my poem ✨'}
          </button>
        </div>

        {poem ? (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
            <div className="font-black text-base">{title}</div>
            <div className="text-sm font-bold leading-relaxed whitespace-pre-wrap app-muted">{poem}</div>
            <button
              type="button"
              onClick={onListen}
              disabled={!voiceOn}
              className="w-full py-3 rounded-xl font-black app-pressable flex items-center justify-center gap-2"
              style={{ background: 'rgba(48,209,88,0.2)', color: '#30D158', border: '1px solid rgba(48,209,88,0.35)' }}
            >
              <Volume2 size={18} /> Listen
            </button>
          </div>
        ) : null}

        {saved.length > 0 ? (
          <div className="rounded-2xl p-4" style={{ background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)' }}>
            <div className="font-black text-sm mb-2">Your saved poems</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {saved.slice(0, 8).map((row: any) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setTitle(row.title || 'Poem')
                    setPoem(row.body || '')
                  }}
                  className="w-full text-left rounded-xl p-3 app-pressable"
                  style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
                >
                  <div className="font-black text-xs truncate">{row.title || 'Poem'}</div>
                  <div className="text-[10px] font-bold app-muted truncate">Spark: {row.spark}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
