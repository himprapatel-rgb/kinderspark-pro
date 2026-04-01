---
name: design-system
description: KinderSpark Pro frontend design system. Use when creating or editing any UI component, page, or style. Covers light-first "Sunny Classroom" palette, shared CSS classes, canonical patterns, child UI rules, animations, and theme system.
---

# KinderSpark Design System

## Core Principles
1. **Light-first "Sunny Classroom"** — background `#FFFCF5` (warm cream). The app is child-friendly and intentionally light/warm — NOT dark.
2. **CSS variables first** — always use `var(--app-*)` tokens; never hardcode colors.
3. **Shared classes first** — use `.app-card`, `.page-hero`, `.app-tab-bar`, `.stat-box` etc. before writing inline styles.
4. **Mobile-first** — child screens max-width 430px via `.app-container`; admin/teacher full-width.
5. **Original UI only** — never copy other apps; always create unique designs.

## Color Tokens (globals.css `:root`)
```css
--app-bg: #FFFCF5               /* page background — warm cream */
--app-surface: #FFFFFF          /* card / panel background */
--app-surface-soft: #FFF9EE     /* nested / inner card background */
--app-surface-elevated: #FFFFFF /* elevated modals */
--app-border: rgba(180,160,120,0.16)
--app-border-strong: rgba(180,160,120,0.28)
--app-text-muted: rgba(60,50,40,0.58)
--app-accent: #4DAADF           /* primary blue */
--app-accent-hover: #3D94C8
--app-accent-glow: rgba(77,170,223,0.30)
--app-gold: #F5B731             /* stars / rewards */
--app-success: #4CAF6A
--app-warning: #F5A623
--app-danger: #E05252
--role-child: #F5A623           /* orange */
--role-teacher: #5B7FE8         /* blue */
--role-parent: #4CAF6A          /* green */
--role-admin: #8B6CC1           /* purple */
--app-shadow-sm: 0 2px 8px rgba(40,30,15,0.06)
--app-shadow-md: 0 4px 16px rgba(40,30,15,0.08)
--app-shadow-lg: 0 8px 28px rgba(40,30,15,0.12)
```

## Canonical CSS Classes (always use these — defined in globals.css)

### Cards
```
.app-card        — standard white card (16px radius, 1rem pad, shadow-sm)
.app-card-soft   — inner/nested card (soft bg, 12px radius, 0.875rem pad)
.app-card-lg     — featured card (20px radius, 1.25rem pad)
.app-card-action — interactive card with hover/press feedback (cursor: pointer)
.card-pro        — legacy elevated card with hover lift (1.5rem pad)
```

### Stats / Metrics
```
.stat-box        — compact metric container (12px radius, 0.75rem 1rem pad)
.stat-box-value  — metric number (1.25rem, font-black)
.stat-box-label  — metric label (0.65rem, uppercase, tracked)
```

### Layout
```
.page-hero       — gradient hero header (dot-grid overlay via ::before, 20px pad)
.app-tab-bar     — sticky role dashboard tab bar (white 92%, blur 20px, border-b)
.app-tab-btn     — tab button (use data-active='true/false' for active state)
.page-body       — scrollable content area (1.25rem pad + 1.25rem gap)
.page-section    — content group (column, 0.75rem gap)
.app-container   — responsive max-width container (480→960px)
.app-content     — content padding (1rem all sides)
.app-stack       — vertical stack with 1rem gap
```

### Text
```
.section-label   — group heading (0.7rem, 800, uppercase, tracked, muted color)
.app-muted       — muted text color (--app-text-muted)
.app-title       — accent-colored title
.gradient-text   — gold→orange gradient text
.gradient-text-purple — purple→blue gradient text
```

### Buttons
```
.app-btn-primary   — primary CTA (accent gradient, white text, shadow)
.app-btn-secondary — soft secondary (surface-soft bg, border)
.app-btn-danger    — destructive (danger-soft bg, danger text)
.app-btn-glass     — glass on gradient backgrounds (white 12%, border white 18%)
.app-btn-soft      — opaque soft (surface bg, border)
.app-pressable     — micro-interaction (translateY on hover, scale on active)

/* Size modifiers — combine with any style class above */
.btn-sm  — 32px height, 0.75rem font, 10px radius
.btn-md  — 40px height, 0.875rem font, 12px radius
.btn-lg  — 52px height, 1rem font, 14px radius
```

### Forms
```
.app-field    — CANONICAL input/select (12px radius, 14px, 700 weight, focus ring)
              — USE THIS for all new inputs
.app-input    — legacy alias for .app-field (identical styles, kept for compat)
.input-field  — legacy alias for .app-field (identical styles, kept for compat)
```

### Notifications
```
useToast()    — ALWAYS use this for toasts/notifications
              — import { useToast } from '@/components/Toast'
              — toast.success(msg) | toast.error(msg) | toast.warning(msg) | toast.info(msg)
              — NEVER build a local useState('') toast — it's inconsistent
```

### Misc
```
.app-chip        — badge/tag pill (11px, 800, rounded-full)
.glass           — light glass morphism (white 75% + blur 20px)
.glass-dark      — dark glass (black 6% + blur 20px)
.empty-state     — empty state layout (column, centered, gap 0.75rem)
.empty-state-emoji / .empty-state-title / .empty-state-sub — sub-elements
.shimmer         — loading shimmer animation
.doodle-surface  — decorative blob shapes via ::before/::after
.sticker-bubble  — sticker-like white bubble card
.orb             — blurred decorative circle
.notif-dot       — pulsing red notification dot
.progress-track  — progress bar background track
.progress-fill   — progress bar fill with shimmer
```

## Animations (all in globals.css — use `.animate-*` classes)
```
.animate-slide-up      — entrance slide from below
.animate-slide-down    — slide from above
.animate-fade-in       — fade in
.animate-pop           — scale pop (modal/badge entrance)
.animate-shake         — error shake
.animate-bounce-subtle — gentle float (achievements)
.animate-bounce-in     — spring bounce entrance
.animate-float         — slow float loop
.animate-float2        — offset float loop
.animate-bob           — tiny vertical bob
.animate-wiggle-slow   — gentle rotation wiggle
.animate-spin-slow     — slow full rotation
.animate-page-enter    — page entrance
.animate-page-fade     — page fade transition
.animate-page-scale    — page scale transition
.animate-gradient-x    — animated gradient shift
.animate-sparkle-on-hover — sparkle on hover
.delay-100 to .delay-600 — stagger delays
```

## Child UI Rules (pages under /child/)
- Touch targets minimum **44px** height/width
- Emoji on every section header, item, and CTA
- Font size minimum 16px; prefer 18–24px for interactive elements
- Joyful tone — micro-animations on every meaningful interaction
- Use `--theme-color` / `--theme-secondary` for child theme customization

## Hero Header Pattern (every role dashboard)
```tsx
<div
  className="page-hero"
  style={{ background: 'linear-gradient(135deg, var(--role-teacher), var(--role-admin))' }}
>
  {/* Decorative orb */}
  <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
  {/* Content (page-hero::before adds dot grid; > * get z-index: 1) */}
  <h1 className="text-2xl font-black text-white">Title</h1>
</div>
```

## Tab Bar Pattern (admin / teacher / parent / principal)
```tsx
<div className="app-tab-bar">
  {TABS.map((t, i) => (
    <button
      key={i}
      onClick={() => setTab(i)}
      className="app-tab-btn app-pressable"
      data-active={tab === i ? 'true' : 'false'}
    >
      {t.icon}<span>{t.label}</span>
    </button>
  ))}
</div>
```

## Standard Card Pattern
```tsx
<div className="app-card">
  <p className="section-label">SECTION TITLE</p>
  <div className="page-section">
    {items.map(item => (
      <div key={item.id} className="app-card-soft flex items-center gap-3">
        {/* content */}
      </div>
    ))}
  </div>
</div>
```

## Toast Pattern (always use — never local useState)
```tsx
import { useToast } from '@/components/Toast'

const toast = useToast()
toast.success('Saved!')
toast.error('Something went wrong.')
toast.warning('Need 50 ⭐ to buy this!')
toast.info('Loading...')
```

## Glass Cards (inside gradient hero sections only)
Use `rgba(255,255,255,0.12–0.18)` background + `rgba(255,255,255,0.18–0.25)` border.
Do NOT use `.app-card` inside gradient sections — use glass pattern.

## Accessibility (automatic — do not re-implement)
`AccessibilityProvider` in root layout handles everything:
- `settings.large` → `font-size: 118%` on `<html>`
- `settings.hc` → `html.high-contrast` class (CSS contrast filter)
- `settings.dys` → Comic Sans font family on `<html>`
All from Zustand `useAppStore(s => s.settings)`.

## Theme System
Themes stored in `student.selectedTheme`. Applied via `ThemeCustomizer` component.
Available: `th_def` (purple), `th_ocean`, `th_forest`, `th_sunset`, `th_rose`, `th_galaxy`
Always use `var(--theme-color)` and `var(--theme-secondary)` for child-specific theming.

## Zustand Store
```typescript
const { user, role, settings, currentStudent, dailyMission } = useAppStore()
// settings shape:
// { dark, large, hc, dys, lang, stLimit, voiceOn, voiceProfile }
```
- `settings.dark` — dark mode (applied by AccessibilityProvider as `html.dark`)
- `settings.large` — large text (font-size 118% on `<html>`)
- `settings.hc` — high contrast (`html.high-contrast` CSS class)
- `settings.dys` — dyslexia font (Comic Sans on `<html>`)
- `settings.lang` — language code (en/fr/es/ar/ur/hi/zh/pt/de/tr)
- `settings.voiceOn` / `settings.voiceProfile` — TTS voice control

## Page Structure (all roles)
```tsx
export default function RolePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--app-bg)' }}>
      {/* 1. Hero header */}
      <div className="page-hero" style={{ background: 'linear-gradient(135deg, ...)' }}>
        ...
      </div>
      {/* 2. Tab bar (role dashboards) */}
      <div className="app-tab-bar">...</div>
      {/* 3. Content */}
      <div className="page-body">
        <div className="page-section">
          <p className="section-label">TITLE</p>
          <div className="app-card">...</div>
        </div>
      </div>
    </div>
  )
}
```
