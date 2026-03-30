'use client'
import { useState } from 'react'
import { useAppStore } from '@/store/appStore'

const ACCENTS = [
  { id: 'violet', color: '#5B7FE8' },
  { id: 'blue', color: '#0A84FF' },
  { id: 'green', color: '#4CAF6A' },
  { id: 'orange', color: '#F5A623' },
  { id: 'pink', color: '#FF2D55' },
] as const

export default function ThemeCustomizer() {
  const [open, setOpen] = useState(false)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)

  // Only show in development or when explicitly enabled
  const isDev = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS === 'true'
  if (!isDev) return null

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 14, zIndex: 60 }}>
      {open && (
        <div
          style={{
            width: 220,
            borderRadius: 14,
            padding: 12,
            marginBottom: 8,
            background: 'var(--app-surface)',
            border: '1px solid rgba(120,120,140,0.25)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 8 }}>Appearance</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button
              onClick={() => updateSettings({ dark: false })}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 12,
                border: settings.dark ? '1px solid #d8dbe8' : '2px solid var(--app-accent)',
                background: '#fff',
              }}
            >
              Light
            </button>
            <button
              onClick={() => updateSettings({ dark: true })}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 12,
                border: settings.dark ? '2px solid var(--app-accent)' : '1px solid #3f455e',
                background: '#1a1f33',
                color: '#fff',
              }}
            >
              Dark
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => updateSettings({ hc: !settings.hc })}
                aria-label={`Set accent ${a.id}`}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  border: '1px solid rgba(0,0,0,0.2)',
                  background: a.color,
                }}
              />
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          border: '1px solid rgba(120,120,140,0.25)',
          background: 'var(--app-surface)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
          fontSize: 18,
        }}
        aria-label="Toggle appearance controls"
      >
        🎨
      </button>
    </div>
  )
}
