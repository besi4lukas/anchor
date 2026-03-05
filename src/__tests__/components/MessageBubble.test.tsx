import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MessageBubble } from '@/components/chat/MessageBubble'

describe('MessageBubble', () => {
  it('user bubble is right-aligned', () => {
    const { container } = render(<MessageBubble role="user" content="Hello" />)
    const wrapper = container.querySelector('[data-role="user"]')
    expect(wrapper?.className).toContain('justify-end')
  })

  it('assistant bubble is left-aligned', () => {
    const { container } = render(
      <MessageBubble role="assistant" content="Hi" />,
    )
    const wrapper = container.querySelector('[data-role="assistant"]')
    expect(wrapper?.className).toContain('justify-start')
  })

  it('shows typing indicator when isStreaming', () => {
    render(<MessageBubble role="assistant" content="" isStreaming />)
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
  })
})
