'use client'

interface Tab {
  icon: string
  label: string
  badge?: number
}

interface TabBarProps {
  tabs: Tab[]
  activeIndex: number
  onChange: (index: number) => void
}

export default function TabBar({ tabs, activeIndex, onChange }: TabBarProps) {
  return (
    <div
      className="flex items-center justify-around border-t px-2 pb-safe"
      style={{
        background: '#1c1c2e',
        borderColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        paddingTop: 8,
      }}
    >
      {tabs.map((tab, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className="flex flex-col items-center gap-1 px-3 py-1 relative transition-all"
        >
          {/* Badge */}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] font-black flex items-center justify-center"
              style={{ background: '#FF453A' }}
            >
              {tab.badge > 9 ? '9+' : tab.badge}
            </span>
          )}
          <span className="text-2xl leading-none">{tab.icon}</span>
          <span
            className="text-[10px] font-black transition-colors"
            style={{ color: i === activeIndex ? '#5E5CE6' : 'rgba(255,255,255,0.4)' }}
          >
            {tab.label}
          </span>
          {i === activeIndex && (
            <span
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
              style={{ background: '#5E5CE6' }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
