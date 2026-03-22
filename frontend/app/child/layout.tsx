'use client'
import { useAppStore } from '@/store/appStore'
import { SHOP_THS } from '@/lib/modules'

// Secondary gradient colors for each theme
const THEME_SECONDARY: Record<string, string> = {
  th_def:    '#8b1cf7',
  th_ocean:  '#5856D6',
  th_forest: '#27AE7A',
  th_sunset: '#FF6B35',
  th_rose:   '#FF2D55',
  th_galaxy: '#7B2FBE',
}

// Dark tint for page background
const THEME_BG_TINT: Record<string, string> = {
  th_def:    '#1a0a2e',
  th_ocean:  '#0a1a2e',
  th_forest: '#0a1e12',
  th_sunset: '#1e100a',
  th_rose:   '#1e0a12',
  th_galaxy: '#120a1e',
}

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  const currentStudent = useAppStore(s => s.currentStudent)
  const user = useAppStore(s => s.user)
  const student = currentStudent || user

  const themeId = (student as any)?.selectedTheme || 'th_def'
  const theme = SHOP_THS.find(t => t.id === themeId) || SHOP_THS[0]
  const secondary = THEME_SECONDARY[themeId] || '#8b1cf7'
  const bgTint = THEME_BG_TINT[themeId] || '#1a0a2e'

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
    </div>
  )
}
