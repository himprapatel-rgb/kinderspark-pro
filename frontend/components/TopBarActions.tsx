'use client'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { Settings, UserRound } from 'lucide-react'

/**
 * Top-right actions: Profile, optional role switcher, optional Settings.
 * Sign out lives only in Profile / Settings screens (see ProfileManager).
 */
export default function TopBarActions({
  showSettings = false,
  settingsHref = '/child/settings',
  profileHref,
  showRoleSwitcher = true,
  variant = 'light',
  extra,
}: {
  showSettings?: boolean
  settingsHref?: string
  /** Defaults to /{role}/profile */
  profileHref?: string
  showRoleSwitcher?: boolean
  variant?: 'light' | 'dark'
  extra?: React.ReactNode
}) {
  const router = useRouter()
  const role = useAppStore(s => s.role)
  const availableRoles = useAppStore(s => s.availableRoles)
  const switchRole = useAppStore(s => s.switchRole)

  const resolvedProfile = profileHref || `/${role || 'child'}/profile`

  const btnClass = variant === 'light'
    ? 'flex items-center justify-center rounded-xl text-sm font-bold active:scale-95 transition-all app-pressable app-btn-glass min-h-10 min-w-10'
    : 'flex items-center justify-center rounded-xl text-sm font-bold active:scale-95 transition-all app-pressable app-btn-soft min-h-10 min-w-10'

  return (
    <div className="flex items-center gap-2">
      {extra}

      <button
        type="button"
        onClick={() => router.push(resolvedProfile)}
        className={btnClass}
        title="Profile"
        aria-label="Profile"
      >
        <UserRound size={17} aria-hidden />
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
          className="min-h-10 rounded-xl px-2 text-xs font-black app-field app-pressable"
          style={{ minWidth: 92 }}
        >
          {availableRoles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      )}

      {showSettings && (
        <button
          type="button"
          onClick={() => router.push(settingsHref)}
          className={btnClass}
          title="Settings"
          aria-label="Settings"
        >
          <Settings size={17} aria-hidden />
        </button>
      )}
    </div>
  )
}
