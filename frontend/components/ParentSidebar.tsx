'use client'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/appStore'
import { BarChart3, DoorOpen, Home, Heart, MessageSquare, Sparkles } from 'lucide-react'

interface ParentSidebarProps {
  userName?: string
  childName?: string
  activeIndex: number
  onItemClick: (index: number) => void
  unreadCount?: number
}

const ITEMS = [
  { icon: Home, label: 'Home' },
  { icon: BarChart3, label: 'Progress' },
  { icon: MessageSquare, label: 'Messages' },
]

export default function ParentSidebar({ userName, childName, activeIndex, onItemClick, unreadCount = 0 }: ParentSidebarProps) {
  const router = useRouter()
  const logout = useAppStore(s => s.logout)

  return (
    <aside className="hidden lg:flex w-64 h-screen sticky top-0 flex-col border-r" style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b" style={{ borderColor: 'var(--app-border)' }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black text-white"
          style={{ background: 'linear-gradient(135deg, #4CAF6A, #5FBF7F)' }}
        >
          <Heart size={18} />
        </div>
        <div>
          <div className="text-sm font-black" style={{ color: 'rgb(var(--foreground-rgb))' }}>
            Kinder<span style={{ color: 'var(--app-accent)' }}>Spark</span>
          </div>
          <div className="text-[10px] font-bold" style={{ color: 'var(--app-text-muted)' }}>Parent Portal</div>
        </div>
      </div>

      {/* User */}
      {userName && (
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--app-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
              style={{ background: '#4CAF6A' }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: 'rgb(var(--foreground-rgb))' }}>{userName}</div>
              {childName && <div className="text-[10px] font-bold" style={{ color: 'var(--app-text-muted)' }}>Parent of {childName}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {ITEMS.map((item, idx) => {
          const active = idx === activeIndex
          return (
            <button
              key={item.label}
              onClick={() => onItemClick(idx)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 app-pressable ${active ? 'translate-x-0.5' : 'hover:bg-gray-50'}`}
              style={{
                background: active ? 'var(--app-accent)' : 'transparent',
                color: active ? '#fff' : 'var(--app-text-muted)',
                fontWeight: active ? 800 : 600,
                fontSize: '13px',
                boxShadow: active ? 'var(--app-shadow-sm)' : 'none',
              }}
            >
              <item.icon size={16} />
              <span className="flex-1">{item.label}</span>
              {item.label === 'Messages' && unreadCount > 0 && (
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{
                    background: active ? 'rgba(255,255,255,0.25)' : 'var(--app-danger)',
                    color: '#fff',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: 'var(--app-border)' }}>
        <button
          onClick={() => { logout(); window.location.href = '/login' }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all app-pressable"
          style={{ color: 'var(--app-danger)', fontSize: '13px', fontWeight: 600 }}
        >
          <DoorOpen size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
