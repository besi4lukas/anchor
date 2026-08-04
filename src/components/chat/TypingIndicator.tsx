'use client'

export function TypingIndicator() {
  return (
    <div
      data-testid="typing-indicator"
      role="status"
      className="relative flex items-center gap-1"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="typing-dot h-2 w-2 rounded-full bg-gray-500"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
      <span className="sr-only">Anchor is typing</span>
    </div>
  )
}
