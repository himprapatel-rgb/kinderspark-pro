---
name: design-system
description: KinderSpark Pro frontend design system. Use when creating or editing any UI component, page, or style. Covers dark-first design, glass morphism, CSS variables, child UI rules, animations, and theme system.
---

# KinderSpark Design System

## Core Principles
1. **Dark-first** — background always `#0d0d1a` or darker. Never white backgrounds.
2. **Glass morphism** — cards use `rgba(255,255,255,0.07)` + `backdrop-filter: blur(12px)`
3. **Mobile-first** — child screens max-width 430px; teacher/admin full-width
4. **Original UI only** — never copy other apps; always create unique designs

## CSS Variables (always use these — never hardcode colors)
```css
--theme-color        /* primary accent (user-selected theme) */
--theme-secondary    /* secondary accent */
--theme-bg-tint      /* subtle background tint */
```

## Child UI Rules (pages under /child/)
- Touch targets minimum **44px** height/width
- Emoji-heavy — every item, button, section has an emoji
- High contrast text — never low-opacity text on dark bg for children
- Font size minimum 16px, prefer 18–24px for interactive elements
- Joyful tone — animations on every interaction

## Glass Card Pattern
```tsx
<div style={{
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(12px)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.1)',
  padding: '20px'
}}>
```

## Animations (defined in globals.css — use these class names)
- `shimmer` — loading skeleton effect
- `bounce-subtle` — gentle bounce for achievements
- `slide-up` — page/card entrance
- `pop` — button press feedback
- `shake` — error feedback

## Theme System
Themes are user-selected and stored in `student.selectedTheme`.
Always apply via CSS variables, never hardcode theme colors.
Available themes: `th_def` (purple), `th_ocean`, `th_forest`, `th_sunset`, `th_rose`, `th_galaxy`

## Zustand Store (frontend/store/appStore.ts)
```typescript
const { user, role, token, settings } = useAppStore()
// settings: { dark, large, hc, lang, dys, stLimit }
```
- `settings.large` — increase font sizes
- `settings.hc` — high contrast mode
- `settings.dys` — dyslexia-friendly font

## Accessibility Rules
- Respect `settings.hc` for high contrast
- Respect `settings.large` for font size
- Respect `settings.dys` for dyslexia font (use OpenDyslexic or similar)
- All interactive elements must be keyboard accessible

## Page Structure Pattern (child pages)
```tsx
export default function ChildPage() {
  const { user, token } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    if (!user || !token) router.push('/')
  }, [user, token])

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d1a', padding: '20px' }}>
      {/* content */}
    </div>
  )
}
```
