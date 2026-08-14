import type { Metadata } from 'next'
import { Inter, Newsreader } from 'next/font/google'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-newsreader',
  adjustFontFallback: false,
  fallback: ['Georgia', 'serif'],
})

export const metadata: Metadata = {
  title: 'Anchor',
  description: 'A disappearing, no-signup chat that acts as a grounding guide.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${newsreader.variable} font-sans antialiased`}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  )
}
