'use client'

import { useEffect, useMemo, useRef } from 'react'
import { m } from 'framer-motion'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { CrisisResourceCard } from '@/components/chat/ResourceCard'
import { BoxBreathing } from '@/components/chat/BoxBreathing'
import { stripMarkers } from '@/lib/markers'
import type { Message } from '@/hooks/useChatStream'

/** Opacity only — no movement, nothing that can push surrounding text around. */
const WIDGET_ENTRY = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2, ease: 'easeOut' },
} as const

interface TranscriptProps {
  messages: Message[]
  error: string | null
  isLoading: boolean
  onSend: (message: string) => void
}

/**
 * Each widget is rendered once, against the most recent message that asked for
 * it. In crisis mode every reply carries a card, and left alone that stacks a
 * wall of identical amber blocks down the transcript; anchoring to the latest
 * keeps the resources beside the newest message, where they are actually
 * useful.
 */
function useLatestWidgetIndices(messages: Message[]) {
  return useMemo(() => {
    let crisis = -1
    let breathing = -1

    messages.forEach((message, i) => {
      if (message.showCrisisResources) crisis = i
      if (message.showBreathing) breathing = i
    })

    return { crisis, breathing }
  }, [messages])
}

export function Transcript({
  messages,
  error,
  isLoading,
  onSend,
}: TranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const latest = useLatestWidgetIndices(messages)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const hasAssistantResponded = messages.some(
    (m) => m.role === 'assistant' && m.content.trim().length > 0,
  )

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Your Anchor session</h1>
      <div className="flex-1 overflow-y-auto">
        <div
          role="log"
          aria-live="polite"
          aria-label="Conversation"
          className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6"
        >
          {messages.map((msg, i) => {
            if (msg.role !== 'assistant') {
              return (
                <MessageBubble
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.isStreaming}
                />
              )
            }

            return (
              <div key={i} className="flex flex-col gap-3">
                <MessageBubble
                  role={msg.role}
                  content={stripMarkers(msg.content)}
                  isStreaming={msg.isStreaming}
                />
                {/* Widgets fade without moving. They arrive under a message
                  that has just settled, and sliding a second block would
                  read as the page still loading. */}
                {i === latest.crisis && (
                  <m.div {...WIDGET_ENTRY}>
                    <CrisisResourceCard />
                  </m.div>
                )}
                {i === latest.breathing && (
                  <m.div {...WIDGET_ENTRY}>
                    <BoxBreathing />
                  </m.div>
                )}
              </div>
            )
          })}
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
            onSend={onSend}
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
  )
}
