import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ChatInput } from '@/components/chat/ChatInput'

describe('ChatInput', () => {
  const mockSend = jest.fn()

  beforeEach(() => {
    mockSend.mockClear()
  })

  describe('rendering', () => {
    it('renders a textarea with default placeholder', () => {
      render(<ChatInput onSend={mockSend} />)
      expect(
        screen.getByPlaceholderText('How are you feeling right now...'),
      ).toBeInTheDocument()
    })

    it('accepts a custom placeholder prop', () => {
      render(<ChatInput onSend={mockSend} placeholder="Reply..." />)
      expect(screen.getByPlaceholderText('Reply...')).toBeInTheDocument()
    })

    it('has chat-input data-testid', () => {
      render(<ChatInput onSend={mockSend} />)
      expect(screen.getByTestId('chat-input')).toBeInTheDocument()
    })

    it('does not render a send button', () => {
      render(<ChatInput onSend={mockSend} />)
      expect(
        screen.queryByRole('button', { name: /send/i }),
      ).not.toBeInTheDocument()
    })

    it('has an accessible aria-label', () => {
      render(<ChatInput onSend={mockSend} />)
      expect(screen.getByLabelText('Message input')).toBeInTheDocument()
    })
  })

  describe('sending messages', () => {
    it('calls onSend with trimmed text on Enter', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockSend} />)

      const textarea = screen.getByPlaceholderText(
        'How are you feeling right now...',
      )
      await user.type(textarea, 'Hello world{Enter}')

      expect(mockSend).toHaveBeenCalledWith('Hello world')
    })

    it('clears textarea after sending', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockSend} />)

      const textarea = screen.getByPlaceholderText(
        'How are you feeling right now...',
      ) as HTMLTextAreaElement
      await user.type(textarea, 'Test message{Enter}')

      expect(textarea.value).toBe('')
    })

    it('does not send empty or whitespace-only messages', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockSend} />)

      const textarea = screen.getByPlaceholderText(
        'How are you feeling right now...',
      )
      await user.type(textarea, '   {Enter}')

      expect(mockSend).not.toHaveBeenCalled()
    })

    it('inserts a newline on Shift+Enter instead of sending', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockSend} />)

      const textarea = screen.getByPlaceholderText(
        'How are you feeling right now...',
      ) as HTMLTextAreaElement
      await user.type(textarea, 'Line one{Shift>}{Enter}{/Shift}Line two')

      expect(mockSend).not.toHaveBeenCalled()
      expect(textarea.value).toContain('Line one')
      expect(textarea.value).toContain('Line two')
    })
  })

  describe('disabled state', () => {
    it('disables the textarea when disabled prop is true', () => {
      render(<ChatInput onSend={mockSend} disabled />)
      const textarea = screen.getByPlaceholderText(
        'How are you feeling right now...',
      )
      expect(textarea).toBeDisabled()
    })

    it('does not call onSend when disabled', async () => {
      const user = userEvent.setup()
      render(<ChatInput onSend={mockSend} disabled />)

      const textarea = screen.getByPlaceholderText(
        'How are you feeling right now...',
      )
      await user.type(textarea, 'Hello{Enter}')

      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  describe('auto-grow', () => {
    it('uses a textarea element for multi-line support', () => {
      render(<ChatInput onSend={mockSend} />)
      const textarea = screen.getByPlaceholderText(
        'How are you feeling right now...',
      )
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('has resize-none to prevent manual resizing', () => {
      render(<ChatInput onSend={mockSend} />)
      const textarea = screen.getByPlaceholderText(
        'How are you feeling right now...',
      )
      expect(textarea.className).toContain('resize-none')
    })
  })
})
