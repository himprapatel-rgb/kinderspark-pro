'use client'
import { usePathname, useRouter } from 'next/navigation'
import { AppIcon } from '@/components/icons'
import type { IconName, IconRoleTone } from '@/components/icons'

interface NavItem {
  /** Icon name from the AppIcon registry */
  icon: IconName
  label: string
  href: string
  badge?: number
}

interface DashboardSidebarProps {
  role: 'teacher' | 'admin'
  items: NavItem[]
  userName?: string
  /** Profile / account (Sign Out lives on profile only) */
  profileHref?: string
  /** When provided, sidebar clicks call this instead of router.push */
  onItemClick?: (index: number) => void
  /** Index of the currently active tab (used with onItemClick) */
  activeIndex?: number
}

export default function DashboardSidebar({ role, items, userName, profileHref, onItemClick, activeIndex }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const resolvedProfile = profileHref || (role === 'admin' ? '/admin/profile' : '/teacher/profile')

  const roleColor = role === 'teacher' ? 'var(--role-teacher)' : 'var(--role-admin)'
  const roleLabel = role === 'teacher' ? 'Teacher' : 'Admin'
  const roleTone: IconRoleTone = role === 'teacher' ? 'teacher' : 'admin'

  return (
    <aside className="hidden lg:flex w-64 h-screen sticky top-0 flex-col border-r" style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b" style={{ borderColor: 'var(--app-border)' }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black text-white"
          style={{ background: `linear-gradient(135deg, var(--app-accent), ${roleColor})` }}
        >
          <AppIcon name="school" size="xs" roleTone={roleTone} state="success" />
        </div>
        <div>
          <div className="text-sm font-black" style={{ color: 'rgb(var(--foreground-rgb))' }}>
            Kinder<span style={{ color: 'var(--app-accent)' }}>Spark</span>
          </div>
          <div className="text-xs font-bold" style={{ color: 'var(--app-text-muted)' }}>{roleLabel} Portal</div>
        </div>
      </div>

      {/* User */}
      {userName && (
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--app-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
              style={{ background: roleColor }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: 'rgb(var(--foreground-rgb))' }}>{userName}</div>
              <div className="text-xs font-bold" style={{ color: 'var(--app-text-muted)' }}>{roleLabel}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item, idx) => {
          const active = activeIndex !== undefined
            ? idx === activeIndex
            : item.href === `/${role}`
              ? pathname === `/${role}`
              : pathname.startsWith(item.href)

          return (
            <button
              key={item.href + idx}
              onClick={() => onItemClick ? onItemClick(idx) : router.push(item.href)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 app-pressable ${active ? 'translate-x-0.5' : 'hover:bg-gray-50'}`}
              style={{
                background: active ? 'var(--app-accent)' : 'transparent',
                color: active ? '#fff' : 'var(--app-text-muted)',
                fontWeight: active ? 800 : 600,
                fontSize: '13px',
                boxShadow: active ? 'var(--app-shadow-sm)' : 'none',
              }}
            >
              <span className="text-base">
                <AppIcon
                  name={item.icon}
                  size="xs"
                  roleTone={roleTone}
                  state={active ? 'success' : 'default'}
                />
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded-full app-badge-pulse"
                  style={{
                    background: active ? 'rgba(255,255,255,0.25)' : 'var(--app-danger)',
                    color: '#fff',
                  }}
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom: profile */}
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: 'var(--app-border)' }}>
        <button
          type="button"
          onClick={() => router.push(resolvedProfile)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all app-pressable min-h-11"
          style={{ color: 'var(--app-text-muted)', fontSize: '13px', fontWeight: 700 }}
        >
          <AppIcon name="settings" size="sm" roleTone={roleTone} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
