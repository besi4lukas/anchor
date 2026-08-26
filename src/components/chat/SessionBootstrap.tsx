'use client'

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
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-6">
        <p
          data-testid="bootstrap-error"
          role="alert"
          className="mb-4 text-center text-sm text-red-700"
        >
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-[#A6EEBF] px-6 py-3 text-sm font-medium text-[#1A1A2E] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A2E]"
        >
          Try again
        </button>
      </main>
    )
  }

  return (
    <main
      aria-busy
      aria-label="Starting your session"
      className="flex min-h-screen flex-col bg-[#F8FAFC]"
    >
      <div className="flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-sm">
        <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-12 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="mb-6 h-12 w-12 animate-pulse rounded-full bg-gray-200" />
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="w-full max-w-2xl">
          <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>
    </main>
  )
}
