'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { readChatStream } from '@/lib/chat-stream'
import { CRISIS_WIDGET, BREATHING_WIDGET } from '@/lib/markers'
import { CONTEXT_WINDOW } from '@/lib/session-config'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  /** Both set only by server widget events — never inferred from message text. */
  showCrisisResources?: boolean
  showBreathing?: boolean
}

const CONNECTING_MESSAGE = 'Anchor is connecting… please try again.'
const CONNECTING_ERROR = 'Anchor is connecting…'

/** How long to tell someone to wait, from the server's own Retry-After. */
function retryWording(header: string | null): string {
  const seconds = Number(header)
  return Number.isFinite(seconds) && seconds > 0
    ? `about ${seconds} second${seconds === 1 ? '' : 's'}`
    : 'a moment'
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

      // Taken before the optimistic appends: the server receives this message
      // separately, so its own copy of the history must not already contain it.
      // The server prefers its own copy, but sending ours means the
      // conversation survives the cache being down.
      const history = messagesRef.current
        .filter((m) => !m.isStreaming && m.content.trim().length > 0)
        .slice(-CONTEXT_WINDOW)
        .map((m) => ({ role: m.role, content: m.content }))

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
        })

        // A throttled send is a normal outcome, not a connection failure, so it
        // gets its own wording and the server's Retry-After rather than the
        // generic reconnecting message.
        if (res.status === 429) {
          setMessages((prev) => prev.slice(0, -1))
          setError(
            `That was a lot at once. Try again in ${retryWording(
              res.headers.get('Retry-After'),
            )}.`,
          )
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
        setMessages((prev) => {
          const updated = [...prev]
          if (updated[updated.length - 1]?.isStreaming) {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: CONNECTING_MESSAGE,
              isStreaming: false,
            }
          }
          return updated
        })
        setError(CONNECTING_ERROR)
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, updateStreamingMessage],
  )

  const reset = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isLoading, error, send, reset }
}
