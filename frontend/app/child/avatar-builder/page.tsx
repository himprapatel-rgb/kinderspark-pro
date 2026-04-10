'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import KidAvatar from '@/components/KidAvatar'
import Confetti from '@/components/Confetti'
import {
  AvatarConfig,
  AvatarHair,
  AvatarHairColor,
  AvatarEyes,
  DEFAULT_AVATAR_CONFIG,
  saveAvatarConfig,
  upsertAvatarToken,
  getAvatarConfigFromOwnedItems,
} from '@/lib/avatar'
import { updateStudent } from '@/lib/api'

const SKIN_HEX: Record<AvatarConfig['tone'], string> = {
  light: '#F7D9C4', medium: '#D8A47F', dark: '#8D5A3B',
}
const HAIR_COLOR_HEX: Record<AvatarHairColor, string> = {
  black: '#2B2B2B', brown: '#7B4A2A', blonde: '#D4A017',
  red: '#B52A2A', white: '#E0E0D8', blue: '#4DAADF',
}
const OUTFIT_HEX: Record<AvatarConfig['outfit'], string> = {
  tee: '#5B7FE8', hoodie: '#8B6CC1', dress: '#FF6FAE', overalls: '#4CAF6A',
}
const OUTFIT_EMOJI: Record<AvatarConfig['outfit'], string> = {
  tee: '👕', hoodie: '🧥', dress: '👗', overalls: '🩱',
}
const OUTFIT_LABEL: Record<AvatarConfig['outfit'], string> = {
  tee: 'T-Shirt', hoodie: 'Hoodie', dress: 'Dress', overalls: 'Overalls',
}
const SCENE_BG: Record<AvatarConfig['outfit'], string> = {
  tee:      'linear-gradient(135deg, #4D88F5, #87B9FF)',
  hoodie:   'linear-gradient(135deg, #7B5CC1, #B08AE8)',
  dress:    'linear-gradient(135deg, #FF5F9E, #FF99C8)',
  overalls: 'linear-gradient(135deg, #3CA060, #6DD89A)',
}
const HAIR_STYLE_LABEL: Record<AvatarHair, string> = {
  short: 'Short', bob: 'Bob cut', curly: 'Curly', spiky: 'Spiky', puffs: 'Puffs',
}
const EYE_LABEL: Record<AvatarEyes, string> = {
  round: 'Big', smile: 'Happy', sparkle: 'Star',
}

function HairSwatch({ style, skinHex, hairHex }: { style: AvatarHair; skinHex: string; hairHex: string }) {
  return (
    <svg width={40} height={40} viewBox="0 0 100 88" style={{ display: 'block', overflow: 'visible' }}>
      <circle cx="50" cy="50" r="24" fill={skinHex} />
      {style === 'short'   && <path d="M28 41 Q50 16 72 41 L72 34 Q50 8 28 34 Z" fill={hairHex} />}
      {style === 'bob'     && <path d="M24 41 Q50 14 76 41 L76 58 Q68 66 58 66 L42 66 Q32 66 24 58 Z" fill={hairHex} />}
      {style === 'curly'   && <><circle cx="34" cy="30" r="10" fill={hairHex} /><circle cx="50" cy="24" r="12" fill={hairHex} /><circle cx="66" cy="30" r="10" fill={hairHex} /></>}
      {style === 'spiky'   && <path d="M28 38 L36 24 L44 36 L50 20 L56 36 L64 24 L72 38 Z" fill={hairHex} />}
      {style === 'puffs'   && <><circle cx="22" cy="38" r="10" fill={hairHex} /><circle cx="78" cy="38" r="10" fill={hairHex} /><path d="M28 41 Q50 18 72 41 L72 34 Q50 10 28 34 Z" fill={hairHex} /></>}
    </svg>
  )
}

function EyeSwatch({ style }: { style: AvatarEyes }) {
  return (
    <svg width={44} height={24} viewBox="28 34 44 24" style={{ display: 'block' }}>
      {style === 'round'   && <><circle cx="41" cy="44" r="4.5" fill="#222" /><circle cx="59" cy="44" r="4.5" fill="#222" /></>}
      {style === 'smile'   && <><path d="M36 43 Q41 49 46 43" stroke="#222" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M54 43 Q59 49 64 43" stroke="#222" strokeWidth="3" fill="none" strokeLinecap="round" /></>}
      {style === 'sparkle' && <><path d="M41 39 L42.5 42 L45.5 43.5 L42.5 45 L41 48 L39.5 45 L36.5 43.5 L39.5 42 Z" fill="#222" /><path d="M59 39 L60.5 42 L63.5 43.5 L60.5 45 L59 48 L57.5 45 L54.5 43.5 L57.5 42 Z" fill="#222" /></>}
    </svg>
  )
}

function PlainFaceSvg() {
  return (
    <svg width={32} height={32} viewBox="10 10 80 80">
      <circle cx="50" cy="50" r="36" fill="#D8A47F" />
      <circle cx="38" cy="46" r="4" fill="#333" />
      <circle cx="62" cy="46" r="4" fill="#333" />
      <path d="M38 60 Q50 68 62 60" stroke="#8B3A3A" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Strip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', gap: 10, overflowX: 'auto', padding: '4px 0 2px',
      scrollbarWidth: 'none',
      WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)',
      maskImage: 'linear-gradient(to right, black calc(100% - 32px), transparent 100%)',
    }}>
      {children}
    </div>
  )
}

export default function AvatarBuilderPage() {
  const router = useRouter()
  const student = useAppStore((s) => s.currentStudent || s.user)

  const [cfg, setCfg] = useState<AvatarConfig>(
    () => getAvatarConfigFromOwnedItems((student as any)?.ownedItems) || DEFAULT_AVATAR_CONFIG
  )
  const [saving, setSaving] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [saved, setSaved] = useState(false)
  const [popKey, setPopKey] = useState(0)

  const childName = (student as any)?.preferredName || (student as any)?.displayName || student?.name || 'You'

  const setPart = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    setCfg((p) => ({ ...p, [key]: value }))
    setPopKey((k) => k + 1)
  }

  const onSave = async () => {
    if (!student?.id || saving || saved) return
    setSaving(true)
    saveAvatarConfig(student.id, cfg)
    const nextOwnedItems = upsertAvatarToken((student as any)?.ownedItems, cfg)
    await updateStudent(student.id, {
      avatar: student.avatar || '🧒',
      ownedItems: nextOwnedItems,
    }).catch(() => {})
    setSaving(false)
    setShowConfetti(true)
    setSaved(true)
    setTimeout(() => {
      setShowConfetti(false)
      router.push('/child/profile')
    }, 3500)
  }

  const skinHex = SKIN_HEX[cfg.tone]
  const hairHex = HAIR_COLOR_HEX[cfg.hairColor || 'black']

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--app-bg)', fontFamily: 'var(--font-nunito), Nunito, sans-serif' }}>
      <style>{`
        @keyframes av-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes av-pop {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.08) rotate(2deg); }
          65%  { transform: scale(0.97) rotate(-1deg); }
          100% { transform: scale(1); }
        }
        .bldr-swatch { transition: transform 0.15s, box-shadow 0.15s; }
        .bldr-swatch:hover { transform: scale(1.06); }
      `}</style>

      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Save celebration overlay */}
      {saved && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,252,245,0.95)', backdropFilter: 'blur(8px)' }}>
          <div style={{ animation: 'av-pop 0.45s cubic-bezier(.16,1,.3,1) forwards' }}>
            <KidAvatar studentId={student?.id} fallback="🧒" size={200} configOverride={cfg} animated />
          </div>
          <p style={{ margin: '18px 0 4px', fontSize: 26, fontWeight: 900, color: '#1a1a1a', textAlign: 'center' }}>
            Looking great, {childName.split(' ')[0]}! ⭐
          </p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#888' }}>Your look is saved!</p>
        </div>
      )}

      {/* ── Hero — avatar lives here, outfit gradient reacts live ── */}
      <div
        className="page-hero"
        style={{ background: SCENE_BG[cfg.outfit], transition: 'background 0.4s ease' }}
      >
        <button
          onClick={() => router.back()}
          className="text-white text-sm font-bold mb-3 flex items-center gap-1 app-pressable min-h-[44px] px-1"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}
        >
          ← Back
        </button>

        <div className="flex flex-col items-center text-center gap-2">
          {/* Floating avatar */}
          <div style={{ animation: 'av-float 3s ease-in-out infinite', willChange: 'transform' }}>
            <div
              key={popKey}
              style={{ animation: popKey > 0 ? 'av-pop 0.38s cubic-bezier(.16,1,.3,1)' : undefined, willChange: 'transform' }}
            >
              <KidAvatar studentId={student?.id} fallback="🧒" size={110} configOverride={cfg} animated />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-black text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
              Make Your Look! 🎨
            </h1>
            <p className="text-xs font-bold mt-0.5" style={{ color: 'rgba(255,255,255,0.88)' }}>
              Tap anything below to change your style
            </p>
          </div>
        </div>
      </div>

      {/* ── Page body — same pattern as kid profile ── */}
      <div className="page-body">

        {/* Skin colour */}
        <div className="app-card">
          <p className="section-label mb-3">🎨 Skin colour</p>
          <Strip>
            {(Object.entries(SKIN_HEX) as [AvatarConfig['tone'], string][]).map(([k, hex]) => (
              <button
                key={k} type="button"
                className="bldr-swatch app-pressable"
                onClick={() => setPart('tone', k)}
                aria-pressed={cfg.tone === k}
                aria-label={`${k} skin tone`}
                style={{
                  flexShrink: 0, width: 58, height: 58, borderRadius: '50%',
                  border: 'none', cursor: 'pointer', background: hex,
                  boxShadow: cfg.tone === k ? `0 0 0 3px white, 0 0 0 6px #F5B731` : '0 2px 8px rgba(0,0,0,0.18)',
                }}
              />
            ))}
          </Strip>
        </div>

        {/* Hair style */}
        <div className="app-card">
          <p className="section-label mb-3">💇 Hair style</p>
          <Strip>
            {(Object.keys(HAIR_STYLE_LABEL) as AvatarHair[]).map((style) => {
              const sel = cfg.hair === style
              return (
                <button
                  key={style} type="button"
                  className="bldr-swatch app-pressable"
                  onClick={() => setPart('hair', style)}
                  aria-pressed={sel}
                  aria-label={HAIR_STYLE_LABEL[style]}
                  style={{
                    flexShrink: 0, width: 76, height: 76, borderRadius: 16,
                    border: sel ? '2.5px solid #F5B731' : '1.5px solid var(--app-border)',
                    background: sel ? 'rgba(245,183,49,0.12)' : 'var(--app-surface)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 4px',
                    boxShadow: sel ? '0 2px 12px rgba(245,183,49,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <HairSwatch style={style} skinHex={skinHex} hairHex={hairHex} />
                  <span style={{ fontSize: 10, fontWeight: 900, color: sel ? '#C79012' : 'var(--app-text-muted)', textAlign: 'center' }}>
                    {HAIR_STYLE_LABEL[style]}
                  </span>
                </button>
              )
            })}
          </Strip>
        </div>

        {/* Hair colour */}
        <div className="app-card">
          <p className="section-label mb-3">🌈 Hair colour</p>
          <Strip>
            {(Object.entries(HAIR_COLOR_HEX) as [AvatarHairColor, string][]).map(([k, hex]) => {
              const sel = cfg.hairColor === k
              const isWhite = k === 'white'
              return (
                <button
                  key={k} type="button"
                  className="bldr-swatch app-pressable"
                  onClick={() => setPart('hairColor', k)}
                  aria-pressed={sel}
                  aria-label={`${k} hair`}
                  style={{
                    flexShrink: 0, width: 52, height: 52, borderRadius: '50%',
                    border: isWhite ? '2px solid rgba(0,0,0,0.22)' : 'none',
                    cursor: 'pointer', background: hex,
                    boxShadow: sel
                      ? isWhite ? `0 0 0 3px #888, 0 0 0 6px #333` : `0 0 0 3px white, 0 0 0 6px #F5B731`
                      : '0 2px 8px rgba(0,0,0,0.18)',
                  }}
                />
              )
            })}
          </Strip>
        </div>

        {/* Eyes */}
        <div className="app-card">
          <p className="section-label mb-3">👁 Eyes</p>
          <Strip>
            {(Object.keys(EYE_LABEL) as AvatarEyes[]).map((style) => {
              const sel = cfg.eyes === style
              return (
                <button
                  key={style} type="button"
                  className="bldr-swatch app-pressable"
                  onClick={() => setPart('eyes', style)}
                  aria-pressed={sel}
                  aria-label={`${EYE_LABEL[style]} eyes`}
                  style={{
                    flexShrink: 0, width: 76, height: 76, borderRadius: 16,
                    border: sel ? '2.5px solid #F5B731' : '1.5px solid var(--app-border)',
                    background: sel ? 'rgba(245,183,49,0.12)' : 'var(--app-surface)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px',
                    boxShadow: sel ? '0 2px 12px rgba(245,183,49,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <EyeSwatch style={style} />
                  <span style={{ fontSize: 10, fontWeight: 900, color: sel ? '#C79012' : 'var(--app-text-muted)' }}>
                    {EYE_LABEL[style]}
                  </span>
                </button>
              )
            })}
          </Strip>
        </div>

        {/* Outfit */}
        <div className="app-card">
          <p className="section-label mb-3">👕 Outfit</p>
          <Strip>
            {(Object.entries(OUTFIT_HEX) as [AvatarConfig['outfit'], string][]).map(([k, hex]) => {
              const sel = cfg.outfit === k
              return (
                <button
                  key={k} type="button"
                  className="bldr-swatch app-pressable"
                  onClick={() => setPart('outfit', k)}
                  aria-pressed={sel}
                  aria-label={OUTFIT_LABEL[k]}
                  style={{
                    flexShrink: 0, width: 76, height: 76, borderRadius: 16,
                    border: sel ? `2.5px solid ${hex}` : '1.5px solid var(--app-border)',
                    background: sel ? `${hex}22` : 'var(--app-surface)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px',
                    boxShadow: sel ? `0 2px 12px ${hex}55` : '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: hex, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {OUTFIT_EMOJI[k]}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 900, color: sel ? hex : 'var(--app-text-muted)', textAlign: 'center' }}>
                    {OUTFIT_LABEL[k]}
                  </span>
                </button>
              )
            })}
          </Strip>
        </div>

        {/* Add-on */}
        <div className="app-card">
          <p className="section-label mb-3">✨ Add-on</p>
          <Strip>
            {([
              ['none',    null,  'Plain'],
              ['glasses', '👓',  'Glasses'],
              ['star',    '⭐',  'Star'],
            ] as const).map(([k, emoji, label]) => {
              const sel = cfg.accessory === k
              return (
                <button
                  key={k} type="button"
                  className="bldr-swatch app-pressable"
                  onClick={() => setPart('accessory', k)}
                  aria-pressed={sel}
                  aria-label={label}
                  style={{
                    flexShrink: 0, width: 76, height: 76, borderRadius: 16,
                    border: sel ? '2.5px solid #F5B731' : '1.5px solid var(--app-border)',
                    background: sel ? 'rgba(245,183,49,0.12)' : 'var(--app-surface)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 6px',
                    boxShadow: sel ? '0 2px 12px rgba(245,183,49,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
                    opacity: k === 'none' && !sel ? 0.65 : 1,
                  }}
                >
                  {k === 'none' ? <PlainFaceSvg /> : <span style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</span>}
                  <span style={{ fontSize: 10, fontWeight: 900, color: sel ? '#C79012' : 'var(--app-text-muted)' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </Strip>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={onSave}
          disabled={!student?.id || saving || saved}
          className="app-pressable w-full"
          style={{
            minHeight: 52, borderRadius: 18, border: 'none',
            fontWeight: 900, fontSize: 16, cursor: saving || saved ? 'default' : 'pointer',
            background: 'linear-gradient(135deg, #F5B731, #E8832A)',
            color: '#2B1F10',
            boxShadow: '0 4px 20px rgba(245,167,35,0.4)',
            opacity: saving ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {saving ? 'Saving...' : saved ? 'Saved! ✨' : 'Save My Look! ✨'}
        </button>

      </div>
    </div>
  )
}
