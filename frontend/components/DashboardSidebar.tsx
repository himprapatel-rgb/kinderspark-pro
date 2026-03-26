'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'

interface NavItem {
  icon: string
  label: string
  href: string
  badge?: number
}

interface DashboardSidebarProps {
  role: 'teacher' | 'admin'
  items: NavItem[]
  userName?: string
}

export default function DashboardSidebar({ role, items, userName }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useAppStore(s => s.logout)

  const roleColor = role === 'teacher' ? 'var(--role-teacher)' : 'var(--role-admin)'
  const roleLabel = role === 'teacher' ? 'Teacher' : 'Admin'

  return (
    <aside className="hidden lg:flex w-64 h-screen sticky top-0 flex-col border-r" style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b" style={{ borderColor: 'var(--app-border)' }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black text-white"
          style={{ background: `linear-gradient(135deg, var(--app-accent), ${roleColor})` }}
        >
          ⭐
        </div>
        <div>
          <div className="text-sm font-black" style={{ color: 'rgb(var(--foreground-rgb))' }}>
            Kinder<span style={{ color: 'var(--app-accent)' }}>Spark</span>
          </div>
          <div className="text-[10px] font-bold" style={{ color: 'var(--app-text-muted)' }}>{roleLabel} Portal</div>
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
              <div className="text-[10px] font-bold" style={{ color: 'var(--app-text-muted)' }}>{roleLabel}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(item => {
          const active = item.href === `/${role}`
            ? pathname === `/${role}`
            : pathname.startsWith(item.href)

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all app-pressable"
              style={{
                background: active ? `var(--app-accent)` : 'transparent',
                color: active ? '#fff' : 'var(--app-text-muted)',
                fontWeight: active ? 800 : 600,
                fontSize: '13px',
                boxShadow: active ? 'var(--app-shadow-sm)' : 'none',
              }}
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
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

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: 'var(--app-border)' }}>
        <button
          onClick={() => { logout(); router.push('/') }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all app-pressable"
          style={{ color: 'var(--app-danger)', fontSize: '13px', fontWeight: 600 }}
        >
          <span className="text-base">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
