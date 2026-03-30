'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import KidAvatar from '@/components/KidAvatar'
import { AvatarConfig, DEFAULT_AVATAR_CONFIG, saveAvatarConfig, upsertAvatarToken, getAvatarConfigFromOwnedItems } from '@/lib/avatar'
import { updateStudent } from '@/lib/api'

const OPTIONS = {
  tone: ['light', 'medium', 'dark'] as const,
  hair: ['short', 'bob', 'curly', 'spiky', 'puffs'] as const,
  eyes: ['round', 'smile', 'sparkle'] as const,
  outfit: ['tee', 'hoodie', 'dress', 'overalls'] as const,
  accessory: ['none', 'glasses', 'star'] as const,
}

export default function AvatarBuilderPage() {
  const router = useRouter()
  const student = useAppStore((s) => s.currentStudent || s.user)
  const [cfg, setCfg] = useState<AvatarConfig>(() => getAvatarConfigFromOwnedItems((student as any)?.ownedItems) || DEFAULT_AVATAR_CONFIG)
  const [saving, setSaving] = useState(false)

  const canSave = !!student?.id && !saving

  const setPart = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    setCfg((p) => ({ ...p, [key]: value }))
  }

  const onSave = async () => {
    if (!student?.id) return
    setSaving(true)
    saveAvatarConfig(student.id, cfg)
    const nextOwnedItems = upsertAvatarToken((student as any)?.ownedItems, cfg)
    // Keep backend avatar as fallback emoji while custom config is rendered client-side.
    await updateStudent(student.id, {
      avatar: student.avatar || '🧒',
      ownedItems: nextOwnedItems,
    }).catch(() => {})
    setSaving(false)
    router.push('/child/profile')
  }

  return (
    <div className="min-h-screen pb-24 app-container" style={{ background: 'var(--app-bg)' }}>
      <div className="p-5 pt-10" style={{ background: 'linear-gradient(135deg, var(--app-accent), var(--role-admin))' }}>
        <button onClick={() => router.back()} className="text-white/80 font-bold mb-3 app-pressable">← Back</button>
        <h1 className="text-2xl font-black text-white">Avatar Builder</h1>
        <p className="text-white/80 font-bold text-sm mt-1">Create your own character style.</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div className="rounded-2xl p-4 flex items-center justify-center" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center sticker-bubble" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <KidAvatar studentId={student?.id} fallback={student?.avatar || '🧒'} size={102} configOverride={cfg} />
          </div>
        </div>

        {(
          [
            ['tone', 'Skin'],
            ['hair', 'Hair'],
            ['eyes', 'Eyes'],
            ['outfit', 'Outfit'],
            ['accessory', 'Accessory'],
          ] as Array<[keyof AvatarConfig, string]>
        ).map(([k, label]) => (
          <div key={k} className="rounded-2xl p-4" style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
            <div className="font-black text-sm mb-2">{label}</div>
            <div className="grid grid-cols-3 gap-2">
              {(OPTIONS[k] as readonly string[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPart(k, opt as any)}
                  className="min-h-11 py-2 rounded-xl text-xs font-black app-pressable"
                  style={{
                    background: cfg[k] === opt ? 'var(--app-accent)' : 'var(--app-surface-soft)',
                    color: cfg[k] === opt ? '#fff' : 'rgb(var(--foreground-rgb))',
                    border: cfg[k] === opt ? '2px solid color-mix(in srgb, var(--app-accent) 78%, white 22%)' : '1px solid var(--app-border)',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="w-full min-h-11 py-3 rounded-2xl font-black text-sm app-pressable disabled:opacity-55"
          style={{ background: 'linear-gradient(135deg, var(--app-gold), var(--app-warning))', color: '#2B1F10' }}
        >
          {saving ? 'Saving...' : 'Save My Avatar'}
        </button>
      </div>
    </div>
  )
}

