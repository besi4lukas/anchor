import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        serif: [
          'Tiempos Text',
          'Georgia',
          'Cambria',
          'Times New Roman',
          'serif',
        ],
        newsreader: ['var(--font-newsreader)', 'Georgia', 'serif'],
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.94' },
          '50%': { transform: 'scale(1.045)', opacity: '1' },
        },
        haze: {
          '0%, 100%': { transform: 'scale(1.15)', opacity: '0.5' },
          '50%': { transform: 'scale(1.3)', opacity: '0.75' },
        },
      },
      animation: {
        breathe: 'breathe 7s ease-in-out infinite',
        haze: 'haze 9s ease-in-out infinite',
      },
      colors: {
        // Landing surface palette, carried over verbatim from the Anchor
        // Landing design file.
        anchor: {
          bg: 'oklch(0.965 0.006 150)',
          glow: 'oklch(0.985 0.012 155)',
          line: 'oklch(0.9 0.008 155)',
          ink: 'oklch(0.27 0.02 165)',
          brand: 'oklch(0.3 0.02 165)',
          body: 'oklch(0.48 0.015 160)',
          muted: 'oklch(0.45 0.015 160)',
          subtle: 'oklch(0.6 0.02 160)',
          caption: 'oklch(0.62 0.015 160)',
          faint: 'oklch(0.63 0.02 160)',
          ghost: 'oklch(0.65 0.015 160)',
          accent: 'oklch(0.42 0.055 165)',
          'accent-hover': 'oklch(0.35 0.06 165)',
          'accent-fg': 'oklch(0.99 0.005 150)',
          link: 'oklch(0.45 0.05 165)',
          'link-hover': 'oklch(0.32 0.06 165)',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
export default config
