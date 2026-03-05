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

const OPENING_MESSAGE =
  "Hey, I'm Anchor. This is your space \u2014 no judgment, no records. How are you feeling right now?"

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expired, setExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const typeOutMessage = useCallback((text: string) => {
    let index = 0
    setMessages([{ role: 'assistant', content: '' }])

    typingRef.current = setInterval(() => {
      index++
      setMessages([{ role: 'assistant', content: text.slice(0, index) }])
      if (index >= text.length && typingRef.current) {
        clearInterval(typingRef.current)
        typingRef.current = null
      }
    }, 25)
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/session/create', { method: 'POST' })
        const data = await res.json()
        setSessionId(data.sessionId)
        setExpiresAt(data.expiresAt)
        typeOutMessage(OPENING_MESSAGE)
      } catch {
        setError('Failed to start session. Please refresh.')
      }
    }
    init()

    return () => {
      if (typingRef.current) clearInterval(typingRef.current)
    }
  }, [typeOutMessage])

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
    if (typingRef.current) {
      clearInterval(typingRef.current)
      typingRef.current = null
    }
    setExpired(false)
    setMessages([])
    setError(null)

    const init = async () => {
      try {
        const res = await fetch('/api/session/create', { method: 'POST' })
        const data = await res.json()
        setSessionId(data.sessionId)
        setExpiresAt(data.expiresAt)
        typeOutMessage(OPENING_MESSAGE)
      } catch {
        setError('Failed to start session. Please refresh.')
      }
    }
    init()
  }, [typeOutMessage])

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
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-6">
          <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="fixed inset-x-0 bottom-0 px-4 pb-4 pt-6">
          <div className="mx-auto max-w-3xl">
            <div className="h-11 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <header className="flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-sm">
        <h1 className="font-serif text-lg font-medium text-[#1A1A2E]">
          Anchor
        </h1>
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

      <div className="flex-1 overflow-y-auto pb-24">
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
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </main>
  )
}
