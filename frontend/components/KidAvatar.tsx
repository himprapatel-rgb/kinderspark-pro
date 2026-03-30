'use client'
import { useMemo } from 'react'
import { AvatarConfig, DEFAULT_AVATAR_CONFIG, getAvatarConfig, getAvatarConfigFromOwnedItems, saveAvatarConfig } from '@/lib/avatar'

const SKIN: Record<AvatarConfig['tone'], string> = {
  light: '#F7D9C4',
  medium: '#D8A47F',
  dark: '#8D5A3B',
}

const HAIR: Record<AvatarConfig['hair'], string> = {
  short: '#3A2A1E',
  bob: '#2E2A36',
  curly: '#4A3326',
  spiky: '#2B2B2B',
  puffs: '#3C2F2F',
}

const OUTFIT: Record<AvatarConfig['outfit'], string> = {
  tee: '#5B7FE8',
  hoodie: '#8B6CC1',
  dress: '#FF6FAE',
  overalls: '#4CAF6A',
}

export default function KidAvatar({
  studentId,
  fallback = '🧒',
  size = 64,
  className,
  configOverride,
  ownedItems,
}: {
  studentId?: string
  fallback?: string
  size?: number
  className?: string
  configOverride?: AvatarConfig
  ownedItems?: string[] | null
}) {
  const cfg = useMemo(
    () => {
      if (configOverride) return configOverride
      const local = getAvatarConfig(studentId)
      if (local) return local
      const remote = getAvatarConfigFromOwnedItems(ownedItems)
      if (remote && studentId) saveAvatarConfig(studentId, remote)
      return remote || DEFAULT_AVATAR_CONFIG
    },
    [configOverride, studentId, ownedItems]
  )

  if (!studentId) {
    return <span className={className} style={{ fontSize: Math.round(size * 0.56) }}>{fallback}</span>
  }

  const eyeY = cfg.eyes === 'smile' ? 44 : 42
  const mouth = cfg.eyes === 'smile' ? 'M36 54 Q50 64 64 54' : 'M38 57 Q50 62 62 57'

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Custom avatar">
      <circle cx="50" cy="50" r="48" fill="rgba(255,255,255,0.24)" />
      <rect x="22" y="60" width="56" height="30" rx="14" fill={OUTFIT[cfg.outfit]} />
      <circle cx="50" cy="44" r="24" fill={SKIN[cfg.tone]} />

      {cfg.hair === 'short' && <path d="M28 41 Q50 16 72 41 L72 34 Q50 8 28 34 Z" fill={HAIR[cfg.hair]} />}
      {cfg.hair === 'bob' && <path d="M24 41 Q50 14 76 41 L76 58 Q68 66 58 66 L42 66 Q32 66 24 58 Z" fill={HAIR[cfg.hair]} />}
      {cfg.hair === 'curly' && (
        <>
          <circle cx="34" cy="30" r="10" fill={HAIR[cfg.hair]} />
          <circle cx="50" cy="24" r="12" fill={HAIR[cfg.hair]} />
          <circle cx="66" cy="30" r="10" fill={HAIR[cfg.hair]} />
        </>
      )}
      {cfg.hair === 'spiky' && <path d="M28 38 L36 24 L44 36 L50 20 L56 36 L64 24 L72 38 Z" fill={HAIR[cfg.hair]} />}
      {cfg.hair === 'puffs' && (
        <>
          <circle cx="22" cy="38" r="10" fill={HAIR[cfg.hair]} />
          <circle cx="78" cy="38" r="10" fill={HAIR[cfg.hair]} />
          <path d="M28 41 Q50 18 72 41 L72 34 Q50 10 28 34 Z" fill={HAIR[cfg.hair]} />
        </>
      )}

      {cfg.eyes === 'round' && (
        <>
          <circle cx="41" cy={eyeY} r="3.5" fill="#222" />
          <circle cx="59" cy={eyeY} r="3.5" fill="#222" />
        </>
      )}
      {cfg.eyes === 'smile' && (
        <>
          <path d="M36 43 Q41 48 46 43" stroke="#222" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M54 43 Q59 48 64 43" stroke="#222" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {cfg.eyes === 'sparkle' && (
        <>
          <path d="M41 39 L42.5 42 L45.5 43.5 L42.5 45 L41 48 L39.5 45 L36.5 43.5 L39.5 42 Z" fill="#222" />
          <path d="M59 39 L60.5 42 L63.5 43.5 L60.5 45 L59 48 L57.5 45 L54.5 43.5 L57.5 42 Z" fill="#222" />
        </>
      )}

      <path d={mouth} stroke="#8B3A3A" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {cfg.accessory === 'glasses' && (
        <>
          <rect x="33" y="37" width="16" height="11" rx="5.5" stroke="#2B2B2B" fill="none" strokeWidth="2" />
          <rect x="51" y="37" width="16" height="11" rx="5.5" stroke="#2B2B2B" fill="none" strokeWidth="2" />
          <path d="M49 42 H51" stroke="#2B2B2B" strokeWidth="2" />
        </>
      )}
      {cfg.accessory === 'star' && (
        <path d="M72 26 L74.5 31 L80 31.7 L76 35.6 L77.2 41 L72 38.2 L66.8 41 L68 35.6 L64 31.7 L69.5 31 Z" fill="#F5B731" />
      )}
    </svg>
  )
}

