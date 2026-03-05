import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MessageBubble } from '@/components/chat/MessageBubble'

describe('MessageBubble', () => {
  describe('alignment', () => {
    it('renders user messages right-aligned', () => {
      const { container } = render(
        <MessageBubble role="user" content="Hello" />,
      )
      const wrapper = container.querySelector('[data-role="user"]')
      expect(wrapper?.className).toContain('justify-end')
    })

    it('renders assistant messages left-aligned', () => {
      const { container } = render(
        <MessageBubble role="assistant" content="Hi" />,
      )
      const wrapper = container.querySelector('[data-role="assistant"]')
      expect(wrapper?.className).toContain('justify-start')
    })
  })

  describe('content rendering', () => {
    it('displays user message text', () => {
      render(<MessageBubble role="user" content="I feel stressed" />)
      expect(screen.getByText('I feel stressed')).toBeInTheDocument()
    })

    it('displays assistant message text', () => {
      render(<MessageBubble role="assistant" content="Tell me more" />)
      expect(screen.getByText('Tell me more')).toBeInTheDocument()
    })

    it('preserves whitespace in messages', () => {
      render(<MessageBubble role="user" content={'line one\nline two'} />)
      const bubble = screen.getByTestId('message-bubble')
      const p = bubble.querySelector('p')
      expect(p?.className).toContain('whitespace-pre-wrap')
      expect(p?.textContent).toBe('line one\nline two')
    })
  })

  describe('user bubble styling', () => {
    it('has no background color on user messages', () => {
      render(<MessageBubble role="user" content="Hello" />)
      const bubble = screen.getByTestId('message-bubble')
      expect(bubble.className).not.toContain('bg-')
    })

    it('uses muted text color for user messages', () => {
      render(<MessageBubble role="user" content="Hello" />)
      const bubble = screen.getByTestId('message-bubble')
      expect(bubble.className).toContain('text-gray-500')
    })

    it('uses serif font matching assistant style', () => {
      render(<MessageBubble role="user" content="Hello" />)
      const bubble = screen.getByTestId('message-bubble')
      expect(bubble.className).toContain('font-serif')
    })
  })

  describe('assistant bubble styling', () => {
    it('uses full width for assistant messages', () => {
      render(<MessageBubble role="assistant" content="Hi there" />)
      const bubble = screen.getByTestId('message-bubble')
      expect(bubble.className).toContain('w-full')
    })

    it('uses dark text color for assistant messages', () => {
      render(<MessageBubble role="assistant" content="Hi there" />)
      const bubble = screen.getByTestId('message-bubble')
      expect(bubble.className).toContain('text-[#1A1A2E]')
    })
  })

  describe('streaming state', () => {
    it('shows typing indicator when isStreaming is true', () => {
      render(<MessageBubble role="assistant" content="" isStreaming />)
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
    })

    it('does not show typing indicator when isStreaming is false', () => {
      render(
        <MessageBubble role="assistant" content="Done" isStreaming={false} />,
      )
      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument()
    })

    it('shows typing indicator for user messages when streaming', () => {
      render(<MessageBubble role="user" content="" isStreaming />)
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
    })
  })

  describe('data-testid attributes', () => {
    it('has message-bubble testid on user messages', () => {
      render(<MessageBubble role="user" content="Hello" />)
      expect(screen.getByTestId('message-bubble')).toBeInTheDocument()
    })

    it('has message-bubble testid on assistant messages', () => {
      render(<MessageBubble role="assistant" content="Hi" />)
      expect(screen.getByTestId('message-bubble')).toBeInTheDocument()
    })
  })
})
