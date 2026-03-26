'use client'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'

/**
 * Consistent top-right action buttons for all role headers.
 * Always renders in a horizontal row: [optional extras] [Settings] [Logout]
 * 
 * Usage:
 *   <TopBarActions />                          — logout only
 *   <TopBarActions showSettings />             — settings + logout
 *   <TopBarActions settingsHref="/child/settings" showSettings />
 *   <TopBarActions extra={<button>📊 Report</button>} />
 */
export default function TopBarActions({
  showSettings = false,
  settingsHref = '/child/settings',
  variant = 'light', // 'light' for on gradient headers (white icons), 'dark' for on light surfaces
  extra,
}: {
  showSettings?: boolean
  settingsHref?: string
  variant?: 'light' | 'dark'
  extra?: React.ReactNode
}) {
  const router = useRouter()
  const logout = useAppStore(s => s.logout)

  const btnClass = variant === 'light'
    ? 'flex items-center justify-center rounded-xl text-sm font-bold active:scale-95 transition-all app-pressable'
    : 'flex items-center justify-center rounded-xl text-sm font-bold active:scale-95 transition-all app-pressable'

  const btnStyle = variant === 'light'
    ? { background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', backdropFilter: 'blur(8px)' }
    : { background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'rgb(var(--foreground-rgb))' }

  return (
    <div className="flex items-center gap-2">
      {extra}

      {showSettings && (
        <button
          onClick={() => router.push(settingsHref)}
          className={`${btnClass} w-10 h-10`}
          style={btnStyle}
          title="Settings"
        >
          ⚙️
        </button>
      )}

      <button
        onClick={() => { logout(); router.push('/') }}
        className={`${btnClass} h-10 px-3 gap-1.5`}
        style={btnStyle}
        title="Sign out"
      >
        <span>🚪</span>
        <span className="hidden sm:inline text-xs font-bold">Logout</span>
      </button>
    </div>
  )
}
