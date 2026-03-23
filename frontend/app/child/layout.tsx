'use client'
import { useAppStore } from '@/store/appStore'
import { useRouter, usePathname } from 'next/navigation'
import { SHOP_THS } from '@/lib/modules'

const THEME_SECONDARY: Record<string, string> = {
  th_def:    '#8b1cf7',
  th_ocean:  '#5856D6',
  th_forest: '#27AE7A',
  th_sunset: '#FF6B35',
  th_rose:   '#FF2D55',
  th_galaxy: '#7B2FBE',
}

const THEME_BG_TINT: Record<string, string> = {
  th_def:    '#1a0a2e',
  th_ocean:  '#0a1a2e',
  th_forest: '#0a1e12',
  th_sunset: '#1e100a',
  th_rose:   '#1e0a12',
  th_galaxy: '#120a1e',
}

const NAV_TABS = [
  { icon: '🏠', label: 'Home',   path: '/child' },
  { icon: '📚', label: 'Learn',  path: '/child/learn' },
  { icon: '🔤', label: 'Match',  path: '/child/match' },
  { icon: '🏆', label: 'Rank',   path: '/child/leaderboard' },
  { icon: '👤', label: 'Me',     path: '/child/settings' },
]

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const currentStudent = useAppStore(s => s.currentStudent)
  const user = useAppStore(s => s.user)
  const student = currentStudent || user
  const router = useRouter()
  const pathname = usePathname()

  const themeId = (student as any)?.selectedTheme || 'th_def'
  const theme = SHOP_THS.find(t => t.id === themeId) || SHOP_THS[0]
  const secondary = THEME_SECONDARY[themeId] || '#8b1cf7'
  const bgTint = THEME_BG_TINT[themeId] || '#1a0a2e'

  // Determine active tab (exact match for /child, prefix match otherwise)
  const activeIdx = NAV_TABS.findIndex(t =>
    t.path === '/child' ? pathname === '/child' : pathname.startsWith(t.path)
  )

  return (
    <div
      style={{
        '--theme-color': theme.color,
        '--theme-secondary': secondary,
        '--theme-bg-tint': bgTint,
        '--theme-glow': theme.color + '40',
        '--theme-soft': theme.color + '22',
        '--theme-border': theme.color + '44',
      } as React.CSSProperties}
    >
      {children}

      {/* Bottom Tab Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto flex items-center justify-around z-40"
        style={{
          background: 'rgba(10,8,20,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          paddingTop: 10,
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {NAV_TABS.map((tab, i) => {
          const active = i === activeIdx
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center gap-1 transition-all duration-200"
              style={{ minWidth: 52 }}
            >
              <div
                className="flex items-center justify-center rounded-2xl transition-all duration-200"
                style={{
                  width: 44,
                  height: 30,
                  background: active ? theme.color + '28' : 'transparent',
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <span
                  className="text-lg leading-none transition-all duration-200"
                  style={{ filter: active ? `drop-shadow(0 0 5px ${theme.color}99)` : 'none' }}
                >
                  {tab.icon}
                </span>
              </div>
              <span
                className="text-[9px] font-black transition-colors duration-200"
                style={{ color: active ? theme.color : 'rgba(255,255,255,0.3)' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
