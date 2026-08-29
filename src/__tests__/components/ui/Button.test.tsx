import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Button } from '@/components/ui/Button'
import { focusRing } from '@/components/ui/focus-ring'

const classesOf = (name: RegExp) =>
  screen.getByRole('button', { name }).className.split(/\s+/)

describe('focusRing', () => {
  // The bare `outline` is what carries `outline-style: solid` on Tailwind 3.
  // tailwind-merge 3 files it under outline-*width* and will drop it as a
  // conflict with `outline-2` unless `cn` is configured to say otherwise — and
  // a dropped outline-style means no visible ring at all, silently. If this
  // fails after a dependency bump, read the note in `@/lib/utils`.
  it('keeps every part of the ring, outline-style included', () => {
    const classes = focusRing({ ring: 'ink' }).split(/\s+/)

    expect(classes).toContain('focus-visible:outline')
    expect(classes).toContain('focus-visible:outline-2')
    expect(classes).toContain('focus-visible:outline-offset-2')
    expect(classes).toContain('focus-visible:outline-anchor-ink-strong')
  })

  it('colours the ring per surface', () => {
    expect(focusRing({ ring: 'amber' })).toContain(
      'focus-visible:outline-amber-500',
    )
    expect(focusRing({ ring: 'orange' })).toContain(
      'focus-visible:outline-orange-700',
    )
    expect(focusRing({ ring: 'brand' })).toContain(
      'focus-visible:outline-anchor-brand-blue',
    )
  })

  it('falls back to the ink ring', () => {
    expect(focusRing({})).toContain('focus-visible:outline-anchor-ink-strong')
  })
})

describe('Button', () => {
  it('carries the focus ring on every variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    expect(classesOf(/ghost/i)).toContain('focus-visible:outline')
  })

  // WCAG 2.5.8. ErrorBoundary and the crisis card assert this literal on their
  // own elements; these two variants are where the primitive owns it.
  it.each(['pill', 'pillOutline'] as const)(
    'gives the %s variant a 44px tap target',
    (variant) => {
      render(<Button variant={variant}>Start</Button>)
      expect(classesOf(/start/i)).toContain('min-h-[44px]')
    },
  )

  it('lets a call site override its variant rather than fighting it', () => {
    render(
      <Button variant="primary" className="rounded-full">
        Go
      </Button>,
    )
    const classes = classesOf(/go/i)

    expect(classes).toContain('rounded-full')
    expect(classes).not.toContain('rounded-xl')
    // Everything it did not override survives.
    expect(classes).toContain('bg-anchor-mint')
  })

  it('defaults to type=button so it cannot submit a form by accident', () => {
    render(<Button>Plain</Button>)
    expect(screen.getByRole('button', { name: /plain/i })).toHaveAttribute(
      'type',
      'button',
    )
  })

  it('forwards handlers and disabled state', async () => {
    const onClick = jest.fn()
    render(
      <Button onClick={onClick} disabled>
        Nope
      </Button>,
    )
    const button = screen.getByRole('button', { name: /nope/i })

    expect(button).toBeDisabled()
    button.click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
