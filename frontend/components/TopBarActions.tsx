'use client'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { LogOut, Settings, UserRound } from 'lucide-react'

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
  showRoleSwitcher = true,
  variant = 'light', // 'light' for on gradient headers (white icons), 'dark' for on light surfaces
  extra,
}: {
  showSettings?: boolean
  settingsHref?: string
  showRoleSwitcher?: boolean
  variant?: 'light' | 'dark'
  extra?: React.ReactNode
}) {
  const router = useRouter()
  const logout = useAppStore(s => s.logout)
  const role = useAppStore(s => s.role)
  const availableRoles = useAppStore(s => s.availableRoles)
  const switchRole = useAppStore(s => s.switchRole)

  const btnClass = variant === 'light'
    ? 'flex items-center justify-center rounded-xl text-sm font-bold active:scale-95 transition-all app-pressable app-btn-glass'
    : 'flex items-center justify-center rounded-xl text-sm font-bold active:scale-95 transition-all app-pressable app-btn-soft'

  return (
    <div className="flex items-center gap-2">
      {extra}

      <button
        onClick={() => router.push(`/${role || 'child'}/profile`)}
        className={`${btnClass} w-10 h-10`}
        title="Profile"
      >
        <UserRound size={16} />
      </button>

      {showRoleSwitcher && availableRoles.length > 1 && (
        <select
          aria-label="Switch role"
          value={role || availableRoles[0]}
          onChange={(e) => {
            const nextRole = e.target.value as 'teacher' | 'parent' | 'child' | 'admin' | 'principal'
            switchRole(nextRole)
            const route = nextRole === 'principal' ? '/admin' : `/${nextRole}`
            router.push(route)
          }}
          className="h-10 rounded-xl px-2 text-xs font-black app-field app-pressable"
          style={{ minWidth: 92 }}
        >
          {availableRoles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      )}

      {showSettings && (
        <button
          onClick={() => router.push(settingsHref)}
          className={`${btnClass} w-10 h-10`}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      )}

      <button
        onClick={() => { logout(); router.push('/') }}
        className={`${btnClass} h-10 px-3 gap-1.5`}
        title="Sign out"
      >
        <LogOut size={15} />
        <span className="hidden sm:inline text-xs font-bold">Logout</span>
      </button>
    </div>
  )
}
