import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { focusRing, type FocusRingProps } from '@/components/ui/focus-ring'
import type { ButtonHTMLAttributes } from 'react'

/**
 * The shapes the app's buttons actually come in — one variant per look already
 * on screen, not a general-purpose button system.
 *
 * Each variant holds only what that look needs. Nothing lives in a shared base
 * except the focus ring, so adopting the primitive cannot silently add a
 * property to a button that did not have one. Anything a single call site wants
 * on top of its variant comes through `className`.
 */
const buttonVariants = cva('', {
  variants: {
    variant: {
      primary:
        'rounded-xl bg-anchor-mint px-6 py-3 text-sm font-medium text-anchor-ink-strong transition-opacity hover:opacity-90',
      pill: 'min-h-[44px] rounded-full bg-anchor-accent px-6 text-sm text-anchor-accent-fg transition-colors hover:bg-anchor-accent-hover',
      pillOutline:
        'min-h-[44px] rounded-full border border-anchor-line px-6 text-sm text-anchor-ink-strong transition-colors hover:bg-anchor-bg',
      icon: 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-anchor-mint text-anchor-ink-strong transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30',
      ghost: 'rounded-lg px-2',
    },
  },
  defaultVariants: { variant: 'primary' },
})

interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants>,
    FocusRingProps {}

export function Button({
  variant,
  ring,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        focusRing({ ring }),
        buttonVariants({ variant }),
        className,
      )}
      {...props}
    />
  )
}
