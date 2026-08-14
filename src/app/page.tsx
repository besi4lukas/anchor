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
    <div className="landing-shell relative flex flex-col bg-anchor-bg">
      <div className="anchor-halo absolute inset-0" aria-hidden />

      <header className="relative flex shrink-0 items-center justify-between gap-4 px-6 py-[clamp(10px,2.4svh,34px)] sm:px-14">
        <div className="flex items-center gap-[11px]">
          <span className="font-newsreader text-[clamp(18px,2.3svh,21px)] tracking-[0.01em] text-anchor-brand">
            Anchor
          </span>
        </div>
        <span className="text-[clamp(10px,1.4svh,12px)] uppercase tracking-[0.14em] text-anchor-subtle">
          No account, ever
        </span>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(9px,3svh,34px)] px-6 pb-[clamp(10px,3svh,56px)] pt-[clamp(4px,1.4svh,40px)] text-center sm:px-14">
        <div className="relative grid h-[clamp(56px,19svh,220px)] w-[clamp(56px,19svh,220px)] shrink-0 place-items-center">
          {/* The orb asset is opaque white-backed, so blurring it leaves a
              faint square edge; the radial mask fades that boundary out. */}
          <Image
            src="/anchor-ai.png"
            alt=""
            aria-hidden
            width={300}
            height={300}
            priority
            className="absolute h-[136%] w-[136%] max-w-none animate-haze mix-blend-multiply blur-[clamp(10px,2.4svh,26px)] [mask-image:radial-gradient(circle,black_40%,transparent_72%)]"
          />
          <Image
            src="/anchor-ai.png"
            alt="Anchor"
            width={240}
            height={240}
            priority
            className="relative h-[110%] w-[110%] max-w-none animate-breathe mix-blend-multiply"
          />
        </div>

        <div className="flex max-w-[620px] flex-col items-center gap-[clamp(6px,1.8svh,18px)]">
          <h1 className="text-pretty font-newsreader text-[clamp(24px,min(7.4vw,6.6svh),62px)] font-light leading-[1.06] tracking-[-0.015em] text-anchor-ink">
            One hour. Nothing kept.
          </h1>
          <p className="landing-lede max-w-[460px] text-pretty text-[clamp(12px,1.9svh,17px)] leading-[1.5] text-anchor-body sm:leading-[1.6]">
            A private place to talk when things feel heavy. The session lasts
            sixty minutes. When it ends, the conversation is gone.
          </p>
        </div>

        <div className="flex flex-col items-center gap-[clamp(8px,1.5svh,14px)]">
          <Link
            href="/chat"
            className="rounded-full bg-anchor-accent px-[clamp(30px,7vw,44px)] py-[clamp(9px,1.8svh,17px)] text-[clamp(13px,1.9svh,16px)] tracking-[0.01em] text-anchor-accent-fg transition duration-200 hover:-translate-y-px hover:bg-anchor-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-anchor-accent"
          >
            Start session
          </Link>
          <span className="landing-cta-note text-[clamp(11px,1.5svh,13px)] text-anchor-caption">
            Opens straight into the chat. No sign-up, no email.
          </span>
        </div>
      </main>

      <footer className="relative flex shrink-0 flex-col gap-[clamp(6px,1.8svh,18px)] border-t border-anchor-line px-6 pb-[clamp(10px,2svh,26px)] pt-[clamp(10px,1.8svh,22px)] sm:px-14">
        <div className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-1 sm:grid sm:grid-cols-3 sm:gap-x-10 sm:gap-y-0">
          {PROMISES.map(({ label, body }) => (
            <div key={label} className="flex flex-col gap-[5px]">
              <span className="text-[clamp(9px,1.3svh,11px)] uppercase tracking-[0.14em] text-anchor-faint">
                {label}
              </span>
              <span className="landing-promise-body text-[13px] leading-[1.55] text-anchor-muted">
                {body}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-2 text-center text-[clamp(10px,1.4svh,12px)] text-anchor-ghost sm:flex-row sm:items-center sm:gap-6 sm:text-left">
          <span className="text-balance">
            Anchor is not a crisis service. If you are in danger, call 911 or
            your local emergency number.
          </span>
          <div className="flex shrink-0 gap-[clamp(14px,4vw,22px)]">
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
