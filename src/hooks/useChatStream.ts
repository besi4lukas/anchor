'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { readChatStream } from '@/lib/chat-stream'
import { CRISIS_WIDGET, BREATHING_WIDGET } from '@/lib/markers'
import { HTTP_TOO_MANY_REQUESTS } from '@/lib/http'
import { CONTEXT_WINDOW } from '@/lib/session-config'
import { retryWording } from '@/lib/retry-wording'
import type { Message } from '@/lib/types'

const CONNECTING_MESSAGE = 'Anchor is connecting… please try again.'
const CONNECTING_ERROR = 'Anchor is connecting…'

/** The transcript the client posts alongside the new message. Its own copy is
 *  a fallback for the cache being down, so it must not already contain the
 *  message the server is receiving separately. */
function historyFor(messages: Message[]) {
  return messages
    .filter((m) => !m.isStreaming && m.content.trim().length > 0)
    .slice(-CONTEXT_WINDOW)
    .map((m) => ({ role: m.role, content: m.content }))
}

/** A throttled send is a normal outcome, not a connection failure, so it gets
 *  its own wording and the server's own Retry-After. */
function rateLimitMessage(res: Response): string {
  return `That was a lot at once. Try again in ${retryWording(
    res.headers.get('Retry-After'),
  )}.`
}

/** Replaces a half-streamed bubble with something someone can keep talking
 *  from, rather than leaving an empty one on screen. */
function failStreamingMessage(messages: Message[]): Message[] {
  const updated = [...messages]
  if (updated[updated.length - 1]?.isStreaming) {
    updated[updated.length - 1] = {
      role: 'assistant',
      content: CONNECTING_MESSAGE,
      isStreaming: false,
    }
  }
  return updated
}

export interface ChatStream {
  messages: Message[]
  isLoading: boolean
  error: string | null
  send: (content: string) => Promise<void>
  reset: () => void
}

/**
 * The transcript and the request that fills it.
 *
 * Sending is optimistic: the person's message and an empty assistant bubble go
 * up immediately, and the bubble fills in as tokens arrive. Every exit from
 * the request leaves the transcript in a state somebody can keep talking from.
 */
export function useChatStream(sessionId: string | null): ChatStream {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A stream nobody is reading still costs tokens and holds a connection open,
  // so leaving the page or starting over cancels it rather than letting it run
  // to completion unobserved.
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => () => abortRef.current?.abort(), [])

  // Read by `send` so the callback does not have to depend on `messages` —
  // otherwise it is rebuilt on every streamed token and re-renders the input
  // underneath the person typing.
  const messagesRef = useRef<Message[]>(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  /** Applies one streamed change to the assistant bubble at the end. */
  const updateStreamingMessage = useCallback(
    (change: (message: Message) => Message) => {
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (!last || last.role !== 'assistant') return prev
        updated[updated.length - 1] = change(last)
        return updated
      })
    },
    [],
  )

  const send = useCallback(
    async (content: string) => {
      if (!sessionId) return

      // One stream at a time. The composer is disabled while a reply arrives,
      // so this is belt-and-braces rather than a path anyone reaches.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      // Taken before the optimistic appends below, so the history posted
      // excludes the message being sent.
      const history = historyFor(messagesRef.current)

      setError(null)
      setMessages((prev) => [...prev, { role: 'user', content }])
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', isStreaming: true },
      ])
      setIsLoading(true)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, messages: history }),
          signal: controller.signal,
        })

        if (res.status === HTTP_TOO_MANY_REQUESTS) {
          setMessages((prev) => prev.slice(0, -1))
          setError(rateLimitMessage(res))
          return
        }

        if (!res.ok) throw new Error('Chat request failed')
        if (!res.body) throw new Error('No response stream')

        let accumulated = ''

        // An event carries either a text token or a widget name. Widgets come
        // from the server's own branch, never from model output, which is what
        // stops a reply from talking its way into rendering a crisis card.
        for await (const event of readChatStream(res.body)) {
          if (event.type === 'text') {
            accumulated += event.text
            updateStreamingMessage((last) => ({
              ...last,
              content: accumulated,
              isStreaming: false,
            }))
          } else {
            updateStreamingMessage((last) => ({
              ...last,
              isStreaming: false,
              showCrisisResources:
                last.showCrisisResources || event.widget === CRISIS_WIDGET,
              showBreathing:
                last.showBreathing || event.widget === BREATHING_WIDGET,
            }))
          }
        }

        updateStreamingMessage((last) => ({ ...last, isStreaming: false }))
      } catch {
        // A cancel is something we asked for — the transcript it belonged to is
        // already gone or going, so it must not leave a failure on screen.
        if (controller.signal.aborted) return

        setMessages(failStreamingMessage)
        setError(CONNECTING_ERROR)
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, updateStreamingMessage],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
  }, [])

  return { messages, isLoading, error, send, reset }
}
