'use client'

interface CrisisResource {
  name: string
  detail: string
  action: string
  href: string
}

// tel: and sms: rather than web links — on a phone these dial or open the
// composer in one tap, which is the whole point of surfacing them here.
const RESOURCES: CrisisResource[] = [
  {
    // Each number appears exactly once across a row — the name already carries
    // it here, so the badge says only what the tap does.
    name: '988 Suicide & Crisis Lifeline',
    detail: 'Free, confidential support, 24 hours a day.',
    action: 'Call or text',
    href: 'tel:988',
  },
  {
    name: 'Crisis Text Line',
    detail: 'Text with a trained counselor if talking feels like too much.',
    action: 'Text HOME to 741741',
    href: 'sms:741741&body=HOME',
  },
  {
    name: 'SAMHSA National Helpline',
    detail:
      'Treatment referrals and information, 24/7, in English and Spanish.',
    action: 'Call 1-800-662-4357',
    href: 'tel:18006624357',
  },
]

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
        {RESOURCES.map(({ name, detail, action, href }) => (
          <li key={name}>
            <a
              href={href}
              className="flex min-h-[44px] flex-col justify-center gap-1 rounded-lg bg-white/70 px-3 py-2 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium text-amber-950">
                  {name}
                </span>
                <span className="text-xs leading-snug text-amber-800">
                  {detail}
                </span>
              </span>
              <span className="shrink-0 self-start rounded-full bg-amber-200 px-3 py-1 text-xs font-medium text-amber-900 sm:self-auto">
                {action}
              </span>
            </a>
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
