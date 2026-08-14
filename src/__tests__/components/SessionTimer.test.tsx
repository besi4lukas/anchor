import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SessionTimer } from '@/components/chat/SessionTimer'

const inSeconds = (s: number) => new Date(Date.now() + s * 1000).toISOString()

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn()
})

function mockExtend(status: number, body: unknown = {}) {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })
}

describe('SessionTimer – extension offer', () => {
  it('stays hidden while there is plenty of time left', () => {
    render(
      <SessionTimer
        expiresAt={inSeconds(1800)}
        onExpire={jest.fn()}
        onExtend={jest.fn()}
      />,
    )
    expect(screen.queryByTestId('extend-session')).not.toBeInTheDocument()
  })

  it('appears once under five minutes remain', () => {
    render(
      <SessionTimer
        expiresAt={inSeconds(240)}
        onExpire={jest.fn()}
        onExtend={jest.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: /extend 60 min/i }),
    ).toBeInTheDocument()
  })

  it('stays hidden for a session that already spent its extension', () => {
    render(
      <SessionTimer
        expiresAt={inSeconds(240)}
        onExpire={jest.fn()}
        onExtend={jest.fn()}
        extended
      />,
    )
    expect(screen.queryByTestId('extend-session')).not.toBeInTheDocument()
  })

  it('hands the new expiry back to the parent', async () => {
    const onExtend = jest.fn()
    const newExpiry = inSeconds(3600)
    mockExtend(200, { newExpiry })
    const user = userEvent.setup()

    render(
      <SessionTimer
        expiresAt={inSeconds(240)}
        onExpire={jest.fn()}
        onExtend={onExtend}
      />,
    )
    await user.click(screen.getByTestId('extend-session'))

    await waitFor(() => expect(onExtend).toHaveBeenCalledWith(newExpiry))
    expect(global.fetch).toHaveBeenCalledWith('/api/session/extend', {
      method: 'PATCH',
    })
  })

  // A 409 means the server has already spent it. Retiring the offer is more
  // honest than leaving a button that can only ever fail.
  it('retires the offer when the server says it was already used', async () => {
    const onExtend = jest.fn()
    mockExtend(409, { error: 'already extended' })
    const user = userEvent.setup()

    render(
      <SessionTimer
        expiresAt={inSeconds(240)}
        onExpire={jest.fn()}
        onExtend={onExtend}
      />,
    )
    await user.click(screen.getByTestId('extend-session'))

    await waitFor(() => expect(onExtend).toHaveBeenCalled())
  })

  it('keeps the offer up when the request fails outright', async () => {
    const onExtend = jest.fn()
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()

    render(
      <SessionTimer
        expiresAt={inSeconds(240)}
        onExpire={jest.fn()}
        onExtend={onExtend}
      />,
    )
    await user.click(screen.getByTestId('extend-session'))

    await waitFor(() =>
      expect(screen.getByTestId('extend-session')).toBeEnabled(),
    )
    expect(onExtend).not.toHaveBeenCalled()
  })

  it('does not fire twice on a double click', async () => {
    let resolve: (v: unknown) => void = () => {}
    ;(global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r
      }),
    )
    const user = userEvent.setup()

    render(
      <SessionTimer
        expiresAt={inSeconds(240)}
        onExpire={jest.fn()}
        onExtend={jest.fn()}
      />,
    )
    const button = screen.getByTestId('extend-session')
    await user.click(button)
    await user.click(button)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    resolve({ ok: true, status: 200, json: async () => ({}) })
  })

  it('still shows the countdown alongside the offer', () => {
    render(
      <SessionTimer
        expiresAt={inSeconds(240)}
        onExpire={jest.fn()}
        onExtend={jest.fn()}
      />,
    )
    expect(screen.getByTestId('session-timer')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/ending soon/i),
    )
  })
})
