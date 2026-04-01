/**
 * KinderSpark Icon System — public exports
 *
 * Primary API:
 *   import { AppIcon } from '@/components/icons'
 *   <AppIcon name="home" size="md" decorative />
 *
 * Types:
 *   import type { AppIconProps, IconName, IconSize, IconRoleTone, IconState } from '@/components/icons'
 *
 * Registry utilities:
 *   import { isValidIconName, ICON_REGISTRY } from '@/components/icons'
 *
 * Legacy (backwards-compat only — do not use in new code):
 *   import { StoryIcon } from '@/components/icons'
 */

// Primary
export { default as AppIcon } from './AppIcon'
export type { AppIconProps, IconName, IconSize, IconSizeKey, IconRoleTone, IconState } from './types'
export { ICON_SIZES } from './types'
export { isValidIconName, ICON_REGISTRY } from './iconRegistry'

// Legacy alias — do not use in new code
export { default as StoryIcon } from './StoryIcons'
export type { StoryIconName, StoryIconProps, Tone } from './StoryIcons'
