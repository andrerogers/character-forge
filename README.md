# CharacterForge

A Next.js app for generating richly detailed fictional characters. Describe a concept, pick an art style, and CharacterForge uses **Claude** to write the character profile and **Gemini** to paint the portrait.

## Features

- **3-step creation wizard** — concept & style → details (name, age, moods, colour palette, artist inspiration) → generated result
- **AI profile generation** — Claude (Sonnet 4.6) writes name, description, tagline, backstory, personality traits, and a matching hex colour palette
- **AI portrait generation** — Gemini (2.5 Flash Image) renders the portrait using the profile and your chosen art style
- **Artist inspiration** — optionally name real-world artists (e.g. Todd McFarlane, Moebius) to steer Gemini's visual style
- **Character gallery** — browse and revisit all saved characters
- **Art styles** — Comic, Manga, Sketch, Freeform
- **Dark / light theme**

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI — profiles | Anthropic Claude claude-sonnet-4-6 |
| AI — images | Google Gemini 2.5 Flash Image |
| Database | PostgreSQL 16 via Prisma 6 |
| Image storage | Local filesystem (`/images`) |

## Getting started

### Prerequisites

- Node.js 20+
- Docker (for the local Postgres instance)
- An Anthropic API key
- A Google Gemini API key

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local
# then fill in ANTHROPIC_API_KEY, GEMINI_API_KEY, DATABASE_URL

# 3. Start the database
docker compose up -d

# 4. Run migrations
npx prisma migrate dev

# 5. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `GEMINI_API_KEY` | Google API key for Gemini |
| `DATABASE_URL` | Postgres connection string |

The Docker Compose database uses:
```
DATABASE_URL=postgresql://character_forge:character_forge@localhost:5432/character_forge
```

## Project structure

```
app/                        # Next.js App Router
  page.tsx                  # character gallery
  characters/new/page.tsx   # creation wizard
  api/generate/             # profile + image generation routes
  api/characters/           # CRUD routes
components/
  creator/                  # step-by-step wizard components
  gallery/                  # gallery grid
  ui/                       # shadcn/ui primitives
lib/
  anthropic.ts              # Claude integration
  gemini.ts                 # Gemini integration
  db.ts                     # Prisma client
  storage.ts                # image persistence
types/
  character.ts              # shared TypeScript interfaces
prisma/
  schema.prisma             # database schema
```

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # run production build
npx prisma studio    # visual database browser
```
