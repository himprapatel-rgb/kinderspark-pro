'use client'

interface ModItem {
  w: string
  e: string
  hint?: string
}

interface LessonCardProps {
  mod?: {
    id: string
    title: string
    icon: string
    color: string
    type: string
  }
  item: ModItem
  onClick?: () => void
  showHint?: boolean
}

export default function LessonCard({ mod, item, onClick, showHint = true }: LessonCardProps) {
  const color = mod?.color || '#5E5CE6'

  const getBg = () => {
    if (mod?.type === 'colors') {
      const colorMap: Record<string, string> = {
        Red: '#FF453A', Blue: '#0A84FF', Green: '#30D158',
        Yellow: '#FFD60A', Orange: '#FF9F0A', Purple: '#BF5AF2',
        Pink: '#FF375F', Brown: '#8B4513', Black: '#1c1c1e', White: '#f5f5f7',
      }
      return colorMap[item.w] || color
    }
    return color
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex flex-col items-center justify-center gap-3 rounded-3xl p-6 transition-all active:scale-95 animate-card"
      style={{
        background: `linear-gradient(135deg, ${getBg()}22, ${getBg()}44)`,
        border: `2px solid ${getBg()}66`,
        minHeight: 220,
      }}
    >
      {/* Emoji */}
      <div
        className="text-7xl animate-bounce-slow rounded-3xl flex items-center justify-center"
        style={{
          width: 120,
          height: 120,
          background: `${getBg()}33`,
          fontSize: 64,
        }}
      >
        {item.e}
      </div>

      {/* Word */}
      <div className="text-white font-black text-3xl text-center leading-tight">
        {item.w}
      </div>

      {/* Hint */}
      {showHint && item.hint && (
        <div
          className="text-sm font-bold text-center px-4 py-2 rounded-2xl"
          style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)' }}
        >
          {item.hint}
        </div>
      )}
    </button>
  )
}
