/**
 * KinderSpark Icon System — type definitions
 *
 * All icons must be rendered via <AppIcon name="..." /> — never inline SVGs or Lucide for core features.
 * Add new icon names here and implement the SVG in StoryIcons.tsx.
 */

export type IconName =
  | 'home'
  | 'class'
  | 'students'
  | 'teacher'
  | 'parent'
  | 'homework'
  | 'attendance'
  | 'messages'
  | 'progress'
  | 'reports'
  | 'rewards'
  | 'aiTutor'
  | 'drawing'
  | 'tracing'
  | 'school'
  | 'settings'

/** Named size keys — prefer these over raw numbers */
export const ICON_SIZES = { xs: 16, sm: 20, md: 24, lg: 32 } as const
export type IconSizeKey = keyof typeof ICON_SIZES
export type IconSize = IconSizeKey | number

/**
 * Role tones control the color palette of the icon.
 * - child: warmer, more expressive
 * - teacher/parent: calmer, clearer
 * - admin/principal: cleanest, most neutral
 * - neutral: default palette, no role bias
 */
export type IconRoleTone = 'child' | 'teacher' | 'parent' | 'admin' | 'principal' | 'neutral'

/**
 * Icon visual state — affects fills, strokes, and motion cues.
 * Maps to the underlying StoryIcon state system.
 */
export type IconState = 'default' | 'active' | 'success' | 'warning' | 'error' | 'disabled'

export interface AppIconProps {
  /** Icon identifier — must be in the registry */
  name: IconName
  /** Size key or raw pixel number. Default: 'md' (24px) */
  size?: IconSize
  /** Accessible label. Required when icon conveys meaning without adjacent text */
  title?: string
  /**
   * When true (default when no title): renders aria-hidden="true".
   * When false: requires title or adjacent visible label.
   */
  decorative?: boolean
  /**
   * When true: icon must be keyboard-focusable, have visible focus ring,
   * and be operable with Enter/Space. Caller must wire onClick/onKeyDown.
   */
  interactive?: boolean
  /** Role-specific color palette */
  roleTone?: IconRoleTone
  /** Visual state — shape/color cue for status */
  state?: IconState
  /**
   * Enable micro-animation (bounce, sparkle, draw-on).
   * Automatically suppressed when the user prefers reduced motion.
   */
  animated?: boolean
  className?: string
}
