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
- **Choice of image model** — portraits and guide diagrams can use Gemini directly, any OpenRouter image model, or Higgsfield (Z-Image Turbo, Marketing Studio)
- **Videos** — animate a character's portrait (image-to-video) or generate a clip from text, on OpenRouter (any video model, e.g. Veo 3.1) or Higgsfield (Seedance 2.5, Kling 3.0, PixVerse v6). Every video is priced before it's made; silent unless you ask for sound; 5 s by default, 10 s max
- **Art styles** — Comic, Manga, Sketch, Freeform
- **Dark / light theme**

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI — profiles | Anthropic Claude claude-sonnet-4-6 |
| AI — images | Gemini 2.5 Flash Image (direct), any OpenRouter image model, or Higgsfield |
| AI — video | OpenRouter video API or Higgsfield |
| Database | PostgreSQL 16 via Prisma 6 |
| Image storage | Local filesystem (`public/uploads`) |
| Tests | Vitest |

## Getting started

### Prerequisites

- Node.js 20.9+
- Docker (for the local Postgres instance)
- An Anthropic API key
- At least one image provider key: Google Gemini, OpenRouter or Higgsfield (OpenRouter or Higgsfield also enable video)

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
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude (required) |
| `GEMINI_API_KEY` | Gemini images, called directly |
| `OPENROUTER_API_KEY` | OpenRouter images and video |
| `HIGGSFIELD_API_KEY` | Higgsfield images and video (`id:secret`) |
| `IMAGE_PROVIDER` / `IMAGE_MODEL` | Optional default image engine |
| `VIDEO_PROVIDER` / `VIDEO_MODEL` | Optional default video engine |
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
  api/videos/               # poll / delete a video job
  api/media/options/        # providers and models for the pickers
components/
  creator/                  # step-by-step wizard components
  gallery/                  # gallery grid with tag filters
  exercise/                 # fullscreen timed exercise
  guide/                    # drawing guide drawer and state
  sketchbook/               # sketch upload and grid
  videos/                   # video studio (price, generate, follow jobs)
  engine-picker.tsx         # provider + model selects
  ui/                       # shadcn/ui primitives
lib/
  anthropic.ts              # Claude integration
  artwork.ts                # portrait and guide-diagram prompts
  media/                    # Gemini, OpenRouter and Higgsfield clients, provider registry
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
