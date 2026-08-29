'use client'

import { Button } from '@/components/ui/Button'
import { Screen } from '@/components/ui/Screen'
import { Skeleton } from '@/components/ui/Skeleton'

interface SessionBootstrapProps {
  error: string | null
  onRetry: () => void
}

/**
 * What fills the screen before there is a session to talk in — a skeleton
 * while the request is out, and a way back if it failed.
 *
 * The skeleton mirrors the real layout rather than showing a spinner, so the
 * page does not jump when the conversation replaces it.
 */
export function SessionBootstrap({ error, onRetry }: SessionBootstrapProps) {
  if (error) {
    return (
      <Screen center>
        <p
          data-testid="bootstrap-error"
          role="alert"
          className="mb-4 text-center text-sm text-red-700"
        >
          {error}
        </p>
        <Button onClick={onRetry}>Try again</Button>
      </Screen>
    )
  }

  return (
    <Screen aria-busy aria-label="Starting your session">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-sm">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <Skeleton className="mb-6 h-12 w-12 rounded-full" />
        <Skeleton className="mb-8 h-8 w-48" />
        <div className="w-full max-w-2xl">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </Screen>
  )
}
