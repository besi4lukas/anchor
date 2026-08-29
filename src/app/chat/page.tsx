'use client'

import { useCallback } from 'react'
import { MotionProvider } from '@/components/chat/MotionProvider'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { SessionBootstrap } from '@/components/chat/SessionBootstrap'
import { WelcomeScreen } from '@/components/chat/WelcomeScreen'
import { Transcript } from '@/components/chat/Transcript'
import { useSession } from '@/hooks/useSession'
import { useChatStream } from '@/hooks/useChatStream'

export default function Chat() {
  const session = useSession()
  const chat = useChatStream(session.sessionId)

  // The only place the two halves meet: starting over means both a clean
  // transcript and a new session, and neither hook can do the other's part.
  const handleRestart = useCallback(() => {
    chat.reset()
    session.restart()
  }, [chat, session])

  if (!session.sessionId) {
    return <SessionBootstrap error={session.error} onRetry={handleRestart} />
  }

  return (
    <MotionProvider>
      {/* h-dvh + overflow-hidden makes the transcript the only scrolling
          region, so the header stays put however long the conversation gets. */}
      <div className="flex h-dvh flex-col overflow-hidden bg-[#F8FAFC]">
        <ChatHeader
          expiresAt={session.expiresAt}
          extended={session.extended}
          onRestart={handleRestart}
          onExit={session.exit}
          onExpire={session.expire}
          onExtend={session.extend}
        />

        {chat.messages.length === 0 ? (
          <WelcomeScreen onSend={chat.send} disabled={chat.isLoading} />
        ) : (
          <Transcript
            messages={chat.messages}
            error={chat.error}
            isLoading={chat.isLoading}
            onSend={chat.send}
          />
        )}
      </div>
    </MotionProvider>
  )
}
