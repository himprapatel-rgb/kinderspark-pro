import { computeMasteryLevel } from '../utils/progressMastery'

describe('computeMasteryLevel', () => {
  it('returns mastered when score >= 80', () => {
    expect(computeMasteryLevel(80, 0, 0, 0)).toBe('mastered')
    expect(computeMasteryLevel(100, 1, 0, 5)).toBe('mastered')
  })

  it('returns in_progress when attempts > 0 and score < 80', () => {
    expect(computeMasteryLevel(50, 1, 0, 0)).toBe('in_progress')
  })

  it('returns in_progress when cards > 0', () => {
    expect(computeMasteryLevel(0, 0, 3, 0)).toBe('in_progress')
  })

  it('returns in_progress when totalQuestions > 0', () => {
    expect(computeMasteryLevel(0, 0, 0, 2)).toBe('in_progress')
  })

  it('returns not_started when no activity', () => {
    expect(computeMasteryLevel(0, 0, 0, 0)).toBe('not_started')
  })

  it('clamps score into mastery decision', () => {
    expect(computeMasteryLevel(79, 2, 0, 0)).toBe('in_progress')
  })
})
