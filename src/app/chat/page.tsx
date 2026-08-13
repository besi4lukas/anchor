'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { SessionTimer } from '@/components/chat/SessionTimer'
import { CONTEXT_WINDOW } from '@/lib/session-config'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

function isValidSessionPayload(
  data: unknown,
): data is { sessionId: string; expiresAt: string } {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.sessionId === 'string' &&
    obj.sessionId.length > 0 &&
    typeof obj.expiresAt === 'string' &&
    obj.expiresAt.length > 0
  )
}

export default function Chat() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const initSession = useCallback(async () => {
    try {
      const res = await fetch('/api/session/create', { method: 'POST' })
      if (!res.ok) throw new Error(`Session create failed: ${res.status}`)
      const data: unknown = await res.json()
      if (!isValidSessionPayload(data)) {
        throw new Error('Invalid session response')
      }
      setSessionId(data.sessionId)
      setExpiresAt(data.expiresAt)
    } catch {
      setError('Failed to start session. Please refresh.')
    }
  }, [])

  useEffect(() => {
    initSession()
  }, [initSession])

  const handleSend = useCallback(
    async (content: string) => {
      if (!sessionId) return

      setError(null)
      setMessages((prev) => [...prev, { role: 'user', content }])
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', isStreaming: true },
      ])
      setIsLoading(true)

      // The server prefers its own copy of the transcript, but sending ours
      // means the conversation survives the cache being down.
      const history = messages
        .filter((m) => !m.isStreaming && m.content.trim().length > 0)
        .slice(-CONTEXT_WINDOW)
        .map((m) => ({ role: m.role, content: m.content }))

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
          const retryAfter = Number(res.headers.get('Retry-After'))
          const wait =
            Number.isFinite(retryAfter) && retryAfter > 0
              ? `about ${retryAfter} second${retryAfter === 1 ? '' : 's'}`
              : 'a moment'
          setMessages((prev) => prev.slice(0, -1))
          setError(`That was a lot at once. Try again in ${wait}.`)
          return
        }

        if (!res.ok) throw new Error('Chat request failed')

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error('No response stream')

        let accumulated = ''
        let sseBuffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          sseBuffer += decoder.decode(value, { stream: true })
          const parts = sseBuffer.split('\n')
          sseBuffer = parts.pop() ?? ''

          for (const line of parts) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()

            if (payload === '[DONE]') continue

            try {
              const parsed = JSON.parse(payload)
              accumulated += parsed.text
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: accumulated,
                    isStreaming: false,
                  }
                }
                return updated
              })
            } catch {
              // skip malformed SSE lines
            }
          }
        }

        if (sseBuffer.trim()) {
          const line = sseBuffer.trim()
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim()
            if (payload !== '[DONE]') {
              try {
                const parsed = JSON.parse(payload)
                accumulated += parsed.text
                setMessages((prev) => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (last.role === 'assistant') {
                    updated[updated.length - 1] = {
                      ...last,
                      content: accumulated,
                      isStreaming: false,
                    }
                  }
                  return updated
                })
              } catch {
                // skip malformed final line
              }
            }
          }
        }

        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, isStreaming: false }
          }
          return updated
        })
      } catch {
        setMessages((prev) => {
          const updated = [...prev]
          if (updated[updated.length - 1]?.isStreaming) {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: 'Anchor is connecting\u2026 please try again.',
              isStreaming: false,
            }
          }
          return updated
        })
        setError('Anchor is connecting\u2026')
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, messages],
  )

  // The end-of-session feedback screen is not built yet, so both exit paths
  // return to the landing page.
  const handleExit = useCallback(async () => {
    try {
      await fetch('/api/session', { method: 'DELETE' })
    } catch {
      // best-effort cleanup
    }
    router.push('/')
  }, [router])

  const handleRestart = useCallback(() => {
    setMessages([])
    setError(null)
    setSessionId(null)
    setExpiresAt(null)
    initSession()
  }, [initSession])

  const handleExpire = useCallback(() => {
    router.push('/')
  }, [router])

  if (!sessionId) {
    if (error) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-6">
          <p
            data-testid="bootstrap-error"
            role="alert"
            className="mb-4 text-center text-sm text-red-700"
          >
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              setError(null)
              initSession()
            }}
            className="rounded-xl bg-[#A6EEBF] px-6 py-3 text-sm font-medium text-[#1A1A2E] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A2E]"
          >
            Try again
          </button>
        </main>
      )
    }

    return (
      <main
        aria-busy
        aria-label="Starting your session"
        className="flex min-h-screen flex-col bg-[#F8FAFC]"
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-sm">
          <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="mb-6 h-12 w-12 animate-pulse rounded-full bg-gray-200" />
          <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="w-full max-w-2xl">
            <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200" />
          </div>
        </div>
      </main>
    )
  }

  const hasAssistantResponded = messages.some(
    (m) => m.role === 'assistant' && m.content.trim().length > 0,
  )

  return (
    // h-dvh + overflow-hidden makes the transcript the only scrolling region,
    // so the header stays put however long the conversation gets.
    <div className="flex h-dvh flex-col overflow-hidden bg-[#F8FAFC]">
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-2 backdrop-blur-sm">
        <button
          type="button"
          onClick={handleRestart}
          className="rounded-lg px-2 py-2 font-serif text-lg font-medium text-[#1A1A2E] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A2E]"
        >
          Anchor
        </button>
        <div className="flex items-center gap-2">
          {expiresAt && (
            <SessionTimer expiresAt={expiresAt} onExpire={handleExpire} />
          )}
          <button
            type="button"
            onClick={handleExit}
            className="rounded-lg px-2 py-3 text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A2E]"
          >
            Clear &amp; Exit
          </button>
        </div>
      </header>

      {messages.length === 0 ? (
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
          <h1 className="mb-6 font-serif text-[40px] font-medium tracking-tight text-[#1A1A2E]">
            Hey Stranger!
          </h1>
          <div className="w-full max-w-3xl">
            <ChatInput
              onSend={handleSend}
              disabled={isLoading}
              placeholder="How are you feeling right now..."
            />
          </div>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col">
          <h1 className="sr-only">Your Anchor session</h1>
          <div className="flex-1 overflow-y-auto">
            <div
              role="log"
              aria-live="polite"
              aria-label="Conversation"
              className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6"
            >
              {messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.isStreaming}
                />
              ))}
              {error && (
                <p
                  data-testid="chat-error"
                  role="status"
                  className="text-center text-xs text-orange-700"
                >
                  {error}
                </p>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 bg-[#F8FAFC] px-4 pb-4 pt-3">
            <div className="mx-auto max-w-3xl">
              <ChatInput
                onSend={handleSend}
                disabled={isLoading}
                placeholder={
                  hasAssistantResponded
                    ? 'Reply...'
                    : 'How are you feeling right now...'
                }
              />
              {hasAssistantResponded && (
                <p className="mt-3 text-center text-[13px] text-gray-600">
                  Anchor can make mistakes. If it is an emergency call 911
                </p>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
