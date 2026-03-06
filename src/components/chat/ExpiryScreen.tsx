'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ExpiryScreenProps {
  onRestart: () => void
}

const MOOD_LABELS = [
  { value: 1, label: 'Very low' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
]

export function ExpiryScreen({ onRestart }: ExpiryScreenProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleMood = async (value: number) => {
    if (isSubmitting || submitted) return
    setIsSubmitting(true)
    setSelected(value)
    try {
      await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
    } catch {
      // mood tracking is best-effort
    }
    setSubmitted(true)
    setIsSubmitting(false)
  }

  return (
    <main
      data-testid="expiry-screen"
      className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-6"
    >
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-[#1A1A2E]">
          Your session has ended
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Everything from this conversation has been deleted.
        </p>

        {!submitted ? (
          <div className="mt-8">
            <p className="mb-4 text-sm font-medium text-[#1A1A2E]">
              How are you feeling now?
            </p>
            <div className="flex justify-center gap-2">
              {MOOD_LABELS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleMood(value)}
                  aria-label={label}
                  className={`flex h-10 w-14 flex-col items-center justify-center rounded-lg border text-xs transition-colors ${
                    selected === value
                      ? 'border-[#A6EEBF] bg-[#A6EEBF]/20 text-[#1A1A2E]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-base font-semibold">{value}</span>
                  <span className="text-[10px] leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-8 text-sm text-gray-500">Thank you for sharing.</p>
        )}

        <button
          type="button"
          onClick={onRestart}
          className="mt-8 w-full rounded-xl bg-[#A6EEBF] px-6 py-3 text-sm font-medium text-[#1A1A2E] transition-opacity hover:opacity-90"
        >
          Start a new session
        </button>

        <Link
          href="/privacy"
          className="mt-4 inline-block text-xs text-gray-400 underline"
        >
          Privacy policy
        </Link>
      </div>
    </main>
  )
}
