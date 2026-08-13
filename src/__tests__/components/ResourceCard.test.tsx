import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CrisisResourceCard } from '@/components/chat/ResourceCard'

describe('CrisisResourceCard', () => {
  it('shows all three resources', () => {
    render(<CrisisResourceCard />)
    expect(screen.getByText(/988/)).toBeInTheDocument()
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

  it('opens the directory without handing over the referrer', () => {
    render(<CrisisResourceCard />)
    const link = screen.getByTestId('international-helpline-link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.getAttribute('rel')).toContain('noreferrer')
  })
})
