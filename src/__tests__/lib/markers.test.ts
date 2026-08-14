import {
  stripMarkers,
  BREATHING_MARKER,
  CRISIS_RESOURCES_MARKER,
  CRISIS_WIDGET,
  BREATHING_WIDGET,
} from '@/lib/markers'

// Neither widget is triggered by message text any more — the crisis card comes
// from the server's own branch, the breathing timer from a tool call. All this
// module does now is make sure a marker never reaches the screen, whether it
// arrived from an old stored transcript or from a model that was talked into
// typing one.
describe('stripMarkers', () => {
  it('leaves an ordinary message alone', () => {
    expect(stripMarkers('Take your time.')).toBe('Take your time.')
  })

  it.each([
    [BREATHING_MARKER, 'Let us try a round together.'],
    [CRISIS_RESOURCES_MARKER, 'Please reach out.'],
  ])('removes a trailing %s', (marker, body) => {
    expect(stripMarkers(`${body}\n${marker}`)).toBe(body)
  })

  it('removes both markers from one message', () => {
    const raw = `Here for you.\n${CRISIS_RESOURCES_MARKER}\n${BREATHING_MARKER}`
    expect(stripMarkers(raw)).toBe('Here for you.')
  })

  it('removes a marker that lands mid-message', () => {
    expect(stripMarkers(`One.${BREATHING_MARKER} Two.`)).toBe('One. Two.')
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
    expect(stripMarkers(partial)).toBe('Try this.')
  })

  it('keeps a bracket that cannot become a marker', () => {
    const text = 'He said [loudly] that it helped'
    expect(stripMarkers(text)).toBe(text)
  })

  it('reveals nothing while a marker streams in a token at a time', () => {
    const full = `Breathe with me.\n${BREATHING_MARKER}`
    for (let i = 0; i <= full.length; i++) {
      expect(stripMarkers(full.slice(0, i))).not.toMatch(
        /\[SHOW|SHOW_BREATHING/,
      )
    }
  })
})

describe('widget names', () => {
  it('are distinct, so one event cannot be mistaken for the other', () => {
    expect(CRISIS_WIDGET).not.toBe(BREATHING_WIDGET)
  })
})
