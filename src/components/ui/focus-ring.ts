import { cva, type VariantProps } from 'class-variance-authority'

/**
 * The app's focus ring, and the one thing every focusable surface shares.
 *
 * It is its own helper rather than a `Button` variant because half the things
 * that need it are not buttons — the crisis card's links, the extend offer's
 * `m.button`. The colour is a variant rather than something a caller overrides
 * through `className`: it differs per surface, and leaving two `outline-*`
 * classes for `twMerge` to arbitrate is a coin flip.
 *
 * The bare `outline` carries `outline-style` on Tailwind 3 and is load-bearing
 * — see the note in `@/lib/utils`, and the test that pins it.
 */
export const focusRing = cva(
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
  {
    variants: {
      ring: {
        ink: 'focus-visible:outline-anchor-ink-strong',
        accent: 'focus-visible:outline-anchor-accent',
        amber: 'focus-visible:outline-amber-500',
        orange: 'focus-visible:outline-orange-700',
        brand: 'focus-visible:outline-anchor-brand-blue',
      },
    },
    defaultVariants: { ring: 'ink' },
  },
)

export type FocusRingProps = VariantProps<typeof focusRing>
