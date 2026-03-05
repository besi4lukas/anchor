'use client'

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'

interface ChatInputProps {
  onSend: (msg: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div data-testid="chat-input" className="flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="How are you feeling right now..."
        disabled={disabled}
        rows={1}
        className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-[#1A1A2E] placeholder-gray-400 outline-none transition-colors focus:border-[#A6EEBF] focus:ring-1 focus:ring-[#A6EEBF]/40"
      />
      <button
        type="button"
        onClick={send}
        disabled={!canSend}
        aria-label="Send message"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#A6EEBF] text-[#1A1A2E] transition-opacity disabled:opacity-30"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95l14.095-5.637a.75.75 0 0 0 0-1.4L3.105 2.288Z" />
        </svg>
      </button>
    </div>
  )
}
