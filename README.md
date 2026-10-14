# CharacterForge

A local-first Next.js app for hobbyist artists and comic/manga creators. Describe a concept, pick an art style, and CharacterForge uses **Claude** to write the character profile and **Gemini** to paint the portrait, then turns each character into drawing practice: timed exercises, step-by-step guides and a personal sketchbook.

## Features

- **3-step creation wizard** — concept & style → details (name, age, moods, colour palette, pose, artist inspiration) → generated result, with Regenerate before saving
- **AI profile generation** — Claude (Sonnet 4.6) writes name, description, tagline, backstory, personality traits, a matching hex colour palette and 3–5 tags (archetype, style, difficulty)
- **AI portrait generation** — Gemini (2.5 Flash Image) renders the portrait using the profile and your chosen art style
- **Pose / angle** — Front View, 3/4 View, Profile, Action or Sitting
- **Artist inspiration** — preset chips (Moebius, Akira Toriyama, Jack Kirby, Yusuke Murata, Frank Miller, Naoki Urasawa) or any name you type, to steer Gemini's visual style
- **Character gallery** — browse saved characters and filter by tag
- **Exercise mode** — fullscreen timed drawing practice (1, 2, 5, 10 or 1–60 custom minutes) over the portrait
- **Drawing guide** — 2–8 step construction guide with an instructional diagram per step and an optional anatomy proportion overlay; saved with the character
- **Sketchbook** — upload photos or scans of your attempts (resized to 2048px max) with optional notes
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
| Image storage | Local filesystem (`public/uploads`) |
| Tests | Vitest |

## Getting started

### Prerequisites

- Node.js 20.9+
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
  characters/[id]/          # detail page (guide + sketchbook) and exercise mode
  api/generate/             # profile, image, guide and random-concept routes
  api/characters/           # character CRUD, guide and sketch routes
  api/sketches/             # delete a sketch
components/
  creator/                  # step-by-step wizard components
  gallery/                  # gallery grid with tag filters
  exercise/                 # fullscreen timed exercise
  guide/                    # drawing guide drawer and state
  sketchbook/               # sketch upload and grid
  ui/                       # shadcn/ui primitives
lib/
  anthropic.ts              # Claude integration
  gemini.ts                 # Gemini integration
  db.ts                     # Prisma client
  storage.ts                # image persistence and sketch resizing
tests/                      # Vitest suites for API routes and lib modules
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
npm test             # run the test suite
npx prisma studio    # visual database browser
```
