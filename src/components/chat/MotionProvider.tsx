'use client'

import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion'

/**
 * LazyMotion with the `domAnimation` feature set loads roughly a third of what
 * the full `motion` import costs, and it is all this app needs: opacity and
 * transform tweens. Nothing here uses layout animation, drag, or springs.
 *
 * `reducedMotion="user"` defers to the OS setting, so every animation below
 * turns itself off for anyone who has asked for that — which for a product
 * people reach for when overwhelmed is the setting most worth honouring.
 */
interface MotionProviderProps {
  children: React.ReactNode
}

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
