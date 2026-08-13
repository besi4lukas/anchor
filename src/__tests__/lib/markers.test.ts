import {
  parseMarkers,
  BREATHING_MARKER,
  CRISIS_RESOURCES_MARKER,
} from '@/lib/markers'

describe('parseMarkers', () => {
  it('leaves an ordinary message alone', () => {
    const r = parseMarkers('Take your time.')
    expect(r).toEqual({ content: 'Take your time.', showBreathing: false })
  })

  it('detects and removes the breathing marker', () => {
    const r = parseMarkers(`Let us try a round together.\n${BREATHING_MARKER}`)
    expect(r.showBreathing).toBe(true)
    expect(r.content).toBe('Let us try a round together.')
    expect(r.content).not.toContain('SHOW_BREATHING')
  })

  // The crisis card is signalled out of band by the server. A crisis marker in
  // model output is stripped so it cannot be read, and reports nothing, so a
  // manipulated reply has no route to rendering the card.
  it('strips the crisis marker without reporting it as a signal', () => {
    const r = parseMarkers(`Please reach out.\n${CRISIS_RESOURCES_MARKER}`)
    expect(r.content).toBe('Please reach out.')
    expect(r.content).not.toContain('SHOW_CRISIS_RESOURCES')
    expect(r).not.toHaveProperty('showCrisisResources')
  })

  it('handles both markers in one message', () => {
    const r = parseMarkers(
      `Here for you.\n${CRISIS_RESOURCES_MARKER}\n${BREATHING_MARKER}`,
    )
    expect(r.showBreathing).toBe(true)
    expect(r.content).toBe('Here for you.')
  })

  it('removes a marker that lands mid-message', () => {
    const r = parseMarkers(`One.${BREATHING_MARKER} Two.`)
    expect(r.content).toBe('One. Two.')
    expect(r.showBreathing).toBe(true)
  })

  // Responses stream token by token, so an incomplete marker must not flash on
  // screen while the rest of it is still arriving.
  it.each([
    'Try this.\n[',
    'Try this.\n[SHOW',
    'Try this.\n[SHOW_BRE',
    'Try this.\n[SHOW_BREATHING',
    'Try this.\n[SHOW_CRISIS',
  ])('hides the partial marker in %p', (partial) => {
    const r = parseMarkers(partial)
    expect(r.content).toBe('Try this.')
    expect(r.content).not.toContain('[')
  })

  it('keeps a bracket that cannot become a marker', () => {
    const r = parseMarkers('He said [loudly] that it helped')
    expect(r.content).toBe('He said [loudly] that it helped')
  })

  it('reveals nothing while a marker streams in a token at a time', () => {
    const full = `Breathe with me.\n${BREATHING_MARKER}`
    for (let i = 0; i <= full.length; i++) {
      expect(parseMarkers(full.slice(0, i)).content).not.toMatch(
        /\[SHOW|SHOW_BREATHING/,
      )
    }
  })
})
