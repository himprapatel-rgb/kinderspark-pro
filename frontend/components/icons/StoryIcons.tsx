'use client'

/**
 * KinderSpark StoryIcons — internal SVG library
 *
 * Do not consume directly in page files. Use <AppIcon /> from './AppIcon'.
 * StoryIcon is kept as a backwards-compat export for existing callsites.
 */

import type { ReactNode, SVGProps } from 'react'

export type StoryIconName =
  | 'home'
  | 'class'
  | 'students'
  | 'teacher'
  | 'parent'
  | 'homework'
  | 'attendance'
  | 'reports'
  | 'messages'
  | 'aiTutor'
  | 'rewards'
  | 'progress'
  | 'drawing'
  | 'tracing'
  | 'school'
  | 'settings'

export type Tone = {
  ink: string
  warm: string
  mint: string
  sky: string
  rose: string
  sun: string
  white: string
}

const DEFAULT_TONE: Tone = {
  ink: '#4B3F72',
  warm: '#FFB86B',
  mint: '#63D2B3',
  sky: '#6FA8FF',
  rose: '#FF8FA3',
  sun: '#FFD86A',
  white: '#FFFFFF',
}

export interface StoryIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: StoryIconName
  size?: number
  tone?: Partial<Tone>
  /** Role-based color palette. 'principal' maps to admin palette. 'neutral' uses default. */
  roleTone?: 'default' | 'parent' | 'teacher' | 'admin' | 'child' | 'principal' | 'neutral'
  density?: 'default' | 'compact'
  title?: string
  /** Visual state. 'warning' and 'error' render the disabled shape with accent color cue. */
  state?: 'idle' | 'hover' | 'active' | 'success' | 'disabled' | 'warning' | 'error'
  interactive?: boolean
  /** When true, animation CSS classes are applied (suppressed via prefers-reduced-motion in CSS) */
  animated?: boolean
}

const ROLE_TONES: Record<string, Partial<Tone>> = {
  default: {},
  neutral: {},
  parent: { mint: '#59C89C', warm: '#FFB27A', ink: '#4A3A66' },
  teacher: { sky: '#8F8DFF', mint: '#7BC9FF', ink: '#45366E' },
  admin: { sky: '#73B4FF', sun: '#FFC96C', ink: '#324A70' },
  principal: { sky: '#73B4FF', sun: '#FFC96C', ink: '#324A70' },
  child: { sun: '#FFD86A', rose: '#FF8FA3', ink: '#4B3F72' },
}

function withTone(roleTone = 'default', tone?: Partial<Tone>): Tone {
  const base = ROLE_TONES[roleTone] ?? {}
  return { ...DEFAULT_TONE, ...base, ...(tone || {}) }
}

function SvgRoot({
  size = 24,
  state = 'idle',
  interactive = true,
  density = 'default',
  animated = false,
  className,
  children,
  title,
  ...props
}: Omit<StoryIconProps, 'name' | 'tone' | 'roleTone'> & { children: ReactNode }) {
  const animClass = animated ? ' story-icon--animated' : ''
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-icon-state={state}
      className={`story-icon${interactive ? ' story-icon--interactive' : ''} story-icon--${state} story-icon--${density}${animClass}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  )
}

// ── Individual icon components ────────────────────────────────────────────────

function IconHome({ tone, roleTone = 'default', density = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot density={density} {...props}>
      <path d="M3.5 11.5L12 4.5L20.5 11.5" stroke={c.ink} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10.8V19A1.5 1.5 0 0 0 8 20.5H16A1.5 1.5 0 0 0 17.5 19V10.8" fill={c.sky} />
      <rect x="10.1" y="14.2" width="3.8" height="6.3" rx="1" fill={c.warm} />
      <path d="M7.7 12.2C10.8 10.6 14 10.4 17.3 12.1" stroke={c.white} strokeOpacity=".38" strokeWidth="1.2" strokeLinecap="round" />
      {density !== 'compact' && <circle className="story-home-glow" cx="16.7" cy="7.4" r="1.1" fill={c.sun} />}
    </SvgRoot>
  )
}

function IconClass({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <rect x="3.5" y="5" width="17" height="13.5" rx="3" fill={c.mint} />
      <rect x="5.8" y="7.2" width="12.8" height="6.2" rx="1.8" fill="#EFFFF9" />
      <circle cx="8.2" cy="16.2" r="1.2" fill={c.ink} />
      <circle cx="12" cy="16.2" r="1.2" fill={c.ink} />
      <circle cx="15.8" cy="16.2" r="1.2" fill={c.ink} />
    </SvgRoot>
  )
}

function IconStudents({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <circle cx="8" cy="9" r="2.3" fill={c.sun} />
      <circle cx="16" cy="9" r="2.3" fill={c.rose} />
      <path d="M4.5 17.8C5 15.5 6.6 14.2 8 14.2C9.4 14.2 11 15.5 11.5 17.8" fill={c.sky} />
      <path d="M12.5 17.8C13 15.5 14.6 14.2 16 14.2C17.4 14.2 19 15.5 19.5 17.8" fill={c.mint} />
      <path d="M5.2 17.2H18.8" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" opacity=".45" />
    </SvgRoot>
  )
}

function IconTeacher({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <circle cx="8" cy="8.2" r="2.2" fill={c.warm} />
      <path d="M5.5 15.8C5.9 13.5 7.3 12.1 8 12.1C8.7 12.1 10.1 13.5 10.5 15.8" fill={c.sky} />
      <rect x="12.2" y="6.2" width="8.2" height="5.8" rx="1.4" fill={c.mint} />
      <path d="M13.4 8.9H19.2" stroke={c.ink} strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
      <path d="M15.7 12V14.1" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" />
    </SvgRoot>
  )
}

function IconParent({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <circle cx="8" cy="8.5" r="2.1" fill={c.rose} />
      <circle cx="13.8" cy="8.2" r="2.3" fill={c.sky} />
      <circle cx="18.2" cy="10.2" r="1.5" fill={c.sun} />
      <path d="M4.8 17.8C5.3 15.4 6.7 14 8 14C9.3 14 10.7 15.4 11.2 17.8" fill={c.mint} />
      <path d="M10.5 18C11.1 15.3 12.5 13.8 13.8 13.8C15.2 13.8 16.7 15.3 17.3 18" fill={c.warm} />
    </SvgRoot>
  )
}

function IconHomework({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <rect x="5" y="3.8" width="14" height="16.5" rx="2.5" fill={c.sun} />
      <path d="M8 8.2H16M8 11.2H16M8 14.2H13.3" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" opacity=".65" />
      <path d="M14.8 15.7L15.9 16.9L18 14.1" stroke={c.mint} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </SvgRoot>
  )
}

function IconAttendance({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <rect x="4" y="5.2" width="16" height="14.8" rx="3" fill={c.sky} />
      <path d="M7.4 3.8V6.3M16.6 3.8V6.3" stroke={c.ink} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="6.2" y="8.5" width="11.6" height="9" rx="1.8" fill="#F3F8FF" />
      <path className="story-check-draw" d="M8.2 13L10.4 15.1L15.6 10.1" stroke={c.mint} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </SvgRoot>
  )
}

function IconReports({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <rect x="4.5" y="4" width="15" height="16" rx="2.6" fill={c.warm} />
      <path d="M8 15.8V12.2M11.7 15.8V10.6M15.4 15.8V13.7" stroke={c.ink} strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7.6 8H16.2" stroke={c.white} strokeOpacity=".45" strokeWidth="1.3" strokeLinecap="round" />
    </SvgRoot>
  )
}

function IconMessages({ tone, roleTone = 'default', density = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot density={density} {...props}>
      <rect x="3.5" y="5" width="17" height="11.8" rx="3.2" fill={c.mint} />
      <path d="M7 17L6 20.2L9.6 17.9H17.3" fill={c.mint} />
      <path d="M7.4 9.4H16.6M7.4 12.1H13.5" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" opacity=".65" />
      {density !== 'compact' && <circle className="story-msg-dot" cx="18.4" cy="6.4" r="1.3" fill={c.rose} />}
    </SvgRoot>
  )
}

function IconAiTutor({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <rect x="5" y="5.2" width="14" height="12.2" rx="4" fill={c.sky} />
      <circle className="story-ai-eye story-ai-eye--left" cx="9.5" cy="11.2" r="1.2" fill={c.white} />
      <circle className="story-ai-eye story-ai-eye--right" cx="14.5" cy="11.2" r="1.2" fill={c.white} />
      <path d="M9 14.2C10 15.1 11 15.1 12 15.1C13 15.1 14 15.1 15 14.2" stroke={c.white} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 3.5V5.1M8.3 4.5L9.2 5.8M15.7 4.5L14.8 5.8" stroke={c.ink} strokeWidth="1.3" strokeLinecap="round" opacity=".6" />
    </SvgRoot>
  )
}

function IconRewards({ tone, roleTone = 'default', density = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot density={density} {...props}>
      <path d="M12 4.2L14.2 8.7L19.2 9.4L15.6 12.9L16.5 17.9L12 15.5L7.5 17.9L8.4 12.9L4.8 9.4L9.8 8.7L12 4.2Z" fill={c.sun} />
      <path d="M12 6.5L13.2 9L16 9.4L14 11.3L14.5 14.1L12 12.8L9.5 14.1L10 11.3L8 9.4L10.8 9L12 6.5Z" fill={c.warm} opacity=".8" />
      {density !== 'compact' && (
        <>
          <circle className="story-reward-twinkle story-reward-twinkle--a" cx="18.4" cy="6.7" r="0.9" fill={c.white} />
          <circle className="story-reward-twinkle story-reward-twinkle--b" cx="6.2" cy="7.8" r="0.7" fill={c.white} />
        </>
      )}
    </SvgRoot>
  )
}

function IconProgress({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <path d="M5 16.5A7 7 0 1 1 19 16.5" stroke={c.ink} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 16.5A7 7 0 0 1 15.8 10.6" stroke={c.mint} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1.4" fill={c.rose} />
      <path d="M12 16.5L15 14.2" stroke={c.rose} strokeWidth="1.6" strokeLinecap="round" />
    </SvgRoot>
  )
}

function IconDrawing({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <path d="M4.2 15.8C4.2 11.6 7.3 8.2 11.2 8.2C15.6 8.2 19.8 11.1 19.8 15C19.8 17.4 18.1 19 15.8 19H8.8C6.3 19 4.2 17.8 4.2 15.8Z" fill={c.rose} />
      <path d="M8.5 7.5L14.3 13.6" stroke={c.ink} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14.2 13.6L15.9 12.4L17.1 13.6L15.9 15.3Z" fill={c.warm} />
    </SvgRoot>
  )
}

function IconTracing({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <path d="M5.5 15.5C7.1 9.9 10.5 7 15.7 6.6" stroke={c.sky} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2.2 2.2" />
      <circle cx="16.8" cy="6.8" r="2.1" fill={c.mint} />
      <path d="M7.2 17.2L9.3 16.7L8.7 14.7" stroke={c.ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </SvgRoot>
  )
}

function IconSchool({ tone, roleTone = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot {...props}>
      <path d="M3.5 10.2L12 5L20.5 10.2" stroke={c.ink} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4.6" y="10" width="14.8" height="9.8" rx="2.2" fill={c.sky} />
      <rect x="10.2" y="13.2" width="3.6" height="6.6" rx="1" fill={c.warm} />
      <rect x="6.8" y="12.2" width="2.2" height="2.2" rx=".5" fill="#EFFFF9" />
      <rect x="15" y="12.2" width="2.2" height="2.2" rx=".5" fill="#EFFFF9" />
    </SvgRoot>
  )
}

function IconSettings({ tone, roleTone = 'default', density = 'default', ...props }: Omit<StoryIconProps, 'name'>) {
  const c = withTone(roleTone, tone)
  return (
    <SvgRoot density={density} {...props}>
      {/* Outer ring */}
      <circle cx="12" cy="12" r="7.2" fill={c.sky} />
      {/* Gear teeth — 6 rounded bumps */}
      <path d="M12 4.2V5.8M12 18.2V19.8M4.2 12H5.8M18.2 12H19.8M6.5 6.5L7.6 7.6M16.4 16.4L17.5 17.5M6.5 17.5L7.6 16.4M16.4 7.6L17.5 6.5"
        stroke={c.ink} strokeWidth="1.6" strokeLinecap="round" />
      {/* Inner hub */}
      <circle cx="12" cy="12" r="3.2" fill={c.white} />
      <circle cx="12" cy="12" r="1.6" fill={c.warm} />
      {density !== 'compact' && (
        <circle cx="12" cy="12" r="4.6" stroke={c.ink} strokeWidth="1.4" fill="none" opacity=".25" />
      )}
    </SvgRoot>
  )
}

// ── Registry ─────────────────────────────────────────────────────────────────

const ICONS: Record<StoryIconName, (props: Omit<StoryIconProps, 'name'>) => ReactNode> = {
  home: IconHome,
  class: IconClass,
  students: IconStudents,
  teacher: IconTeacher,
  parent: IconParent,
  homework: IconHomework,
  attendance: IconAttendance,
  reports: IconReports,
  messages: IconMessages,
  aiTutor: IconAiTutor,
  rewards: IconRewards,
  progress: IconProgress,
  drawing: IconDrawing,
  tracing: IconTracing,
  school: IconSchool,
  settings: IconSettings,
}

export default function StoryIcon({ name, ...props }: StoryIconProps) {
  const Comp = ICONS[name]
  if (!Comp) return null
  return <Comp {...props} />
}
