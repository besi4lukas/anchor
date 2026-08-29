'use client'

import { ChatInput } from '@/components/chat/ChatInput'

interface WelcomeScreenProps {
  onSend: (message: string) => void
  disabled?: boolean
}

/**
 * The empty state. The composer sits in the middle of the screen rather than
 * pinned to the bottom, so the first thing to do is the only thing on offer.
 */
export function WelcomeScreen({ onSend, disabled }: WelcomeScreenProps) {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
      <h1 className="mb-6 font-serif text-[40px] font-medium tracking-tight text-anchor-ink-strong">
        Hey Stranger!
      </h1>
      <div className="w-full max-w-3xl">
        <ChatInput onSend={onSend} disabled={disabled} />
      </div>
    </main>
  )
}
