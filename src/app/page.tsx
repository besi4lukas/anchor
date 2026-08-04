import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Anchor',
  description:
    'A private place to talk when things feel heavy. The session lasts sixty minutes. When it ends, the conversation is gone.',
}

const PROMISES = [
  {
    label: 'Sixty minutes',
    body: 'A session runs for one hour, then closes on its own. You can start another whenever you want.',
  },
  {
    label: 'Never stored',
    body: 'Messages are held in memory for the length of the session. Nothing is written to disk, backed up, or used for training.',
  },
  {
    label: 'No account',
    body: 'No name, email, or password. There is no history to log back into.',
  },
]

const FOOTER_LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'support@anchor.chat', href: 'mailto:kingsley.besidonne@gmail.com' },
]

export default function Landing() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-anchor-bg">
      <div className="anchor-halo absolute inset-0" aria-hidden />

      <header className="relative flex items-center justify-between gap-4 px-6 py-6 sm:px-14 sm:py-[34px]">
        <div className="flex items-center gap-[11px]">
          <Image
            src="/anchor-ai.png"
            alt=""
            aria-hidden
            width={26}
            height={26}
            className="h-[26px] w-[26px] mix-blend-multiply"
          />
          <span className="font-newsreader text-[21px] tracking-[0.01em] text-anchor-brand">
            Anchor
          </span>
        </div>
        <span className="text-xs uppercase tracking-[0.14em] text-anchor-subtle">
          No account, ever
        </span>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-14 pt-6 text-center sm:gap-[34px] sm:px-14 sm:pb-14 sm:pt-10">
        <div className="relative grid h-[160px] w-[160px] place-items-center sm:h-[220px] sm:w-[220px]">
          {/* The orb asset is opaque white-backed, so blurring it leaves a
              faint square edge; the radial mask fades that boundary out. */}
          <Image
            src="/anchor-ai.png"
            alt=""
            aria-hidden
            width={300}
            height={300}
            priority
            className="absolute h-[220px] w-[220px] max-w-none animate-haze mix-blend-multiply blur-[26px] [mask-image:radial-gradient(circle,black_40%,transparent_72%)] sm:h-[300px] sm:w-[300px]"
          />
          <Image
            src="/anchor-ai.png"
            alt="Anchor"
            width={240}
            height={240}
            priority
            className="relative h-[180px] w-[180px] max-w-none animate-breathe mix-blend-multiply sm:h-[240px] sm:w-[240px]"
          />
        </div>

        <div className="flex max-w-[620px] flex-col items-center gap-[18px]">
          <h1 className="text-pretty font-newsreader text-[38px] font-light leading-[1.06] tracking-[-0.015em] text-anchor-ink sm:text-[62px]">
            One hour. Nothing kept.
          </h1>
          <p className="max-w-[460px] text-pretty text-[17px] leading-[1.6] text-anchor-body">
            A private place to talk when things feel heavy. The session lasts
            sixty minutes. When it ends, the conversation is gone.
          </p>
        </div>

        <div className="flex flex-col items-center gap-[14px]">
          <Link
            href="/chat"
            className="rounded-full bg-anchor-accent px-11 py-[17px] text-base tracking-[0.01em] text-anchor-accent-fg transition duration-200 hover:-translate-y-px hover:bg-anchor-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anchor-accent"
          >
            Start session
          </Link>
          <span className="text-[13px] text-anchor-caption">
            Opens straight into the chat. No sign-up, no email.
          </span>
        </div>
      </main>

      <footer className="relative flex flex-col gap-[18px] border-t border-anchor-line px-6 pb-6 pt-5 sm:px-14 sm:pb-[26px] sm:pt-[22px]">
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-10">
          {PROMISES.map(({ label, body }) => (
            <div key={label} className="flex flex-col gap-[5px]">
              <span className="text-[11px] uppercase tracking-[0.14em] text-anchor-faint">
                {label}
              </span>
              <span className="text-[13px] leading-[1.55] text-anchor-muted">
                {body}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-4 text-xs text-anchor-ghost sm:flex-row sm:items-center sm:gap-6">
          <span>
            Anchor is not a crisis service. If you are in danger, call 911 or
            your local emergency number.
          </span>
          <div className="flex gap-[22px]">
            {FOOTER_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-anchor-link hover:text-anchor-link-hover"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
