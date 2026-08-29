'use client'

import { SessionTimer } from '@/components/chat/SessionTimer'
import { Button } from '@/components/ui/Button'

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
      <Button
        variant="ghost"
        onClick={onRestart}
        className="py-2 font-serif text-lg font-medium text-anchor-ink-strong transition-opacity hover:opacity-80"
      >
        Anchor
      </Button>
      <div className="flex items-center gap-2">
        {expiresAt && (
          <SessionTimer
            expiresAt={expiresAt}
            onExpire={onExpire}
            extended={extended}
            onExtend={onExtend}
          />
        )}
        <Button
          variant="ghost"
          onClick={onExit}
          className="py-3 text-xs font-medium text-gray-600 transition-colors hover:text-gray-900"
        >
          Clear &amp; Exit
        </Button>
      </div>
    </header>
  )
}
