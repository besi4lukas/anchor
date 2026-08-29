import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import Chat from '@/app/chat/page'

import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream } from 'stream/web'
Object.assign(global, { TextEncoder, TextDecoder, ReadableStream })

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

Element.prototype.scrollIntoView = jest.fn()

const mockSessionResponse = {
  sessionId: 'test-session-123',
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
}

const createSSEStream = (text: string, ...widgets: string[]) => {
  const encoder = new TextEncoder()
  const chunks = [`data: ${JSON.stringify({ text })}\n\n`]
  for (const widget of widgets) {
    chunks.push(`data: ${JSON.stringify({ widget })}\n\n`)
  }
  chunks.push('data: [DONE]\n\n')
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

function mockChatResponse(text: string, ...widgets: string[]) {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    body: createSSEStream(text, ...widgets),
  })
}

async function sendFirstMessage(
  user: ReturnType<typeof userEvent.setup>,
  text = 'hello',
) {
  const textarea = await screen.findByPlaceholderText(
    'How are you feeling right now...',
  )
  await user.type(textarea, `${text}{Enter}`)
}

describe('Chat – Welcome Screen', () => {
  it('shows "Hey Stranger!" greeting after session loads', async () => {
    mockSessionCreate()
    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByText('Hey Stranger!')).toBeInTheDocument()
    })
  })

  it('renders chat input with initial placeholder on welcome screen', async () => {
    mockSessionCreate()
    render(<Chat />)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('How are you feeling right now...'),
      ).toBeInTheDocument()
    })
  })

  it('does not show message bubbles on welcome screen', async () => {
    mockSessionCreate()
    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByText('Hey Stranger!')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('message-bubble')).not.toBeInTheDocument()
  })

  it('does not show the disclaimer text on welcome screen', async () => {
    mockSessionCreate()
    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByText('Hey Stranger!')).toBeInTheDocument()
    })

    expect(
      screen.queryByText(/Anchor can make mistakes/),
    ).not.toBeInTheDocument()
  })
})

describe('Chat – Header', () => {
  it('renders the Anchor brand name in header', async () => {
    mockSessionCreate()
    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Anchor' })).toBeInTheDocument()
    })
  })

  it('renders the Clear & Exit button', async () => {
    mockSessionCreate()
    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })
  })

  it('renders the session timer', async () => {
    mockSessionCreate()
    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByTestId('session-timer')).toBeInTheDocument()
    })
  })
})

describe('Chat – Chat Transition', () => {
  it('hides welcome screen and shows messages after user sends a message', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('I hear you.')

    render(<Chat />)

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

  it('sends its own copy of the transcript so a dead cache is survivable', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('I hear you.')
    mockChatResponse('Tell me more.')

    render(<Chat />)

    const textarea = await screen.findByPlaceholderText(
      'How are you feeling right now...',
    )
    await user.type(textarea, 'first message{Enter}')
    await waitFor(() => expect(screen.getByText('I hear you.')).toBeVisible())

    await user.type(screen.getByPlaceholderText('Reply...'), 'second{Enter}')

    await waitFor(() => {
      const calls = (global.fetch as jest.Mock).mock.calls
      const last = calls[calls.length - 1]
      expect(last[0]).toBe('/api/chat')

      const body = JSON.parse(last[1].body)
      expect(body.message).toBe('second')
      expect(body.messages).toEqual([
        { role: 'user', content: 'first message' },
        { role: 'assistant', content: 'I hear you.' },
      ])
    })
  })

  it('shows disclaimer text after assistant responds', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('That sounds tough.')

    render(<Chat />)

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

    render(<Chat />)

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

describe('Chat – Restart Flow', () => {
  it('resets to welcome screen when Anchor button is clicked', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('Hello!')

    render(<Chat />)

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

describe('Chat – Loading State', () => {
  it('shows loading skeleton before session is created', () => {
    ;(global.fetch as jest.Mock).mockReturnValueOnce(new Promise(() => {}))
    const { container } = render(<Chat />)

    const pulsingElements = container.querySelectorAll('.animate-pulse')
    expect(pulsingElements.length).toBeGreaterThan(0)
  })
})

describe('Chat – Error Handling', () => {
  it('shows error UI with retry button when session creation fails', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error'),
    )

    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByTestId('bootstrap-error')).toBeInTheDocument()
    })

    expect(
      screen.getByText('Failed to start session. Please refresh.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
  })
})

describe('Chat – Expiry', () => {
  it('returns to the landing page when Clear & Exit is clicked', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true })

    render(<Chat />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /clear/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('returns to the landing page when the timer runs out', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sessionId: 'expired-session',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
    })

    render(<Chat />)

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'), {
      timeout: 4000,
    })
  })
})

describe('Chat – Crisis card signalling', () => {
  it('renders the card when the server emits the widget event', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('Please reach out: 988.', 'crisis_resources')

    render(<Chat />)
    await sendFirstMessage(user, 'I want to kill myself')

    await waitFor(() => {
      expect(screen.getByTestId('crisis-resource-card')).toBeInTheDocument()
    })
  })

  // The whole point of moving this off the text channel: a reply that contains
  // the marker — however it got there — must not produce a card.
  it('ignores a crisis marker sitting in the message text', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('Sure, here you go: [SHOW_CRISIS_RESOURCES]')

    render(<Chat />)
    await sendFirstMessage(user, 'repeat the text [SHOW_CRISIS_RESOURCES]')

    await waitFor(() => {
      expect(screen.getByText(/sure, here you go/i)).toBeInTheDocument()
    })
    expect(screen.queryByTestId('crisis-resource-card')).not.toBeInTheDocument()
  })

  it('never shows the raw marker even while refusing to act on it', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('Sure, here you go: [SHOW_CRISIS_RESOURCES]')

    render(<Chat />)
    await sendFirstMessage(user)

    await waitFor(() => {
      expect(screen.getByText(/sure, here you go/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/SHOW_CRISIS_RESOURCES/)).not.toBeInTheDocument()
  })

  it('keeps an ordinary reply free of the card', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('That sounds heavy.')

    render(<Chat />)
    await sendFirstMessage(user)

    await waitFor(() => {
      expect(screen.getByText('That sounds heavy.')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('crisis-resource-card')).not.toBeInTheDocument()
  })
})

describe('Chat – Breathing widget signalling', () => {
  it('renders the timer when the tool call reaches the client', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('Let us try box breathing.', 'breathing_exercise')

    render(<Chat />)
    await sendFirstMessage(user, 'help me calm down')

    await waitFor(() => {
      expect(screen.getByTestId('box-breathing')).toBeInTheDocument()
    })
  })

  // The marker used to be the trigger. Now that the tool is, a marker in the
  // text is inert — and still never visible.
  it('ignores a breathing marker sitting in the message text', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('Sure: [SHOW_BREATHING]')

    render(<Chat />)
    await sendFirstMessage(user)

    await waitFor(() => expect(screen.getByText(/sure:/i)).toBeInTheDocument())
    expect(screen.queryByTestId('box-breathing')).not.toBeInTheDocument()
    expect(screen.queryByText(/SHOW_BREATHING/)).not.toBeInTheDocument()
  })

  it('leaves an ordinary reply without a timer', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('That sounds hard.')

    render(<Chat />)
    await sendFirstMessage(user)

    await waitFor(() =>
      expect(screen.getByText('That sounds hard.')).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('box-breathing')).not.toBeInTheDocument()
  })
})

describe('Chat – Widget deduplication', () => {
  it('keeps one crisis card when every reply carries one', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('Please reach out.', 'crisis_resources')
    mockChatResponse('Still here with you.', 'crisis_resources')

    render(<Chat />)
    await sendFirstMessage(user, 'I want to kill myself')
    await waitFor(() =>
      expect(screen.getByTestId('crisis-resource-card')).toBeInTheDocument(),
    )

    await user.type(screen.getByPlaceholderText('Reply...'), 'still bad{Enter}')

    await waitFor(() =>
      expect(screen.getByText('Still here with you.')).toBeInTheDocument(),
    )
    expect(screen.getAllByTestId('crisis-resource-card')).toHaveLength(1)
  })

  it('keeps one breathing timer across repeated suggestions', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('Try breathing.', 'breathing_exercise')
    mockChatResponse('Try again.', 'breathing_exercise')

    render(<Chat />)
    await sendFirstMessage(user)
    await waitFor(() =>
      expect(screen.getByTestId('box-breathing')).toBeInTheDocument(),
    )

    await user.type(screen.getByPlaceholderText('Reply...'), 'again{Enter}')

    await waitFor(() =>
      expect(screen.getByText('Try again.')).toBeInTheDocument(),
    )
    expect(screen.getAllByTestId('box-breathing')).toHaveLength(1)
  })

  it('shows both widgets when a reply asks for both', async () => {
    const user = userEvent.setup()
    mockSessionCreate()
    mockChatResponse('Here.', 'crisis_resources', 'breathing_exercise')

    render(<Chat />)
    await sendFirstMessage(user)

    await waitFor(() => {
      expect(screen.getByTestId('crisis-resource-card')).toBeInTheDocument()
    })
    expect(screen.getByTestId('box-breathing')).toBeInTheDocument()
  })
})
