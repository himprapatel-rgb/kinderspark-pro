export type AvatarTone = 'light' | 'medium' | 'dark'
export type AvatarHair = 'short' | 'bob' | 'curly' | 'spiky' | 'puffs'
export type AvatarHairColor = 'black' | 'brown' | 'blonde' | 'red' | 'white' | 'blue'
export type AvatarEyes = 'round' | 'smile' | 'sparkle'
export type AvatarOutfit = 'tee' | 'hoodie' | 'dress' | 'overalls'
export type AvatarAccessory = 'none' | 'glasses' | 'star'

export interface AvatarConfig {
  tone: AvatarTone
  hair: AvatarHair
  hairColor: AvatarHairColor
  eyes: AvatarEyes
  outfit: AvatarOutfit
  accessory: AvatarAccessory
}

const AVATAR_KEY = (studentId: string) => `ks_avatar_cfg_${studentId}`
const AVATAR_ITEM_PREFIX = 'avcfg:'

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  tone: 'medium',
  hair: 'short',
  hairColor: 'black',
  eyes: 'round',
  outfit: 'tee',
  accessory: 'none',
}

function toBase64Url(s: string): string {
  if (typeof window === 'undefined' || typeof window.btoa !== 'function') return ''
  return window.btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(s: string): string {
  if (typeof window === 'undefined' || typeof window.atob !== 'function') return ''
  const pad = '==='.slice((s.length + 3) % 4)
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  return decodeURIComponent(escape(window.atob(b64)))
}

export function encodeAvatarConfig(cfg: AvatarConfig): string {
  return `${AVATAR_ITEM_PREFIX}${toBase64Url(JSON.stringify(cfg))}`
}

export function decodeAvatarConfig(token: string): AvatarConfig | null {
  if (!token || !token.startsWith(AVATAR_ITEM_PREFIX)) return null
  try {
    const raw = token.slice(AVATAR_ITEM_PREFIX.length)
    const parsed = JSON.parse(fromBase64Url(raw)) as Partial<AvatarConfig>
    return { ...DEFAULT_AVATAR_CONFIG, ...parsed }
  } catch {
    return null
  }
}

export function getAvatarConfigFromOwnedItems(ownedItems?: string[] | null): AvatarConfig | null {
  if (!Array.isArray(ownedItems)) return null
  const token = ownedItems.find((x) => typeof x === 'string' && x.startsWith(AVATAR_ITEM_PREFIX))
  return token ? decodeAvatarConfig(token) : null
}

export function upsertAvatarToken(ownedItems: string[] | undefined | null, cfg: AvatarConfig): string[] {
  const base = Array.isArray(ownedItems) ? ownedItems.filter((x) => !String(x).startsWith(AVATAR_ITEM_PREFIX)) : []
  base.push(encodeAvatarConfig(cfg))
  return base
}

export function getAvatarConfig(studentId?: string): AvatarConfig | null {
  if (typeof window === 'undefined' || !studentId) return null
  try {
    const raw = localStorage.getItem(AVATAR_KEY(studentId))
    if (!raw) return null
    return { ...DEFAULT_AVATAR_CONFIG, ...(JSON.parse(raw) as Partial<AvatarConfig>) }
  } catch {
    return null
  }
}

export function saveAvatarConfig(studentId: string, cfg: AvatarConfig) {
  if (typeof window === 'undefined' || !studentId) return
  localStorage.setItem(AVATAR_KEY(studentId), JSON.stringify(cfg))
}
