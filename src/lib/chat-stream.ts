import { CRISIS_WIDGET, BREATHING_WIDGET } from '@/lib/markers'

/**
 * The client half of the chat wire format.
 *
 * The route sends one JSON object per `data:` line — either a token of text, a
 * widget name, or both — and closes with `[DONE]`. Parsing it used to live
 * inside the chat component, which meant the one piece of genuinely fiddly
 * logic in the browser (a token boundary can land mid-line) was only reachable
 * through a rendered component and a mocked fetch. It is pure, so it lives
 * here and is tested directly.
 */

/** The widgets the server is allowed to ask for. Nothing else is honoured. */
export type WidgetName = typeof CRISIS_WIDGET | typeof BREATHING_WIDGET

export type ChatStreamEvent =
  | { type: 'text'; text: string }
  | { type: 'widget'; widget: WidgetName }

const KNOWN_WIDGETS: readonly WidgetName[] = [CRISIS_WIDGET, BREATHING_WIDGET]

function isWidgetName(value: unknown): value is WidgetName {
  return (
    typeof value === 'string' && KNOWN_WIDGETS.includes(value as WidgetName)
  )
}

/**
 * Turns one `data:` payload into the events it carries.
 *
 * A payload can produce both a text and a widget event, and text comes first
 * so a caller accumulating tokens sees them in wire order. Anything the client
 * cannot make sense of — `[DONE]`, malformed JSON, a widget name that is not
 * one of ours — produces nothing rather than throwing. An empty string is
 * still a text event: it is a token the server chose to send, and dropping it
 * would swallow the signal that the reply has started arriving.
 */
function decodePayload(payload: string): ChatStreamEvent[] {
  if (payload === '[DONE]') return []

  let parsed: { text?: unknown; widget?: unknown }
  try {
    parsed = JSON.parse(payload)
  } catch {
    return [] // skip malformed SSE lines
  }

  if (typeof parsed !== 'object' || parsed === null) return []

  const events: ChatStreamEvent[] = []

  if (typeof parsed.text === 'string') {
    events.push({ type: 'text', text: parsed.text })
  }

  if (isWidgetName(parsed.widget)) {
    events.push({ type: 'widget', widget: parsed.widget })
  }

  return events
}

export interface SSEParser {
  /** Events completed by this chunk. A partial trailing line is held back. */
  push(chunk: string): ChatStreamEvent[]
  /** Events in whatever line was still buffered when the stream ended. */
  flush(): ChatStreamEvent[]
}

/**
 * Line assembly across chunk boundaries.
 *
 * A read can end anywhere — `data: {"te` is a perfectly ordinary chunk — so
 * everything after the last newline is held until the next chunk either
 * completes it or the stream ends and `flush` takes what is left.
 */
export function createSSEParser(): SSEParser {
  let buffer = ''

  const decodeLine = (line: string): ChatStreamEvent[] =>
    line.startsWith('data: ') ? decodePayload(line.slice(6).trim()) : []

  return {
    push(chunk: string): ChatStreamEvent[] {
      buffer += chunk

      const parts = buffer.split('\n')
      buffer = parts.pop() ?? ''

      return parts.flatMap(decodeLine)
    },

    flush(): ChatStreamEvent[] {
      const trailing = buffer.trim()
      buffer = ''
      return decodeLine(trailing)
    },
  }
}

/** Reads a response body to completion, yielding events as they arrive. */
export async function* readChatStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const parser = createSSEParser()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    yield* parser.push(decoder.decode(value, { stream: true }))
  }

  yield* parser.flush()
}

// --- the server half ---------------------------------------------------------
//
// The encoder lives beside the decoder, in the one file that already owns this
// wire format, so the two halves of the protocol are checked against each other
// by the compiler rather than by hope. Before this, the route hand-wrote
// `data: ${JSON.stringify({ text })}\n\n` in four places and a mistyped widget
// name produced an event the client silently dropped.
//
// Nothing here imports next/server or lib/session. This module is pulled in by
// useChatStream, and a server-only import would drag node:crypto and the
// Upstash SDK into the browser bundle.

/**
 * One `data:` payload. Both fields may be present, but not neither — an empty
 * chunk encodes to `data: {}`, which the parser correctly turns into no events
 * at all, so it is a frame that costs bytes and says nothing.
 */
export type ChatStreamChunk =
  | { text: string; widget?: WidgetName }
  | { text?: string; widget: WidgetName }

export const DONE_EVENT = 'data: [DONE]\n\n'

/**
 * One `data:` line — the exact inverse of decodePayload.
 *
 * Widgets are encoded as their own field, never folded into `text`. Model
 * tokens only ever populate `text`, so a reply cannot talk its way into
 * rendering a crisis card no matter what the person types at it.
 */
export function encodeChatEvent(chunk: ChatStreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`
}

/** A complete non-streamed reply: the text, an optional widget, then [DONE]. */
export function encodeChatStream(text: string, widget?: WidgetName): string {
  const events = [encodeChatEvent({ text })]
  if (widget) events.push(encodeChatEvent({ widget }))
  events.push(DONE_EVENT)
  return events.join('')
}
