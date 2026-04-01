# KinderSpark Icon System Spec

## One system. One API.

All icons in the app must go through `<AppIcon />`. No exceptions.

```tsx
import { AppIcon } from '@/components/icons'

<AppIcon name="home" size="md" decorative />
<AppIcon name="homework" size="sm" title="Open homework" roleTone="teacher" />
<AppIcon name="rewards" size="lg" roleTone="child" state="success" animated />
```

---

## Hard rules

- **Never** add an icon directly in a page file (no inline SVG, no Lucide, no emoji for core UI)
- **Never** create a second icon system alongside this one
- All new icons must be implemented in `StoryIcons.tsx` and listed in `iconRegistry.ts`
- Every new icon must be reviewed at `xs` (16px) before shipping
- Every interactive icon must be keyboard accessible before shipping

---

## Size system

| Key | px | Usage |
|-----|----|-------|
| `xs` | 16 | sidebar nav, compact badges |
| `sm` | 20 | top bar, secondary actions |
| `md` | 24 | default, dashboard cards |
| `lg` | 32 | hero sections, empty states |

Density (`compact` vs `default`) is resolved automatically from size.

---

## Accessibility contract

| Context | What to do |
|---------|-----------|
| Decorative (visual only) | `<AppIcon name="x" decorative />` or omit `title` |
| Meaningful standalone | `<AppIcon name="x" title="Open messages" />` |
| Interactive (acts as button) | `interactive={true}` on AppIcon + `onClick`/`onKeyDown` on wrapper element |
| State meaning | Never rely on color alone — combine icon `state` + shape + adjacent label |

---

## Role tones

| tone | Intended for |
|------|-------------|
| `child` | Child dashboards, learning pages — warmer, more expressive |
| `teacher` | Teacher portal — calmer, clearer |
| `parent` | Parent portal |
| `admin` | Admin portal — cleanest |
| `principal` | Principal portal (maps to admin palette) |
| `neutral` | Default palette, no role bias |

---

## States

| state | Shape cue | When to use |
|-------|-----------|-------------|
| `default` | Idle, animated only if `animated` | Standard |
| `active` | Bold, accent colors | Selected/current nav item |
| `success` | Bright fills, success drop-shadow | Completed, confirmed |
| `disabled` | Desaturated, reduced opacity | Not available |
| `warning` | Disabled shape + warm CSS filter | Needs attention |
| `error` | Disabled shape + red CSS filter | Error state |

---

## Current icon set (16 icons)

`home` · `class` · `students` · `teacher` · `parent` · `homework` · `attendance` · `messages` · `progress` · `reports` · `rewards` · `aiTutor` · `drawing` · `tracing` · `school` · `settings`

---

## Adding a new icon

1. Implement the SVG function in `StoryIcons.tsx` following the existing pattern
2. Add the name to `StoryIconName` union in `StoryIcons.tsx`
3. Add the name to `IconName` union in `types.ts`
4. Add the name to `ICON_REGISTRY` in `iconRegistry.ts`
5. Add it to the `ICONS` map in `StoryIcons.tsx`
6. Test at `xs` (16px) before shipping

---

## Rollout phases

- **Phase 1 (done):** AppIcon wrapper, types, registry, 16 core icons, DashboardSidebar, ParentSidebar
- **Phase 2 (next):** Replace Lucide in teacher/admin/principal page stat cards and tab bars
- **Phase 3:** Replace Lucide in child pages, tutor, lesson, forms
- **Phase 4:** Audit and remove remaining stray emoji used as UI icons (keep emoji in learning content — that is appropriate)
