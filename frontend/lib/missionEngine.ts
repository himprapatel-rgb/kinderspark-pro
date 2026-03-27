import { MODS } from './modules'

type MissionInput = {
  pendingHomework: any[]
  recommendations: any[]
  progressMap: Record<string, number>
}

export type AdaptiveMission = {
  route: string
  title: string
  meta: string
}

/**
 * Selects the next best child mission with simple adaptive priority:
 * 1) pending homework first,
 * 2) recommendation where progress is still incomplete,
 * 3) first unfinished module.
 */
export function selectAdaptiveMission(input: MissionInput): AdaptiveMission | null {
  const { pendingHomework, recommendations, progressMap } = input

  const hw = pendingHomework?.[0]
  if (hw) {
    return {
      route: hw.aiGenerated
        ? `/child/tutor?topic=${encodeURIComponent(hw.moduleId || 'daily-practice')}`
        : `/child/lesson/${hw.moduleId || 'numbers'}`,
      title: `Start with: ${hw.title}`,
      meta: `Homework · ${hw.dueDate ? new Date(hw.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Due soon'}`,
    }
  }

  const rec = recommendations?.find((r: any) => {
    const mod = MODS.find(m => m.id === r.moduleId)
    const done = progressMap[r.moduleId] || 0
    return !!mod && done < mod.items.length
  })
  if (rec) {
    return {
      route: `/child/lesson/${rec.moduleId}`,
      title: `Recommended: ${rec.title}`,
      meta: 'Adaptive recommendation',
    }
  }

  const unfinished = MODS.find((m) => (progressMap[m.id] || 0) < m.items.length)
  if (unfinished) {
    return {
      route: `/child/lesson/${unfinished.id}`,
      title: `Continue: ${unfinished.title}`,
      meta: `Core lesson · ${(progressMap[unfinished.id] || 0)}/${unfinished.items.length}`,
    }
  }

  return null
}

