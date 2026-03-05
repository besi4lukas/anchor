'use client'

export function TypingIndicator() {
  return (
    <div data-testid="typing-indicator" className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-gray-400"
          style={{
            animation: 'typing 1.4s infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  )
}
