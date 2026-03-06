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
          className="max-w-[85%] font-serif text-[17px] leading-[1.75] text-gray-500 sm:max-w-[70%]"
        >
          {isStreaming ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </div>
      ) : (
        <div
          data-testid="message-bubble"
          className="w-full font-serif text-[17px] leading-[1.75] text-[#1A1A2E]"
        >
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
