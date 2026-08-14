import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CrisisResourceCard } from '@/components/chat/ResourceCard'

// userEvent.setup() installs its own clipboard stub, and the property is
// getter-only, so these have to be defined after setup rather than assigned.
function stubClipboard() {
  const writeText = jest.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

function removeClipboard() {
  Object.defineProperty(navigator, 'clipboard', {
    value: undefined,
    configurable: true,
  })
}

describe('CrisisResourceCard', () => {
  // Task.md asserts a single match for /988/. The number now appears both in
  // the service name and as the selectable dial string, which is the point of
  // showing it — so this checks presence rather than uniqueness.
  it('shows all three resources', () => {
    render(<CrisisResourceCard />)
    expect(screen.getAllByText(/988/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Crisis Text Line/)).toBeInTheDocument()
    expect(screen.getByText(/SAMHSA/)).toBeInTheDocument()
  })

  it('all resource links have valid href', () => {
    const { container } = render(<CrisisResourceCard />)
    const links = container.querySelectorAll('ul a')
    expect(links.length).toBe(3)
    links.forEach((l) => {
      expect(l.getAttribute('href')).toMatch(/^(tel:|sms:)/)
    })
  })

  it('every link meets the 44px tap target', () => {
    const { container } = render(<CrisisResourceCard />)
    const links = container.querySelectorAll('a')
    expect(links.length).toBe(4)
    links.forEach((l) => {
      expect(l.className).toContain('min-h-[44px]')
    })
  })

  it('dials 988 and texts HOME to the Crisis Text Line', () => {
    const { container } = render(<CrisisResourceCard />)
    const hrefs = Array.from(container.querySelectorAll('a')).map((l) =>
      l.getAttribute('href'),
    )
    expect(hrefs).toContain('tel:988')
    expect(hrefs).toContain('sms:741741&body=HOME')
    expect(hrefs).toContain('tel:18006624357')
  })

  it('is labelled as a distinct region for screen readers', () => {
    render(<CrisisResourceCard />)
    expect(
      screen.getByRole('region', { name: /crisis support resources/i }),
    ).toBeInTheDocument()
  })

  it('points at emergency services for immediate danger', () => {
    render(<CrisisResourceCard />)
    expect(screen.getByText(/911/)).toBeInTheDocument()
  })

  // Every number on this card is US-only. Saying so is the difference between
  // an unusable card and a misleading one.
  it('states which country the numbers serve', () => {
    render(<CrisisResourceCard />)
    expect(screen.getByText('United States')).toBeInTheDocument()
  })

  it('offers an international directory for everyone else', () => {
    render(<CrisisResourceCard />)
    const link = screen.getByTestId('international-helpline-link')
    expect(link).toHaveAttribute('href', 'https://findahelpline.com')
    expect(link).toHaveTextContent(/outside the us/i)
  })

  // tel: and sms: do nothing on a desktop browser, so the number has to be
  // readable and copyable rather than only tappable.
  it('prints every number as selectable text', () => {
    render(<CrisisResourceCard />)
    expect(screen.getByText('988')).toBeInTheDocument()
    expect(screen.getByText('Text HOME to 741741')).toBeInTheDocument()
    expect(screen.getByText('1-800-662-4357')).toBeInTheDocument()
  })

  it('offers a copy button per resource', () => {
    render(<CrisisResourceCard />)
    expect(screen.getAllByRole('button', { name: /^copy /i })).toHaveLength(3)
  })

  it('copies a dialable value, not the display string', async () => {
    const user = userEvent.setup()
    const writeText = stubClipboard()
    render(<CrisisResourceCard />)

    await user.click(screen.getByRole('button', { name: /copy crisis text/i }))

    // The row reads "Text HOME to 741741"; what is copied has to be dialable.
    expect(writeText).toHaveBeenCalledWith('741741')
  })

  it('confirms the copy, then goes quiet again', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    stubClipboard()
    render(<CrisisResourceCard />)

    await user.click(screen.getByRole('button', { name: /copy 988/i }))
    expect(await screen.findByText('Copied')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(2100)
    })
    expect(screen.queryByText('Copied')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('survives the clipboard being unavailable', async () => {
    const user = userEvent.setup()
    removeClipboard()
    render(<CrisisResourceCard />)

    await user.click(screen.getByRole('button', { name: /copy 988/i }))

    expect(screen.getByTestId('crisis-resource-card')).toBeInTheDocument()
    expect(screen.queryByText('Copied')).not.toBeInTheDocument()
  })

  it('opens the directory without handing over the referrer', () => {
    render(<CrisisResourceCard />)
    const link = screen.getByTestId('international-helpline-link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.getAttribute('rel')).toContain('noreferrer')
  })
})
