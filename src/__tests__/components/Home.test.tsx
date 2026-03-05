import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import Home from '@/app/page'

import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream } from 'stream/web'
Object.assign(global, { TextEncoder, TextDecoder, ReadableStream })

Element.prototype.scrollIntoView = jest.fn()

const mockSessionResponse = {
  sessionId: 'test-session-123',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
}

const createSSEStream = (text: string) => {
  const encoder = new TextEncoder()
  const chunks = [`data: ${JSON.stringify({ text })}\n\n`, 'data: [DONE]\n\n']
  let chunkIndex = 0

  return new ReadableStream({
    pull(controller) {
      if (chunkIndex < chunks.length) {
        controller.enqueue(encoder.encode(chunks[chunkIndex]))
        chunkIndex++
      } else {
        controller.close()
      }
    },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn()
})

function mockSessionCreate() {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => mockSessionResponse,
  })
}

function mockChatResponse(text: string) {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    body: createSSEStream(text),
  })
}

describe('Home – Welcome Screen', () => {
  it('shows "Hey Stranger!" greeting after session loads', async () => {
    mockSessionCreate()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Hey Stranger!')).toBeInTheDocument()
    })
  })

  it('shows the brand logo alongside greeting text', async () => {
    mockSessionCreate()
    const { container } = render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Hey Stranger!')).toBeInTheDocument()
    })

    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('renders chat input with initial placeholder on welcome screen', async () => {
    mockSessionCreate()
    render(<Home />)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('How are you feeling right now...'),
      ).toBeInTheDocument()
    })
  })

  it('does not show message bubbles on welcome screen', async () => {
    mockSessionCreate()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Hey Stranger!')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('message-bubble')).not.toBeInTheDocument()
  })

  it('does not show the disclaimer text on welcome screen', async () => {
    mockSessionCreate()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Hey Stranger!')).toBeInTheDocument()
    })

    expect(
      screen.queryByText(/Anchor can make mistakes/),
    ).not.toBeInTheDocument()
  })
})

describe('Home – Header', () => {
  it('renders the Anchor brand name in header', async () => {
    mockSessionCreate()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Anchor' })).toBeInTheDocument()
    })
  })

  it('renders the Clear & Exit button', async () => {
    mockSessionCreate()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })
  })

  it('renders the session timer', async () => {
    mockSessionCreate()
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByTestId('session-timer')).toBeInTheDocument()
    })
  })
})

describe('Home – Chat Transition', () => {
  it('hides welcome screen and shows messages after user sends a message', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('I hear you.')

    render(<Home />)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('How are you feeling right now...'),
      ).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText(
      'How are you feeling right now...',
    )
    await user.type(textarea, 'I feel anxious{Enter}')

    await waitFor(() => {
      expect(screen.queryByText('Hey Stranger!')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('I feel anxious')).toBeInTheDocument()
    })
  })

  it('shows disclaimer text after assistant responds', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('That sounds tough.')

    render(<Home />)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('How are you feeling right now...'),
      ).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText(
      'How are you feeling right now...',
    )
    await user.type(textarea, 'Feeling stressed{Enter}')

    await waitFor(() => {
      expect(screen.getByText(/Anchor can make mistakes/)).toBeInTheDocument()
    })
  })

  it('changes placeholder to "Reply..." after assistant responds', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('I understand.')

    render(<Home />)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('How are you feeling right now...'),
      ).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText(
      'How are you feeling right now...',
    )
    await user.type(textarea, 'Need help{Enter}')

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Reply...')).toBeInTheDocument()
    })
  })
})

describe('Home – Restart Flow', () => {
  it('resets to welcome screen when Anchor button is clicked', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('Hello!')

    render(<Home />)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('How are you feeling right now...'),
      ).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText(
      'How are you feeling right now...',
    )
    await user.type(textarea, 'Hi there{Enter}')

    await waitFor(() => {
      expect(screen.getByText('Hi there')).toBeInTheDocument()
    })

    mockSessionCreate()

    const anchorBtn = screen.getByRole('button', { name: 'Anchor' })
    await user.click(anchorBtn)

    await waitFor(() => {
      expect(screen.getByText('Hey Stranger!')).toBeInTheDocument()
    })

    expect(screen.queryByText('Hi there')).not.toBeInTheDocument()
  })
})

describe('Home – Loading State', () => {
  it('shows loading skeleton before session is created', () => {
    ;(global.fetch as jest.Mock).mockReturnValueOnce(new Promise(() => {}))
    const { container } = render(<Home />)

    const pulsingElements = container.querySelectorAll('.animate-pulse')
    expect(pulsingElements.length).toBeGreaterThan(0)
  })
})

describe('Home – Error Handling', () => {
  it('remains on loading skeleton when session creation fails', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error'),
    )

    const { container } = render(<Home />)

    await waitFor(() => {
      const pulsingElements = container.querySelectorAll('.animate-pulse')
      expect(pulsingElements.length).toBeGreaterThan(0)
    })
  })
})

describe('Home – Expiry', () => {
  it('shows expiry screen when Clear & Exit is clicked', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true })

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /clear/i }))

    await waitFor(() => {
      expect(screen.getByTestId('expiry-screen')).toBeInTheDocument()
    })
  })
})
