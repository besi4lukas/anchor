import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getAnthropic, HAIKU_MODEL } from '@/lib/ai-clients'
import {
  encodeChatEvent,
  encodeChatStream,
  DONE_EVENT,
} from '@/lib/chat-stream'
import {
  counterCookie,
  markCrisisFlag,
  readCrisisFlag,
  readTranscript,
  sanitizeTranscript,
  verifyCounters,
  writeTranscript,
  CONTEXT_WINDOW,
  MAX_MESSAGES,
  SESSION_COOKIE,
  type ChatMessage,
  type SessionCounters,
} from '@/lib/session'
import { ANCHOR_SYSTEM_PROMPT } from '@/lib/anchor-persona'
import { retrieveWithVector, buildContextBlock } from '@/lib/rag'
import { moderateInput, CRISIS_RESPONSE, HARM_RESPONSE } from '@/lib/moderation'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateCrisisReply } from '@/lib/crisis-support'
import { CRISIS_WIDGET, BREATHING_WIDGET, stripMarkers } from '@/lib/markers'
import { parseBody, ChatInputSchema } from '@/lib/validation'
import {
  classifyTopic,
  getTopicAnchors,
  OFF_TOPIC_RESPONSE,
} from '@/lib/topic-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STREAM_TIMEOUT_MS = 15_000
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

/**
 * Set-Cookie is a header, so the advanced counters have to be committed before
 * the body starts streaming. Both the success and fallback paths add exactly
 * two turns, so charging for them up front matches what actually gets stored.
 */
function sseResponse(body: BodyInit, counters: SessionCounters): NextResponse {
  const response = new NextResponse(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
  response.cookies.set(counterCookie(counters))
  return response
}

export async function POST(req: NextRequest): Promise<Response> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  const counters = verifyCounters(token)
  if (!counters) {
    const res = NextResponse.json(
      { error: 'Session expired or not found' },
      { status: 410 },
    )
    res.cookies.delete(SESSION_COOKIE)
    return res
  }

  if (counters.message_count + 2 > MAX_MESSAGES) {
    return NextResponse.json(
      { error: 'Message limit reached' },
      { status: 429 },
    )
  }

  const raw: unknown = await req.json().catch(() => null)

  const parsed = parseBody(ChatInputSchema, raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const message = parsed.data.message

  // The transcript stays on sanitizeTranscript rather than a schema. It is a
  // best-effort fallback for when Redis is unreachable, so bounding it — drop
  // bad turns, cap the length, keep the rest — serves the person better than
  // rejecting the whole request because one entry was malformed.
  const clientHistory: ChatMessage[] = sanitizeTranscript(
    (raw as { messages?: unknown } | null)?.messages,
    CONTEXT_WINDOW,
  )

  // Cheapest gate first, before any transcript read or upstream call.
  const rateLimit = await checkRateLimit(counters.id)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many messages. Take a breath and try again shortly.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfter ?? 60) },
      },
    )
  }

  // Everything the reply needs before Claude can start, run at once.
  //
  // These four were serial, which meant waiting for their sum — moderation
  // (0.4-1.4s) and then retrieval (0.25-0.7s) and then the rest. None of them
  // reads another's output: all four take the incoming message or the session
  // id and nothing else, so the wait is now the slowest one rather than the
  // total. That also makes the topic guard free in wall-clock time; it finishes
  // long before moderation does.
  //
  // Moderation is chained behind the crisis-flag read because layer 3 needs to
  // know whether this session is already flagged. The cost of a crisis or
  // off-topic message is one retrieval whose result gets discarded — a fraction
  // of a cent on the rare path, to take roughly half a second off the common one.
  const [moderation, retrieval, anchors, stored] = await Promise.all([
    readCrisisFlag(counters.id).then((serverFlag) =>
      moderateInput(message, counters.crisis_flag || serverFlag),
    ),
    retrieveWithVector(message),
    getTopicAnchors(),
    readTranscript(counters.id),
  ])

  // Redis is preferred because it is server-held and cannot be edited, but the
  // client's copy keeps the conversation going when the cache is unavailable.
  const rawHistory = stored ?? clientHistory

  // Markers are a transport detail of an earlier design, and a transcript
  // written before this change can still contain them. Scrubbing on the way in
  // keeps them out of Claude's context, so it never sees its own old markers
  // replayed and reads them as a house style worth continuing.
  const history = rawHistory.map((m) =>
    m.role === 'assistant' ? { ...m, content: stripMarkers(m.content) } : m,
  )

  const userMessage: ChatMessage = {
    role: 'user',
    content: message,
    timestamp: Date.now(),
  }

  const nextCounters: SessionCounters = {
    ...counters,
    last_active: Date.now(),
    message_count: counters.message_count + 2,
  }

  // Stripped on the way out too, so the stored transcript never accumulates
  // them in the first place.
  const persist = (assistant: string) =>
    writeTranscript(
      counters.id,
      [
        ...history,
        userMessage,
        {
          role: 'assistant' as const,
          content: stripMarkers(assistant),
          timestamp: Date.now(),
        },
      ].slice(-MAX_MESSAGES),
    )

  const claudeMessages = [...history, userMessage]
    .slice(-CONTEXT_WINDOW)
    .map((m) => ({ role: m.role, content: m.content }))

  // Crisis replies never use RAG and never stream. The card is emitted from the
  // branch itself rather than derived from the flag: layer 3 keeps returning
  // isCrisis for a flagged session, so every reply here carries its own card.
  if (moderation.isCrisis) {
    await markCrisisFlag(counters.id)

    // The turn that discloses a crisis is answered by the hardcoded text, every
    // time, with no model involved — that moment has to be predictable. Only
    // the turns after it get a reviewed model reply, so the person is not held
    // at the same wall of text for the rest of the hour.
    const isFirstDisclosure = moderation.reason !== 'session_crisis_active'

    const reply = isFirstDisclosure
      ? CRISIS_RESPONSE
      : (await generateCrisisReply(claudeMessages)).text

    await persist(reply)
    return sseResponse(encodeChatStream(reply, CRISIS_WIDGET), {
      ...nextCounters,
      crisis_flag: true,
    })
  }

  if (moderation.flagged) {
    await persist(HARM_RESPONSE)
    return sseResponse(encodeChatStream(HARM_RESPONSE), nextCounters)
  }

  // Runs only after crisis and harm have had their say. Someone in crisis may
  // well write something that scores as off-topic, and turning them away would
  // be the worst thing this route could do.
  const topic = classifyTopic(message, retrieval.vector, anchors)
  if (!topic.onTopic) {
    // Decision and score only. The message itself is never logged.
    console.info(`[TopicGuard] declined (margin ${topic.margin.toFixed(3)})`)
    await persist(OFF_TOPIC_RESPONSE)
    return sseResponse(encodeChatStream(OFF_TOPIC_RESPONSE), nextCounters)
  }

  // Retrieval swallows its own failures and yields no chunks, so an outage
  // degrades to an unaugmented prompt rather than breaking the chat.
  const contextBlock = buildContextBlock(retrieval.chunks)
  const systemPrompt = ANCHOR_SYSTEM_PROMPT.replace('{context}', contextBlock)

  try {
    const anthropic = getAnthropic()
    const abortController = new AbortController()

    const stream = anthropic.messages.stream(
      {
        model: HAIKU_MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages: claudeMessages,
        tools: [BREATHING_TOOL],
      },
      { signal: abortController.signal, timeout: STREAM_TIMEOUT_MS },
    )

    let fullText = ''
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
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
          controller.close()

          await persist(fullText)
        } catch {
          controller.enqueue(encoder.encode(encodeChatStream(FALLBACK_MESSAGE)))
          controller.close()
          await persist(FALLBACK_MESSAGE)
        }
      },
      cancel() {
        abortController.abort()
      },
    })

    return sseResponse(readable, nextCounters)
  } catch {
    await persist(FALLBACK_MESSAGE)
    return sseResponse(encodeChatStream(FALLBACK_MESSAGE), nextCounters)
  }
}
