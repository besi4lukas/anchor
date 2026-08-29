'use client'

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FIRST_MESSAGE_PLACEHOLDER } from '@/lib/copy'

interface ChatInputProps {
  onSend: (msg: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = FIRST_MESSAGE_PLACEHOLDER,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [])

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const send = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    resetHeight()
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [value, disabled, onSend, resetHeight])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div
      data-testid="chat-input"
      className="relative flex w-full items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_12px_28px_-12px_rgba(16,24,40,0.16)] transition-colors focus-within:border-anchor-mint focus-within:ring-2 focus-within:ring-anchor-mint/40"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Message input"
        aria-describedby="chat-input-hint"
        rows={1}
        className="max-h-[200px] min-h-[74px] w-full flex-1 resize-none bg-transparent px-3 py-2 text-[15px] leading-relaxed text-anchor-ink-strong placeholder-gray-500 outline-none disabled:cursor-not-allowed"
      />
      {/* The icon variant's mint matches the border the wrapper turns on
          focus, which is also the accent the primary buttons elsewhere use.
          Dark icon rather than white: on a colour this light, white would not
          be readable. */}
      <Button
        variant="icon"
        onClick={send}
        disabled={!canSend}
        aria-label="Send message"
      >
        <ArrowUp aria-hidden className="h-5 w-5" />
      </Button>
      <span id="chat-input-hint" className="sr-only">
        Press Enter to send, Shift plus Enter for a new line.
      </span>
    </div>
  )
}
