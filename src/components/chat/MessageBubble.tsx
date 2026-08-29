'use client'

import { m } from 'framer-motion'
import { cva } from 'class-variance-authority'
import { TypingIndicator } from './TypingIndicator'
import { MESSAGE_ENTRY } from '@/components/chat/motion'
import type { Message } from '@/lib/types'

interface MessageBubbleProps {
  role: Message['role']
  content: string
  isStreaming?: boolean
}

/**
 * Anchor's replies are the page; the person's own words are a card sitting on
 * it. That is the only structural difference between the two — same element,
 * same streaming behaviour, different surface.
 */
const bubbleVariants = cva(
  'relative font-serif text-[17px] leading-[1.75] text-anchor-ink-strong',
  {
    variants: {
      role: {
        user: 'max-w-[85%] rounded-2xl bg-anchor-bubble px-4 py-3 sm:max-w-[70%]',
        assistant: 'w-full',
      },
    },
  },
)

/** Read out before the message so the two voices are distinguishable aloud. */
const SPOKEN_PREFIX: Record<Message['role'], string> = {
  user: 'You said: ',
  assistant: 'Anchor said: ',
}

/**
 * Entry animation only, and only on opacity and transform — both composited on
 * the GPU, so a message arriving mid-stream never triggers layout or paint on
 * the rest of the transcript. `initial` runs once per mount, so the tokens
 * streaming into the last bubble re-render without re-animating anything.
 */
export function MessageBubble({
  role,
  content,
  isStreaming,
}: MessageBubbleProps) {
  return (
    <m.div
      {...MESSAGE_ENTRY}
      data-role={role}
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div data-testid="message-bubble" className={bubbleVariants({ role })}>
        <span className="sr-only">{SPOKEN_PREFIX[role]}</span>
        {isStreaming ? (
          <TypingIndicator />
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </m.div>
  )
}
