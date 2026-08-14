import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('kaboom: transcript contents')
  return <p>All is well</p>
}

let errorSpy: jest.SpyInstance

beforeEach(() => {
  // React logs caught render errors itself; silence it so the run stays legible.
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
})

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('All is well')).toBeInTheDocument()
    expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument()
  })

  it('catches a render error and shows the fallback', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('carries the anchor branding and a way forward', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByText('anchor')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /start fresh/i }),
    ).toBeInTheDocument()
  })

  // A stack trace on screen is alarming at the best of times, and here it could
  // put transcript content in front of someone mid-crisis.
  it('never puts the error message on screen', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.queryByText(/kaboom/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/transcript contents/i)).not.toBeInTheDocument()
  })

  it('keeps crisis numbers reachable even when the app is broken', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/988/)).toBeInTheDocument()
  })

  it('announces itself to assistive technology', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('starts over when "Start fresh" is pressed', async () => {
    const onReset = jest.fn()
    const user = userEvent.setup()

    render(
      <ErrorBoundary onReset={onReset}>
        <Boom shouldThrow />
      </ErrorBoundary>,
    )
    await user.click(screen.getByRole('button', { name: /start fresh/i }))

    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('meets the 44px tap target', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    )
    expect(
      screen.getByRole('button', { name: /start fresh/i }).className,
    ).toContain('min-h-[44px]')
  })
})
