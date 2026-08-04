'use client'

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'
import { ArrowUp } from 'lucide-react'

interface ChatInputProps {
  onSend: (msg: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = 'How are you feeling right now...',
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
      className="relative flex w-full items-end gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.05),0_12px_28px_-12px_rgba(16,24,40,0.16)] transition-colors focus-within:border-[#A6EEBF] focus-within:ring-2 focus-within:ring-[#A6EEBF]/40"
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
        className="max-h-[200px] min-h-[74px] w-full flex-1 resize-none bg-transparent px-3 py-2 text-[15px] leading-relaxed text-[#1A1A2E] placeholder-gray-500 outline-none disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={send}
        disabled={!canSend}
        aria-label="Send message"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A1A2E] text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A2E] disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowUp aria-hidden className="h-5 w-5" />
      </button>
      <span id="chat-input-hint" className="sr-only">
        Press Enter to send, Shift plus Enter for a new line.
      </span>
    </div>
  )
}
