'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface CrisisResource {
  name: string
  detail: string
  /** Shown as selectable text, because tel: does nothing on a desktop. */
  display: string
  /** What lands in the clipboard: digits only, ready to paste into a dialler. */
  copyValue: string
  action: string
  href: string
}

// tel: and sms: rather than web links — on a phone these dial or open the
// composer in one tap, which is the whole point of surfacing them here.
const RESOURCES: CrisisResource[] = [
  {
    name: '988 Suicide & Crisis Lifeline',
    detail: 'Free, confidential support, 24 hours a day.',
    display: '988',
    copyValue: '988',
    action: 'Call or text',
    href: 'tel:988',
  },
  {
    name: 'Crisis Text Line',
    detail: 'Text with a trained counselor if talking feels like too much.',
    display: 'Text HOME to 741741',
    copyValue: '741741',
    action: 'Text',
    href: 'sms:741741&body=HOME',
  },
  {
    name: 'SAMHSA National Helpline',
    detail:
      'Treatment referrals and information, 24/7, in English and Spanish.',
    display: '1-800-662-4357',
    copyValue: '18006624357',
    action: 'Call',
    href: 'tel:18006624357',
  },
]

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const copy = useCallback(async () => {
    // Confirm only what actually happened. Optional-chaining the call would
    // resolve to undefined on a browser without clipboard access and still
    // report success, telling someone their crisis number is on the clipboard
    // when it is not.
    if (!navigator.clipboard?.writeText) return

    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Access can be refused outright; the number is on screen to read either
      // way, so there is nothing worth interrupting them about.
    }
  }, [value])

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="min-h-[44px] shrink-0 rounded-lg px-3 text-xs font-medium text-amber-900 underline underline-offset-2 transition-colors hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * Deliberately warm amber rather than the app's green: a person in crisis needs
 * this to read as a different kind of thing from the conversation around it.
 */
export function CrisisResourceCard() {
  return (
    <section
      data-testid="crisis-resource-card"
      aria-label="Crisis support resources"
      className="w-full rounded-r-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-4"
    >
      <p className="text-sm font-semibold text-amber-900">
        Support available right now
      </p>
      {/* Stated up front rather than discovered by dialling. Every number below
          is US-only, and a person in crisis should not find that out from a
          failed call. */}
      <p className="mt-0.5 text-xs text-amber-800">United States</p>

      <ul className="mt-3 flex flex-col gap-2">
        {RESOURCES.map(({ name, detail, display, copyValue, action, href }) => (
          <li
            key={name}
            className="flex items-center gap-1 rounded-lg bg-white/70 pr-1 transition-colors hover:bg-white"
          >
            <a
              href={href}
              className="flex min-h-[44px] flex-1 flex-col justify-center gap-0.5 rounded-lg px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              <span className="text-sm font-medium text-amber-950">{name}</span>
              <span className="text-xs leading-snug text-amber-800">
                {detail}
              </span>
              <span className="mt-1 flex items-center gap-2">
                {/* Selectable, so it is usable on a desktop where tel: is inert. */}
                <span className="select-text text-sm font-semibold tabular-nums text-amber-950">
                  {display}
                </span>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                  {action}
                </span>
              </span>
            </a>
            <CopyButton value={copyValue} label={name} />
          </li>
        ))}
      </ul>

      {/* Shown in every region, not only unmapped ones: geo-IP is wrong for
          anyone on a VPN, so the way out stays visible regardless. */}
      <a
        data-testid="international-helpline-link"
        href="https://findahelpline.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex min-h-[44px] items-center text-xs font-medium text-amber-900 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
      >
        Outside the US? Find a helpline in your country
      </a>

      <p className="text-xs text-amber-800">
        If you are in immediate danger, call 911 or your local emergency number.
      </p>
    </section>
  )
}
