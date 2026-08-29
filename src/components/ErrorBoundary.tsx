'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Screen } from '@/components/ui/Screen'
import { focusRing } from '@/components/ui/focus-ring'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  /**
   * Overridable because jsdom makes both window.location and location.reload
   * non-configurable, so the default is untestable in place. Injecting it keeps
   * the wiring under test instead of asserting the button merely exists.
   */
  onReset?: () => void
}

interface State {
  hasError: boolean
}

/**
 * A class component because getDerivedStateFromError has no hook equivalent —
 * React offers no function-component way to catch a render error.
 *
 * The fallback deliberately says nothing about what broke. This is a mental
 * health chat, and a stack trace or error string on screen at the wrong moment
 * is both alarming and a way for transcript content to leak into view.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The console, not the screen: this runs in the browser, so the point is
    // that nothing here reaches the person. The component stack is names only,
    // never the content those components rendered.
    console.error('[ErrorBoundary]', error.message, info.componentStack)
  }

  private handleReset = (): void => {
    // A full reload rather than resetting state: the tree that threw may hold a
    // half-streamed message, and starting clean is the honest option in a
    // product whose promise is that nothing is kept anyway.
    if (this.props.onReset) {
      this.props.onReset()
      return
    }
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <Screen
        center
        role="alert"
        data-testid="error-boundary"
        className="text-center"
      >
        <p className="font-serif text-lg font-medium text-anchor-brand-blue">
          anchor
        </p>

        <h1 className="mt-6 text-xl font-semibold text-anchor-ink-strong">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-sm text-sm text-gray-600">
          The conversation could not be shown. Nothing was saved, and starting
          again will not carry anything over.
        </p>

        {/* Deliberately not the `primary` variant: this is the only primary
            button in the app that is blue rather than mint, and adopting the
            variant would change its padding too. Kept as-is so this pass
            changes nothing on screen; the colour split is worth settling
            separately. */}
        <button
          type="button"
          onClick={this.handleReset}
          className={cn(
            focusRing({ ring: 'brand' }),
            'mt-8 min-h-[44px] rounded-xl bg-anchor-brand-blue px-6 text-sm font-medium text-white transition-opacity hover:opacity-90',
          )}
        >
          Start fresh
        </button>

        <p className="mt-6 text-xs text-gray-500">
          If you are in crisis, call or text 988, or call 911 in an emergency.
        </p>
      </Screen>
    )
  }
}
