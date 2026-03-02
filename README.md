# Anchor

A disappearing, no-signup chat that acts as a grounding guide. Anchor uses RAG (Retrieval-Augmented Generation) backed by curated mental health and psychology sources to give responses that are contextually informed, empathetic, and appropriately resourceful. The conversation lives only in the session — once it expires, it is gone.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Linting:** ESLint + Prettier (with Tailwind plugin)
- **Git Hooks:** Husky + lint-staged

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command         | Description                |
| --------------- | -------------------------- |
| `npm run dev`   | Start development server   |
| `npm run build` | Create production build    |
| `npm run start` | Start production server    |
| `npm run lint`  | Run ESLint                 |

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable                     | Description                          |
| ---------------------------- | ------------------------------------ |
| `UPSTASH_REDIS_REST_URL`     | Upstash Redis REST endpoint          |
| `UPSTASH_REDIS_REST_TOKEN`   | Upstash Redis auth token             |
| `SUPABASE_URL`               | Supabase project URL                 |
| `SUPABASE_SERVICE_KEY`       | Supabase service role key            |
| `ANTHROPIC_API_KEY`          | Anthropic API key                    |
| `OPENAI_API_KEY`             | OpenAI API key (embeddings)          |
| `SESSION_SECRET`             | Secret for session signing           |
| `NEXT_PUBLIC_APP_URL`        | Public-facing app URL                |

## Vercel Deployment

1. Go to [vercel.com](https://vercel.com) and create a new project from the GitHub repo.
2. Set **Framework Preset** to `Next.js`.
3. Set **Build Command** to `npm run build`.
4. Create two environments:
   - **Production** — branch: `main`
   - **Preview** — branch: `develop`
5. Add all keys from `.env.example` as environment variables in the Vercel dashboard.
6. For the Preview/staging environment, set `NEXT_PUBLIC_APP_URL` to `https://anchor-staging.vercel.app`.
7. For Production, set `NEXT_PUBLIC_APP_URL` to your real domain.
