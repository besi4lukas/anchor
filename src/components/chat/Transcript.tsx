'use client'

import { useEffect, useMemo, useRef } from 'react'
import { m } from 'framer-motion'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { CrisisResourceCard } from '@/components/chat/CrisisResourceCard'
import { BoxBreathing } from '@/components/chat/BoxBreathing'
import { WIDGET_ENTRY } from '@/components/chat/motion'
import { stripMarkers } from '@/lib/markers'
import {
  FIRST_MESSAGE_PLACEHOLDER,
  REPLY_PLACEHOLDER,
  MODEL_DISCLAIMER,
} from '@/lib/copy'
import type { Message } from '@/lib/types'

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

interface TranscriptMessageProps {
  message: Message
  showCrisisResources: boolean
  showBreathing: boolean
}

/**
 * One turn, plus whatever the server asked to be shown beside it.
 *
 * Widgets fade without moving. They arrive under a message that has just
 * settled, and sliding a second block in would read as the page still loading.
 */
function TranscriptMessage({
  message,
  showCrisisResources,
  showBreathing,
}: TranscriptMessageProps) {
  if (message.role !== 'assistant') {
    return (
      <MessageBubble
        role={message.role}
        content={message.content}
        isStreaming={message.isStreaming}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <MessageBubble
        role={message.role}
        content={stripMarkers(message.content)}
        isStreaming={message.isStreaming}
      />
      {showCrisisResources && (
        <m.div {...WIDGET_ENTRY}>
          <CrisisResourceCard />
        </m.div>
      )}
      {showBreathing && (
        <m.div {...WIDGET_ENTRY}>
          <BoxBreathing />
        </m.div>
      )}
    </div>
  )
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
    (message) =>
      message.role === 'assistant' && message.content.trim().length > 0,
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
          {/* Index as key: this list only ever appends, and a stable identity
              per position is what keeps a bubble from remounting — and
              re-running its entry animation — on every streamed token. */}
          {messages.map((message, i) => (
            <TranscriptMessage
              key={i}
              message={message}
              showCrisisResources={i === latest.crisis}
              showBreathing={i === latest.breathing}
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

      <div className="shrink-0 bg-anchor-surface px-4 pb-4 pt-3">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            onSend={onSend}
            disabled={isLoading}
            placeholder={
              hasAssistantResponded
                ? REPLY_PLACEHOLDER
                : FIRST_MESSAGE_PLACEHOLDER
            }
          />
          {hasAssistantResponded && (
            <p className="mt-3 text-center text-[13px] text-gray-600">
              {MODEL_DISCLAIMER}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
