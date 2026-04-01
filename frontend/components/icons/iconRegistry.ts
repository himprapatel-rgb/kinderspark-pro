/**
 * KinderSpark Icon Registry
 *
 * Single source of truth for all icon names available in the app.
 *
 * Rules:
 *  - Never add an icon directly in a page file
 *  - Always implement the SVG in StoryIcons.tsx, then add the name here
 *  - Every icon must support the AppIconProps contract
 *  - Every new icon must be reviewed at xs (16px) before shipping
 */

import type { IconName } from './types'

/** All icon names supported by the app icon system */
export const ICON_REGISTRY: readonly IconName[] = [
  // Navigation & roles
  'home',
  'class',
  'students',
  'teacher',
  'parent',
  'school',
  // Core features
  'homework',
  'attendance',
  'messages',
  'progress',
  'reports',
  'rewards',
  'aiTutor',
  // Child activities
  'drawing',
  'tracing',
  // Utility
  'settings',
] as const

export function isValidIconName(name: string): name is IconName {
  return (ICON_REGISTRY as readonly string[]).includes(name)
}
