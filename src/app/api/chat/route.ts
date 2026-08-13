import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
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
import { retrieveContext, buildContextBlock } from '@/lib/rag'
import { moderateInput, CRISIS_RESPONSE, HARM_RESPONSE } from '@/lib/moderation'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateCrisisReply } from '@/lib/crisis-support'
import { CRISIS_WIDGET } from '@/lib/markers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STREAM_TIMEOUT_MS = 15_000
const FALLBACK_MESSAGE =
  'Anchor is taking a short breather. Please try again in a moment.'

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
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

/**
 * Widgets that carry weight travel on their own event rather than as a marker
 * inside the message text. Model tokens only ever populate `text`, so a reply
 * cannot fabricate a `widget` no matter what the person types at it.
 */
function encodeSSE(text: string, widget?: string): string {
  const events = [`data: ${JSON.stringify({ text })}\n\n`]
  if (widget) events.push(`data: ${JSON.stringify({ widget })}\n\n`)
  events.push('data: [DONE]\n\n')
  return events.join('')
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

  let message = ''
  let clientHistory: ChatMessage[] = []
  try {
    const body = await req.json()
    message = typeof body.message === 'string' ? body.message.trim() : ''
    clientHistory = sanitizeTranscript(body.messages, CONTEXT_WINDOW)
  } catch {
    message = ''
  }

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

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

  // Redis is preferred because it is server-held and cannot be edited, but the
  // client's copy keeps the conversation going when the cache is unavailable.
  const stored = await readTranscript(counters.id)
  const history = stored ?? clientHistory

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

  const persist = (assistant: string) =>
    writeTranscript(
      counters.id,
      [
        ...history,
        userMessage,
        {
          role: 'assistant' as const,
          content: assistant,
          timestamp: Date.now(),
        },
      ].slice(-MAX_MESSAGES),
    )

  const claudeMessages = [...history, userMessage]
    .slice(-CONTEXT_WINDOW)
    .map((m) => ({ role: m.role, content: m.content }))

  // The cookie and the server record are OR'd: the cookie survives a Redis
  // outage, the server record survives a client replaying an older cookie.
  const crisisActive =
    counters.crisis_flag || (await readCrisisFlag(counters.id))
  const moderation = await moderateInput(message, crisisActive)

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
    return sseResponse(encodeSSE(reply, CRISIS_WIDGET), {
      ...nextCounters,
      crisis_flag: true,
    })
  }

  if (moderation.flagged) {
    await persist(HARM_RESPONSE)
    return sseResponse(encodeSSE(HARM_RESPONSE), nextCounters)
  }

  // retrieveContext swallows its own failures and returns [], so a retrieval
  // outage degrades to an unaugmented prompt rather than breaking the chat.
  const ragChunks = await retrieveContext(message)
  const contextBlock = buildContextBlock(ragChunks)
  const systemPrompt = ANCHOR_SYSTEM_PROMPT.replace('{context}', contextBlock)

  try {
    const anthropic = getAnthropic()
    const abortController = new AbortController()

    const stream = anthropic.messages.stream(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: claudeMessages,
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
                encoder.encode(`data: ${JSON.stringify({ text: token })}\n\n`),
              )
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          await persist(fullText)
        } catch {
          controller.enqueue(encoder.encode(encodeSSE(FALLBACK_MESSAGE)))
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
    return sseResponse(encodeSSE(FALLBACK_MESSAGE), nextCounters)
  }
}
