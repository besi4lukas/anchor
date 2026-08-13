/**
 * Inline widget signalling.
 *
 * There are two channels, deliberately unequal in trust.
 *
 * Cosmetic widgets travel as markers inside the message text: Claude appends
 * one, the renderer strips it. The worst a manipulated model can do on this
 * channel is summon a breathing timer nobody asked for.
 *
 * The crisis card does not travel this way. It is emitted by the server as its
 * own SSE event from the branch that produced the crisis response, so no amount
 * of coaxing the model can make one appear. The crisis marker still exists here
 * for one reason: if Claude ever emits the literal string, it gets stripped
 * before display rather than shown to somebody as raw text.
 */
export const BREATHING_MARKER = '[SHOW_BREATHING]'
export const CRISIS_RESOURCES_MARKER = '[SHOW_CRISIS_RESOURCES]'

/** Name carried by the trusted SSE widget event. */
export const CRISIS_WIDGET = 'crisis_resources'

const MARKERS = [BREATHING_MARKER, CRISIS_RESOURCES_MARKER]

export interface ParsedMessage {
  content: string
  /**
   * Requested by the model. There is deliberately no crisis equivalent — that
   * signal only ever arrives out of band.
   */
  showBreathing: boolean
}

/**
 * Responses stream a token at a time, so a marker spends a moment on screen as
 * a fragment — "[SHOW_BRE" — before it is complete enough to match. Any trailing
 * fragment that could still become a marker is held back; the next token either
 * completes it or proves it was ordinary text.
 */
function stripPartialMarker(text: string): string {
  const open = text.lastIndexOf('[')
  if (open === -1) return text

  const tail = text.slice(open)
  return MARKERS.some((marker) => marker.startsWith(tail))
    ? text.slice(0, open)
    : text
}

export function parseMarkers(raw: string): ParsedMessage {
  const showBreathing = raw.includes(BREATHING_MARKER)

  let content = raw
  for (const marker of MARKERS) {
    content = content.split(marker).join('')
  }

  return {
    content: stripPartialMarker(content).trimEnd(),
    showBreathing,
  }
}
