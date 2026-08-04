import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Landing from '@/app/page'

describe('Landing', () => {
  it('renders without creating a session', () => {
    const fetchSpy = jest.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    render(<Landing />)

    expect(
      screen.getByRole('heading', { name: 'One hour. Nothing kept.' }),
    ).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('points the primary call to action at the chat route', () => {
    render(<Landing />)

    expect(screen.getByRole('link', { name: 'Start session' })).toHaveAttribute(
      'href',
      '/chat',
    )
  })

  it('states what the session does before it is started', () => {
    render(<Landing />)

    expect(screen.getByText('Sixty minutes')).toBeInTheDocument()
    expect(screen.getByText('Never stored')).toBeInTheDocument()
    expect(screen.getByText('No account')).toBeInTheDocument()
    expect(screen.getByText(/not a crisis service/)).toBeInTheDocument()
  })
})
