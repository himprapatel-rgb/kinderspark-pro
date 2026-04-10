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

// ── Colour / label maps ──────────────────────────────────────────────────────

const SKIN_HEX: Record<AvatarConfig['tone'], string> = {
  light: '#F7D9C4',
  medium: '#D8A47F',
  dark: '#8D5A3B',
}

const HAIR_COLOR_HEX: Record<AvatarHairColor, string> = {
  black: '#2B2B2B',
  brown: '#7B4A2A',
  blonde: '#D4A017',
  red: '#B52A2A',
  white: '#E0E0D8',
  blue: '#4DAADF',
}

const OUTFIT_HEX: Record<AvatarConfig['outfit'], string> = {
  tee: '#5B7FE8',
  hoodie: '#8B6CC1',
  dress: '#FF6FAE',
  overalls: '#4CAF6A',
}
const OUTFIT_EMOJI: Record<AvatarConfig['outfit'], string> = {
  tee: '👕', hoodie: '🧥', dress: '👗', overalls: '🩱',
}
const OUTFIT_LABEL: Record<AvatarConfig['outfit'], string> = {
  tee: 'T-Shirt', hoodie: 'Hoodie', dress: 'Dress', overalls: 'Overalls',
}

const SCENE_BG: Record<AvatarConfig['outfit'], string> = {
  tee:      'linear-gradient(160deg, #4D88F5 0%, #87B9FF 100%)',
  hoodie:   'linear-gradient(160deg, #7B5CC1 0%, #B08AE8 100%)',
  dress:    'linear-gradient(160deg, #FF5F9E 0%, #FF99C8 100%)',
  overalls: 'linear-gradient(160deg, #3CA060 0%, #6DD89A 100%)',
}

const HAIR_STYLE_LABEL: Record<AvatarHair, string> = {
  short: 'Short', bob: 'Bob Cut', curly: 'Curly', spiky: 'Spiky', puffs: 'Puffs',
}

const EYE_LABEL: Record<AvatarEyes, string> = {
  round: 'Big', smile: 'Happy', sparkle: 'Star',
}

// ── Mini hair-preview SVG ────────────────────────────────────────────────────
function HairSwatch({ style, skinHex, hairHex }: { style: AvatarHair; skinHex: string; hairHex: string }) {
  return (
    <svg width={52} height={52} viewBox="0 0 100 88" style={{ display: 'block', overflow: 'visible' }}>
      <circle cx="50" cy="50" r="24" fill={skinHex} />
      {style === 'short' && (
        <path d="M28 41 Q50 16 72 41 L72 34 Q50 8 28 34 Z" fill={hairHex} />
      )}
      {style === 'bob' && (
        <path d="M24 41 Q50 14 76 41 L76 58 Q68 66 58 66 L42 66 Q32 66 24 58 Z" fill={hairHex} />
      )}
      {style === 'curly' && (
        <>
          <circle cx="34" cy="30" r="10" fill={hairHex} />
          <circle cx="50" cy="24" r="12" fill={hairHex} />
          <circle cx="66" cy="30" r="10" fill={hairHex} />
        </>
      )}
      {style === 'spiky' && (
        <path d="M28 38 L36 24 L44 36 L50 20 L56 36 L64 24 L72 38 Z" fill={hairHex} />
      )}
      {style === 'puffs' && (
        <>
          <circle cx="22" cy="38" r="10" fill={hairHex} />
          <circle cx="78" cy="38" r="10" fill={hairHex} />
          <path d="M28 41 Q50 18 72 41 L72 34 Q50 10 28 34 Z" fill={hairHex} />
        </>
      )}
    </svg>
  )
}

// ── Mini eye-preview SVG ─────────────────────────────────────────────────────
function EyeSwatch({ style }: { style: AvatarEyes }) {
  return (
    <svg width={52} height={30} viewBox="30 35 40 22" style={{ display: 'block' }}>
      {style === 'round' && (
        <>
          <circle cx="41" cy="44" r="4" fill="#222" />
          <circle cx="59" cy="44" r="4" fill="#222" />
        </>
      )}
      {style === 'smile' && (
        <>
          <path d="M36 43 Q41 49 46 43" stroke="#222" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M54 43 Q59 49 64 43" stroke="#222" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        </>
      )}
      {style === 'sparkle' && (
        <>
          <path d="M41 39 L42.5 42 L45.5 43.5 L42.5 45 L41 48 L39.5 45 L36.5 43.5 L39.5 42 Z" fill="#222" />
          <path d="M59 39 L60.5 42 L63.5 43.5 L60.5 45 L59 48 L57.5 45 L54.5 43.5 L57.5 42 Z" fill="#222" />
        </>
      )}
    </svg>
  )
}

// ── Swatch strip wrapper ─────────────────────────────────────────────────────
function Strip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ margin: '0 16px 10px', fontSize: 12, fontWeight: 900, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '2px 16px 10px', scrollbarWidth: 'none' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
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
    }, 2600)
  }

  const skinHex = SKIN_HEX[cfg.tone]
  const hairHex = HAIR_COLOR_HEX[cfg.hairColor || 'black']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', paddingBottom: 32, fontFamily: 'var(--font-nunito), Nunito, sans-serif' }}>
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* ── Save celebration overlay ─────────────────────────────────────── */}
      {saved && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,252,245,0.94)', backdropFilter: 'blur(8px)' }}>
          <div style={{ animation: 'av-pop 0.45s cubic-bezier(.16,1,.3,1) forwards' }}>
            <KidAvatar studentId={student?.id} fallback="🧒" size={210} configOverride={cfg} animated />
          </div>
          <p style={{ margin: '18px 0 4px', fontSize: 26, fontWeight: 900, color: 'rgb(var(--foreground-rgb))', textAlign: 'center' }}>
            Looking great, {childName.split(' ')[0]}! ⭐
          </p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--app-text-muted)' }}>Your look is saved!</p>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #F5A623, #E8832A)', padding: '14px 16px 18px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="app-pressable"
            onClick={() => router.back()}
            aria-label="Go back"
            style={{ minHeight: 44, minWidth: 44, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >←</button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.15)', lineHeight: 1.1 }}>
              Make Your Look! 🎨
            </h1>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>
              Tap anything to change your style
            </p>
          </div>
        </div>
      </div>

      {/* ── Avatar scene ─────────────────────────────────────────────────── */}
      <div
        style={{ background: SCENE_BG[cfg.outfit], padding: '32px 0 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden', transition: 'background 0.4s ease' }}
      >
        {/* Decorative dots */}
        {[15, 82, 28, 71, 44, 90, 6, 60, 35, 55, 76, 18].map((left, i) => (
          <div key={i} style={{ position: 'absolute', width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.28)', left: `${left}%`, top: `${[20, 65, 45, 15, 80, 35, 55, 10, 70, 40, 25, 88][i]}%`, pointerEvents: 'none' }} />
        ))}

        {/* Float wrapper (continuous) + pop wrapper (restarts on selection) */}
        <div style={{ animation: 'av-float 3s ease-in-out infinite', willChange: 'transform' }}>
          <div key={popKey} style={{ animation: popKey > 0 ? 'av-pop 0.38s cubic-bezier(.16,1,.3,1)' : undefined, willChange: 'transform' }}>
            <KidAvatar
              studentId={student?.id}
              fallback="🧒"
              size={220}
              configOverride={cfg}
              animated
            />
          </div>
        </div>

        <p style={{ margin: '14px 0 0', fontSize: 14, fontWeight: 900, color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
          {childName.split(' ')[0]}&apos;s Character ✨
        </p>
      </div>

      {/* ── Customisation strips ─────────────────────────────────────────── */}
      <div style={{ paddingTop: 20 }}>

        {/* Skin Colour */}
        <Strip label="🎨 Skin Color">
          {(Object.entries(SKIN_HEX) as [AvatarConfig['tone'], string][]).map(([k, hex]) => (
            <button
              key={k}
              type="button"
              className="app-pressable"
              onClick={() => setPart('tone', k)}
              aria-pressed={cfg.tone === k}
              aria-label={`${k} skin tone`}
              style={{
                flexShrink: 0,
                width: 62,
                height: 62,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: hex,
                boxShadow: cfg.tone === k
                  ? `0 0 0 3px white, 0 0 0 6px #F5B731`
                  : '0 3px 10px rgba(0,0,0,0.18)',
                transition: 'box-shadow 0.2s',
              }}
            />
          ))}
        </Strip>

        {/* Hair Style */}
        <Strip label="💇 Hair Style">
          {(Object.keys(HAIR_STYLE_LABEL) as AvatarHair[]).map((style) => {
            const sel = cfg.hair === style
            return (
              <button
                key={style}
                type="button"
                className="app-pressable"
                onClick={() => setPart('hair', style)}
                aria-pressed={sel}
                aria-label={HAIR_STYLE_LABEL[style]}
                style={{
                  flexShrink: 0,
                  width: 74,
                  minHeight: 82,
                  borderRadius: 18,
                  border: sel ? '2.5px solid #F5B731' : '1.5px solid var(--app-border)',
                  background: sel ? 'rgba(245,183,49,0.12)' : 'var(--app-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '8px 4px 7px',
                  boxShadow: sel ? '0 2px 14px rgba(245,183,49,0.32)' : '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <HairSwatch style={style} skinHex={skinHex} hairHex={hairHex} />
                <span style={{ fontSize: 11, fontWeight: 900, color: sel ? '#C79012' : 'var(--app-text-muted)', textAlign: 'center', lineHeight: 1.1 }}>
                  {HAIR_STYLE_LABEL[style]}
                </span>
              </button>
            )
          })}
        </Strip>

        {/* Hair Colour */}
        <Strip label="🌈 Hair Color">
          {(Object.entries(HAIR_COLOR_HEX) as [AvatarHairColor, string][]).map(([k, hex]) => (
            <button
              key={k}
              type="button"
              className="app-pressable"
              onClick={() => setPart('hairColor', k)}
              aria-pressed={cfg.hairColor === k}
              aria-label={`${k} hair`}
              style={{
                flexShrink: 0,
                width: 54,
                height: 54,
                borderRadius: '50%',
                border: k === 'white' ? '1.5px solid rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                background: hex,
                boxShadow: cfg.hairColor === k
                  ? `0 0 0 3px white, 0 0 0 6px #F5B731`
                  : '0 3px 10px rgba(0,0,0,0.18)',
                transition: 'box-shadow 0.2s',
              }}
            />
          ))}
        </Strip>

        {/* Eyes */}
        <Strip label="👁 Eyes">
          {(Object.keys(EYE_LABEL) as AvatarEyes[]).map((style) => {
            const sel = cfg.eyes === style
            return (
              <button
                key={style}
                type="button"
                className="app-pressable"
                onClick={() => setPart('eyes', style)}
                aria-pressed={sel}
                aria-label={`${EYE_LABEL[style]} eyes`}
                style={{
                  flexShrink: 0,
                  width: 84,
                  minHeight: 68,
                  borderRadius: 18,
                  border: sel ? '2.5px solid #F5B731' : '1.5px solid var(--app-border)',
                  background: sel ? 'rgba(245,183,49,0.12)' : 'var(--app-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 8px',
                  boxShadow: sel ? '0 2px 14px rgba(245,183,49,0.32)' : '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <EyeSwatch style={style} />
                <span style={{ fontSize: 11, fontWeight: 900, color: sel ? '#C79012' : 'var(--app-text-muted)' }}>
                  {EYE_LABEL[style]}
                </span>
              </button>
            )
          })}
        </Strip>

        {/* Outfit */}
        <Strip label="👕 Outfit">
          {(Object.entries(OUTFIT_HEX) as [AvatarConfig['outfit'], string][]).map(([k, hex]) => {
            const sel = cfg.outfit === k
            return (
              <button
                key={k}
                type="button"
                className="app-pressable"
                onClick={() => setPart('outfit', k)}
                aria-pressed={sel}
                aria-label={OUTFIT_LABEL[k]}
                style={{
                  flexShrink: 0,
                  width: 78,
                  minHeight: 76,
                  borderRadius: 18,
                  border: sel ? `2.5px solid ${hex}` : '1.5px solid var(--app-border)',
                  background: sel ? `${hex}22` : 'var(--app-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '8px 6px',
                  boxShadow: sel ? `0 2px 14px ${hex}55` : '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 12, background: hex, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {OUTFIT_EMOJI[k]}
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, color: sel ? hex : 'var(--app-text-muted)', textAlign: 'center', lineHeight: 1.1 }}>
                  {OUTFIT_LABEL[k]}
                </span>
              </button>
            )
          })}
        </Strip>

        {/* Add-On */}
        <Strip label="✨ Add-On">
          {([
            ['none',    '✗', 'Plain'],
            ['glasses', '👓', 'Glasses'],
            ['star',    '⭐', 'Star'],
          ] as const).map(([k, emoji, label]) => {
            const sel = cfg.accessory === k
            return (
              <button
                key={k}
                type="button"
                className="app-pressable"
                onClick={() => setPart('accessory', k)}
                aria-pressed={sel}
                aria-label={label}
                style={{
                  flexShrink: 0,
                  width: 84,
                  minHeight: 76,
                  borderRadius: 18,
                  border: sel ? '2.5px solid #F5B731' : '1.5px solid var(--app-border)',
                  background: sel ? 'rgba(245,183,49,0.12)' : 'var(--app-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '8px 6px',
                  boxShadow: sel ? '0 2px 14px rgba(245,183,49,0.32)' : '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <span style={{ fontSize: k === 'none' ? 22 : 30, opacity: k === 'none' ? 0.35 : 1, lineHeight: 1 }}>{emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: sel ? '#C79012' : 'var(--app-text-muted)' }}>
                  {label}
                </span>
              </button>
            )
          })}
        </Strip>

      </div>

      {/* ── Save button ──────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 16px 0' }}>
        <button
          type="button"
          onClick={onSave}
          disabled={!student?.id || saving || saved}
          className="app-pressable"
          style={{
            width: '100%',
            minHeight: 58,
            borderRadius: 20,
            border: 'none',
            fontWeight: 900,
            fontSize: 17,
            cursor: saving || saved ? 'default' : 'pointer',
            background: 'linear-gradient(135deg, #F5B731, #E8832A)',
            color: '#2B1F10',
            boxShadow: '0 4px 22px rgba(245,167,35,0.45)',
            opacity: saving ? 0.7 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {saving ? 'Saving...' : saved ? 'Saved! ✨' : 'Save My Look! ✨'}
        </button>
      </div>

      <style>{`
        @keyframes av-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes av-pop {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.09) rotate(2deg); }
          65%  { transform: scale(0.97) rotate(-1deg); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
