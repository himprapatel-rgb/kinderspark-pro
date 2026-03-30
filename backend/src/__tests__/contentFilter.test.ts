import { filterAIResponse, AI_FILTERED_FALLBACK } from '../services/contentFilter.service'

describe('contentFilter.service', () => {
  it('blocks violent phrasing', () => {
    const r = filterAIResponse('The hero grabbed a gun and started shooting.')
    expect(r.safe).toBe(false)
    expect(r.filtered).toBe(AI_FILTERED_FALLBACK)
  })

  it('blocks sexual / adult content markers', () => {
    const r = filterAIResponse('This is pornographic material for adults.')
    expect(r.safe).toBe(false)
    expect(r.filtered).toBe(AI_FILTERED_FALLBACK)
  })

  it('allows normal kindergarten encouragement', () => {
    const t = 'You counted to five! Great job, superstar! ⭐'
    const r = filterAIResponse(t)
    expect(r.safe).toBe(true)
    expect(r.filtered).toBe(t)
  })

  it('allows empty string', () => {
    const r = filterAIResponse('')
    expect(r.safe).toBe(true)
    expect(r.filtered).toBe('')
  })

  it('allows colors and animals lesson text', () => {
    const t = 'The red fox jumps over the happy blue river.'
    const r = filterAIResponse(t)
    expect(r.safe).toBe(true)
    expect(r.filtered).toBe(t)
  })
})
