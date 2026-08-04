'use client'

import { TypingIndicator } from './TypingIndicator'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export function MessageBubble({
  role,
  content,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === 'user'

  return (
    <div
      data-role={role}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {isUser ? (
        <div
          data-testid="message-bubble"
          className="relative max-w-[85%] rounded-2xl bg-[#EDF1F5] px-4 py-3 font-serif text-[17px] leading-[1.75] text-[#1A1A2E] sm:max-w-[70%]"
        >
          <span className="sr-only">You said: </span>
          {isStreaming ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </div>
      ) : (
        <div
          data-testid="message-bubble"
          className="relative w-full font-serif text-[17px] leading-[1.75] text-[#1A1A2E]"
        >
          <span className="sr-only">Anchor said: </span>
          {isStreaming ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </div>
      )}
    </div>
  )
}
