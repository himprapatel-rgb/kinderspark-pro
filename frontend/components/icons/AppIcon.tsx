'use client'

/**
 * AppIcon — the canonical KinderSpark icon component.
 *
 * This is the ONLY component that should be used to render icons in page and
 * component files. It wraps the StoryIcons SVG library with a clean,
 * spec-compliant prop API and handles accessibility automatically.
 *
 * Usage:
 *   <AppIcon name="home" size="md" decorative />
 *   <AppIcon name="homework" size="sm" title="Open homework" roleTone="teacher" />
 *   <AppIcon name="rewards" size="lg" roleTone="child" state="success" animated />
 *
 * Rules:
 *   - Decorative icons (visual only, no meaning): pass decorative or omit title
 *   - Meaningful standalone icons: pass title
 *   - Interactive icons: pass interactive={true} and wire onClick/onKeyDown on the wrapper
 *   - Never import Lucide or inline SVGs for core product icons
 */

import StoryIcon from './StoryIcons'
import type { StoryIconProps } from './StoryIcons'
import type { AppIconProps, IconRoleTone, IconState } from './types'
import { ICON_SIZES } from './types'

// ── Prop mapping ─────────────────────────────────────────────────────────────

function resolveSize(size: AppIconProps['size']): number {
  if (typeof size === 'number') return size
  return ICON_SIZES[size ?? 'md']
}

function resolveRoleTone(rt: IconRoleTone | undefined): StoryIconProps['roleTone'] {
  if (!rt || rt === 'neutral') return 'default'
  // principal maps to admin palette — same clean visual family
  if (rt === 'principal') return 'principal'
  return rt
}

function resolveState(state: IconState | undefined): StoryIconProps['state'] {
  switch (state) {
    case 'active': return 'active'
    case 'success': return 'success'
    case 'disabled': return 'disabled'
    // warning and error show the 'disabled' shape — CSS class provides color cue
    case 'warning': return 'disabled'
    case 'error': return 'disabled'
    default: return 'idle'
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppIcon({
  name,
  size = 'md',
  title,
  decorative,
  interactive = false,
  roleTone,
  state,
  animated = false,
  className,
}: AppIconProps) {
  const resolvedSize = resolveSize(size)
  // Default: decorative when no title is provided
  const isDecorative = decorative ?? !title

  // Density: compact for xs/sm (≤20px), default otherwise
  const density = resolvedSize <= 20 ? 'compact' : 'default'

  const stateClass = state === 'warning' ? ' app-icon--warning'
    : state === 'error' ? ' app-icon--error'
    : ''

  return (
    <StoryIcon
      name={name}
      size={resolvedSize}
      title={isDecorative ? undefined : title}
      roleTone={resolveRoleTone(roleTone)}
      state={resolveState(state)}
      interactive={interactive}
      density={density}
      animated={animated}
      className={`${stateClass}${className ? ` ${className}` : ''}`.trimStart()}
    />
  )
}
