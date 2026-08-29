import { cn } from '@/lib/utils'
import type { ReactNode, HTMLAttributes } from 'react'

interface ScreenProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  /** Centres the contents on both axes — the shape every holding state uses. */
  center?: boolean
}

/**
 * A full-viewport `<main>` on the chat surface: what fills the screen when
 * there is no conversation to show yet, or no longer one to show.
 */
export function Screen({
  children,
  center = false,
  className,
  ...props
}: ScreenProps) {
  return (
    <main
      className={cn(
        'flex min-h-screen flex-col bg-anchor-surface',
        center && 'items-center justify-center px-6',
        className,
      )}
      {...props}
    >
      {children}
    </main>
  )
}
