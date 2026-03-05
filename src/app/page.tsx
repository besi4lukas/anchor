'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { SessionTimer } from '@/components/chat/SessionTimer'
import { ExpiryScreen } from '@/components/chat/ExpiryScreen'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/session/create', { method: 'POST' })
        const data = await res.json()
        setSessionId(data.sessionId)
        setExpiresAt(data.expiresAt)
      } catch {
        setError('Failed to start session. Please refresh.')
      }
    }
    init()
  }, [])

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

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        })

        if (!res.ok) throw new Error('Chat request failed')

        const reader = res.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error('No response stream')

        let accumulated = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
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
    [sessionId],
  )

  const handleExit = useCallback(async () => {
    try {
      await fetch('/api/session', { method: 'DELETE' })
    } catch {
      // best-effort cleanup
    }
    setExpired(true)
  }, [])

  const handleRestart = useCallback(() => {
    setExpired(false)
    setMessages([])
    setError(null)

    const init = async () => {
      try {
        const res = await fetch('/api/session/create', { method: 'POST' })
        const data = await res.json()
        setSessionId(data.sessionId)
        setExpiresAt(data.expiresAt)
      } catch {
        setError('Failed to start session. Please refresh.')
      }
    }
    init()
  }, [])

  const handleExpire = useCallback(() => {
    setExpired(true)
  }, [])

  if (expired) {
    return <ExpiryScreen onRestart={handleRestart} />
  }

  // Loading skeleton while session initializes
  if (!sessionId) {
    return (
      <main className="flex min-h-screen flex-col bg-[#F8FAFC]">
        <header className="flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-sm">
          <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
        </header>
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

  const hasAssistantResponded = messages.some((m) => m.role === 'assistant')

  return (
    <main className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <header className="flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-sm">
        <button
          onClick={handleRestart}
          className="font-serif text-lg font-medium text-[#1A1A2E] transition-opacity hover:opacity-80"
        >
          Anchor
        </button>
        <div className="flex items-center gap-3">
          {expiresAt && (
            <SessionTimer expiresAt={expiresAt} onExpire={handleExpire} />
          )}
          <button
            type="button"
            onClick={handleExit}
            className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
          >
            Clear &amp; Exit
          </button>
        </div>
      </header>

      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-[180px]">
          <div className="mb-6 flex items-center justify-center gap-3">
            <svg
              width="40"
              height="40"
              viewBox="0 0 56 56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-sm"
            >
              <circle
                cx="28"
                cy="28"
                r="28"
                fill="#A6EEBF"
                fillOpacity="0.4"
                className="blur-[2px]"
              />
              <circle
                cx="28"
                cy="28"
                r="20"
                fill="#A6EEBF"
                fillOpacity="0.7"
                className="blur-[1px]"
              />
              <circle cx="28" cy="28" r="14" fill="#A6EEBF" />
            </svg>
            <h2 className="font-serif text-[40px] font-medium tracking-tight text-[#1A1A2E]">
              Hey Stranger!
            </h2>
          </div>
          <div className="w-full max-w-3xl">
            <ChatInput
              onSend={handleSend}
              disabled={isLoading}
              placeholder="How are you feeling right now..."
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto pb-32">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
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
                  className="text-center text-xs text-orange-400"
                >
                  {error}
                </p>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#F8FAFC] from-80% to-transparent px-4 pb-4 pt-6">
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
                <p className="mt-3 text-center text-[13px] text-gray-400">
                  Anchor can make mistakes. If it is an emergency call 911
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
