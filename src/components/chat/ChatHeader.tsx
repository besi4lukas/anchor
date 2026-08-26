'use client'

import { SessionTimer } from '@/components/chat/SessionTimer'

interface ChatHeaderProps {
  expiresAt: string | null
  extended: boolean
  onRestart: () => void
  onExit: () => void
  onExpire: () => void
  onExtend: (newExpiry: string) => void
}

export function ChatHeader({
  expiresAt,
  extended,
  onRestart,
  onExit,
  onExpire,
  onExtend,
}: ChatHeaderProps) {
  return (
    <header className="z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-2 backdrop-blur-sm">
      <button
        type="button"
        onClick={onRestart}
        className="rounded-lg px-2 py-2 font-serif text-lg font-medium text-[#1A1A2E] transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A2E]"
      >
        Anchor
      </button>
      <div className="flex items-center gap-2">
        {expiresAt && (
          <SessionTimer
            expiresAt={expiresAt}
            onExpire={onExpire}
            extended={extended}
            onExtend={onExtend}
          />
        )}
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg px-2 py-3 text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A2E]"
        >
          Clear &amp; Exit
        </button>
      </div>
    </header>
  )
}
