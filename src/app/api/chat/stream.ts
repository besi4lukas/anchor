import Anthropic from '@anthropic-ai/sdk'
import { getAnthropic, HAIKU_MODEL } from '@/lib/ai-clients'
import {
  encodeChatEvent,
  encodeChatStream,
  DONE_EVENT,
} from '@/lib/chat-stream'
import { BREATHING_WIDGET } from '@/lib/markers'

const STREAM_TIMEOUT_MS = 15_000
const MAX_REPLY_TOKENS = 300

const FALLBACK_MESSAGE =
  'Anchor is taking a short breather. Please try again in a moment.'

/**
 * The breathing timer is requested through tool use rather than by asking the
 * model to append a magic string. Format compliance is a hope; a tool call is a
 * structured decision that either happened or did not. It takes no arguments —
 * the widget is self-contained, and the tool exists purely to be called.
 */
const BREATHING_TOOL: Anthropic.Tool = {
  name: 'show_breathing_exercise',
  description:
    'Display an interactive guided box-breathing timer directly below your message. Call this whenever you suggest a breathing exercise, so the person can follow along with on-screen timing instead of reading counts. Describe the exercise briefly in your message as well; the timer handles the counting.',
  input_schema: { type: 'object', properties: {} },
}

export interface StreamInput {
  systemPrompt: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  /**
   * Narrowed to match writeTranscript, which reports failure rather than
   * throwing. A persist that can reject would land in the `finally` below,
   * after the controller has closed and the person has their reply.
   */
  persist: (assistant: string) => Promise<boolean>
}

/**
 * The reply body, streamed.
 *
 * Never rejects. A model outage is answered with an apology inside a 200 event
 * stream, not a 5xx — the person is mid-sentence, and a dead request would drop
 * them out of the conversation entirely. Both failure modes live here because
 * they are the same decision made at two points in the stream's life: before it
 * opens, and partway through.
 *
 * Returns BodyInit rather than a stream so both outcomes are one thing the
 * caller hands to sseResponse without asking which it got.
 */
export async function streamReply({
  systemPrompt,
  messages,
  persist,
}: StreamInput): Promise<BodyInit> {
  try {
    const abortController = new AbortController()

    const stream = getAnthropic().messages.stream(
      {
        model: HAIKU_MODEL,
        max_tokens: MAX_REPLY_TOKENS,
        system: systemPrompt,
        messages,
        tools: [BREATHING_TOOL],
      },
      { signal: abortController.signal, timeout: STREAM_TIMEOUT_MS },
    )

    let fullText = ''
    const encoder = new TextEncoder()

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (abortController.signal.aborted) break

            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const token = event.delta.text
              fullText += token
              controller.enqueue(
                encoder.encode(encodeChatEvent({ text: token })),
              )
            }

            // A tool call is a structured content block, not prose, so this is
            // a decision Claude made rather than a string it happened to type.
            // No tool_result goes back: the tool draws a widget and has no
            // output the conversation needs.
            if (
              event.type === 'content_block_start' &&
              event.content_block.type === 'tool_use' &&
              event.content_block.name === BREATHING_TOOL.name
            ) {
              controller.enqueue(
                encoder.encode(encodeChatEvent({ widget: BREATHING_WIDGET })),
              )
            }
          }

          controller.enqueue(encoder.encode(DONE_EVENT))
        } catch (error) {
          // The only signal an outage gives: the person still gets a 200 and an
          // apology, so a silent catch here would leave a fully degraded chat
          // indistinguishable from a healthy one.
          console.error('[Chat] Stream failed mid-flight:', error)

          controller.enqueue(encoder.encode(encodeChatStream(FALLBACK_MESSAGE)))

          // The partial text stays on screen — it was already sent — but only
          // the fallback is stored, so a half-finished thought is not replayed
          // back into Claude's context next turn.
          fullText = FALLBACK_MESSAGE
        } finally {
          // Exactly once, on both paths. Closing inside the try and again in
          // the catch would throw on the second call and error the stream.
          controller.close()
          await persist(fullText)
        }
      },
      cancel() {
        abortController.abort()
      },
    })
  } catch (error) {
    console.error('[Chat] Stream could not be opened:', error)
    await persist(FALLBACK_MESSAGE)
    return encodeChatStream(FALLBACK_MESSAGE)
  }
}
