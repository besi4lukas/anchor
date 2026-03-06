import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import {
  getSession,
  updateSession,
  SESSION_COOKIE,
  type ChatMessage,
} from '@/lib/session'
import { ANCHOR_SYSTEM_PROMPT } from '@/lib/anchor-persona'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_MESSAGES = 30
const CONTEXT_WINDOW = 20
const STREAM_TIMEOUT_MS = 15_000
const FALLBACK_MESSAGE =
  'Anchor is taking a short breather. Please try again in a moment.'

function getAnthropic(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function streamText(text: string): Response {
  const encoder = new TextEncoder()
  const body = encoder.encode(
    `data: ${JSON.stringify({ text })}\n\ndata: [DONE]\n\n`,
  )

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function POST(req: NextRequest): Promise<Response> {
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value
  if (!sessionId) {
    return NextResponse.json({ error: 'No session' }, { status: 401 })
  }

  const session = await getSession(sessionId)
  if (!session) {
    return NextResponse.json(
      { error: 'Session expired or not found' },
      { status: 410 },
    )
  }

  if (session.message_count + 2 > MAX_MESSAGES) {
    return NextResponse.json(
      { error: 'Message limit reached' },
      { status: 429 },
    )
  }

  let message: string
  try {
    const body = await req.json()
    message = typeof body.message === 'string' ? body.message.trim() : ''
  } catch {
    message = ''
  }

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const userMessage: ChatMessage = {
    role: 'user',
    content: message,
    timestamp: Date.now(),
  }
  session.messages.push(userMessage)
  session.message_count += 1

  const recentMessages = session.messages.slice(-CONTEXT_WINDOW)
  const claudeMessages = recentMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const systemPrompt = ANCHOR_SYSTEM_PROMPT.replace('{context}', '')

  try {
    const anthropic = getAnthropic()
    const abortController = new AbortController()

    const stream = anthropic.messages.stream(
      {
        model: 'claude-sonnet-4-20250514',
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

          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: fullText,
            timestamp: Date.now(),
          }
          session.messages.push(assistantMessage)
          session.message_count += 1
          await updateSession(session)
        } catch {
          const fallbackMsg: ChatMessage = {
            role: 'assistant',
            content: FALLBACK_MESSAGE,
            timestamp: Date.now(),
          }
          session.messages.push(fallbackMsg)
          session.message_count += 1

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ text: FALLBACK_MESSAGE })}\n\ndata: [DONE]\n\n`,
            ),
          )
          controller.close()
          await updateSession(session)
        }
      },
      cancel() {
        abortController.abort()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch {
    const fallbackMsg: ChatMessage = {
      role: 'assistant',
      content: FALLBACK_MESSAGE,
      timestamp: Date.now(),
    }
    session.messages.push(fallbackMsg)
    session.message_count += 1
    await updateSession(session)
    return streamText(FALLBACK_MESSAGE)
  }
}
