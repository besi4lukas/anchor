import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { BoxBreathing } from '@/components/chat/BoxBreathing'

// The exercise runs for 64 real seconds, so the clock is driven rather than
// waited on. userEvent needs its own pointer to the fake timers.
function advance(seconds: number) {
  act(() => {
    jest.advanceTimersByTime(seconds * 1000)
  })
}

describe('BoxBreathing', () => {
  it('shows start button initially', () => {
    render(<BoxBreathing />)
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
  })

  describe('once started', () => {
    let user: ReturnType<typeof userEvent.setup>

    beforeEach(async () => {
      jest.useFakeTimers()
      user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<BoxBreathing />)
      await user.click(screen.getByRole('button', { name: /start/i }))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('opens on Inhale with a full four-second count', () => {
      expect(screen.getByText('Inhale')).toBeInTheDocument()
      expect(screen.getByTestId('breathing-tick')).toHaveTextContent('4')
    })

    it('counts down within a phase', () => {
      advance(1)
      expect(screen.getByTestId('breathing-tick')).toHaveTextContent('3')
      advance(2)
      expect(screen.getByTestId('breathing-tick')).toHaveTextContent('1')
    })

    it('walks Inhale, Hold, Exhale, Hold across one cycle', () => {
      expect(screen.getByText('Inhale')).toBeInTheDocument()
      advance(4)
      expect(screen.getByText('Hold')).toBeInTheDocument()
      advance(4)
      expect(screen.getByText('Exhale')).toBeInTheDocument()
      advance(4)
      expect(screen.getByText('Hold')).toBeInTheDocument()
      advance(4)
      expect(screen.getByText('Inhale')).toBeInTheDocument()
    })

    it('tracks the cycle counter across all four rounds', () => {
      expect(screen.getByText(/cycle 1 of 4/i)).toBeInTheDocument()
      advance(16)
      expect(screen.getByText(/cycle 2 of 4/i)).toBeInTheDocument()
      advance(32)
      expect(screen.getByText(/cycle 4 of 4/i)).toBeInTheDocument()
    })

    it('shows the completion state after four full cycles', () => {
      advance(63)
      expect(screen.queryByText(/well done/i)).not.toBeInTheDocument()
      advance(1)
      expect(screen.getByText(/well done/i)).toBeInTheDocument()
    })

    it('stops counting once complete', () => {
      advance(64)
      expect(screen.getByText(/well done/i)).toBeInTheDocument()
      advance(30)
      expect(screen.getByText(/well done/i)).toBeInTheDocument()
      expect(screen.queryByTestId('breathing-tick')).not.toBeInTheDocument()
    })

    it('offers another round when finished', () => {
      advance(64)
      expect(
        screen.getByRole('button', { name: /go again/i }),
      ).toBeInTheDocument()
    })
  })

  it('clears its interval when unmounted mid-exercise', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const clearSpy = jest.spyOn(global, 'clearInterval')
    const { unmount } = render(<BoxBreathing />)

    await user.click(screen.getByRole('button', { name: /start/i }))
    advance(2)
    clearSpy.mockClear()
    unmount()

    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
    jest.useRealTimers()
  })
})
