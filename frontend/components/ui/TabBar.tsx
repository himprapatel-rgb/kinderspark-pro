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
  accentColor?: string
}

export default function TabBar({ tabs, activeIndex, onChange, accentColor = '#5E5CE6' }: TabBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto flex items-center justify-around z-40"
      style={{
        background: 'rgba(14,14,24,0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingTop: 10,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {tabs.map((tab, i) => {
        const active = i === activeIndex
        return (
          <button
            key={i}
            onClick={() => onChange(i)}
            className="flex flex-col items-center gap-1 px-3 relative transition-all duration-200"
            style={{ minWidth: 56 }}
          >
            {/* Badge */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className="absolute -top-1 right-0 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-black flex items-center justify-center px-1"
                style={{
                  background: 'linear-gradient(135deg, #FF453A, #FF2D55)',
                  boxShadow: '0 2px 8px rgba(255,69,58,0.5)',
                  border: '1.5px solid rgba(14,14,24,0.9)',
                }}
              >
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            )}

            {/* Icon pill — active gets filled background */}
            <div
              className="flex items-center justify-center rounded-2xl transition-all duration-200"
              style={{
                width: 48,
                height: 32,
                background: active ? accentColor + '22' : 'transparent',
                transform: active ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <span
                className="text-xl leading-none transition-all duration-200"
                style={{
                  filter: active ? `drop-shadow(0 0 6px ${accentColor}88)` : 'none',
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {tab.icon}
              </span>
            </div>

            {/* Label */}
            <span
              className="text-[10px] font-black transition-colors duration-200"
              style={{ color: active ? accentColor : 'rgba(255,255,255,0.35)' }}
            >
              {tab.label}
            </span>

            {/* Active dot */}
            {active && (
              <span
                className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-5 h-1 rounded-full"
                style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
