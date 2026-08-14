/**
 * Widget signalling.
 *
 * Both widgets are now announced by the server on their own SSE event, never by
 * anything inside the message text. The crisis card is emitted from the branch
 * that produced the crisis response; the breathing timer is emitted when Claude
 * calls the show_breathing_exercise tool, which arrives as a structured
 * content block rather than as prose. Model tokens only ever populate `text`,
 * so no reply can talk its way into rendering either one.
 *
 * The marker strings survive for one job only: stripping. Earlier versions
 * asked Claude to append them, so they may appear in a transcript replayed from
 * Redis, and a model can always be coaxed into typing one. Either way they get
 * removed rather than shown to somebody as raw text.
 */
export const BREATHING_MARKER = '[SHOW_BREATHING]'
export const CRISIS_RESOURCES_MARKER = '[SHOW_CRISIS_RESOURCES]'

/** Names carried by the trusted SSE widget events. */
export const CRISIS_WIDGET = 'crisis_resources'
export const BREATHING_WIDGET = 'breathing_exercise'

const MARKERS = [BREATHING_MARKER, CRISIS_RESOURCES_MARKER]

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

/** Removes every marker, complete or still arriving, and reports nothing. */
export function stripMarkers(raw: string): string {
  let content = raw
  for (const marker of MARKERS) {
    content = content.split(marker).join('')
  }
  return stripPartialMarker(content).trimEnd()
}
