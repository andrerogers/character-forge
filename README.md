# CharacterForge

A local-first Next.js app for hobbyist artists and comic/manga creators. Describe a concept, pick an art style, and CharacterForge uses **Claude** to write the character profile and an image model (Gemini, OpenRouter or Higgsfield) to paint the portrait, then turns each character into drawing practice: timed exercises, step-by-step guides and a personal sketchbook.

## Features

- **3-step creation wizard** — concept & style → details (name, age, moods, colour palette, pose, artist inspiration) → generated result, with Regenerate before saving
- **AI profile generation** — Claude (Sonnet 4.6) writes name, description, tagline, backstory, personality traits, a matching hex colour palette and 3–5 tags (archetype, style, difficulty)
- **AI portrait generation** — the chosen image model renders the portrait using the profile and your chosen art style
- **Pose / angle** — Front View, 3/4 View, Profile, Action or Sitting
- **Artist inspiration** — preset chips (Moebius, Akira Toriyama, Jack Kirby, Yusuke Murata, Frank Miller, Naoki Urasawa) or any name you type, to steer the portrait's visual style
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

- **Node.js 20.9+**
- **Docker** with Compose v2 (runs the local Postgres database). Docker must be running before you start the app.
- An **Anthropic API key**
- At least one **image provider key**: Google Gemini, OpenRouter or Higgsfield. OpenRouter or Higgsfield also enable video.

### First run

```bash
npm install        # also generates the Prisma client
npm run setup      # creates .env.local, starts Postgres in Docker, applies migrations
```

`npm run setup` copies `.env.example` to `.env.local` the first time. Open `.env.local` and fill in your keys:

```bash
ANTHROPIC_API_KEY=sk-ant-...      # required
GEMINI_API_KEY=                   # set at least one of these three
OPENROUTER_API_KEY=
HIGGSFIELD_API_KEY=               # "id:secret"
```

Leave a key empty if you don't have it. The app only offers providers whose key is set.

Then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Every day after that

```bash
npm run dev
```

`npm run dev` checks `.env.local`, starts the database if it isn't running (and waits until it's ready), applies any new migrations, then starts Next.js. After pulling changes, run `npm install` first if `package.json` changed.

When you're done, `npm run db:down` stops the database. Your data is kept in a Docker volume.

### Scripts

| Command | What it does |
|---|---|
| `npm run setup` | First-time setup: create `.env.local`, start the database, apply migrations |
| `npm run dev` | Start the database (if needed), apply migrations, run the dev server |
| `npm run dev:app` | Run only the Next.js dev server (database already running, or your own Postgres) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm test` | Run the test suite (no database or API keys needed) |
| `npm run typecheck` | TypeScript check |
| `npm run db:up` | Start Postgres in Docker and wait until it accepts connections |
| `npm run db:down` | Stop Postgres (data is kept) |
| `npm run db:logs` | Follow the database logs |
| `npm run db:deploy` | Apply pending migrations |
| `npm run db:migrate` | After editing `prisma/schema.prisma`: create and apply a new migration |
| `npm run db:reset` | Drop all data and re-apply every migration (asks first) |
| `npm run db:studio` | Browse the database in Prisma Studio |

### Environment variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude (required) |
| `GEMINI_API_KEY` | Gemini images, called directly |
| `OPENROUTER_API_KEY` | OpenRouter images and video |
| `HIGGSFIELD_API_KEY` | Higgsfield images and video (`id:secret`) |
| `IMAGE_PROVIDER` / `IMAGE_MODEL` | Optional default image engine |
| `VIDEO_PROVIDER` / `VIDEO_MODEL` | Optional default video engine |
| `DATABASE_URL` | Postgres connection string (the default matches Docker Compose) |

### Troubleshooting

**`Cannot connect to the Docker daemon`**: Docker isn't running. Start Docker Desktop (or `sudo systemctl start docker` on Linux) and run the command again.

**`port is already allocated` / `address already in use` on 5432**: another Postgres is using the port. Stop it, or run the database on another port: `DB_PORT=5433 npm run db:up`, and set `localhost:5433` in `DATABASE_URL` in `.env.local`.

**`P1001: Can't reach database server at localhost:5432`**: the database isn't running. Use `npm run dev` (it starts it), or `npm run db:up`.

**`Can't resolve 'tailwindcss'` or "Next.js inferred your workspace root"**: a lockfile in a parent folder confused Next.js about where the project is. `next.config.ts` pins the root to this folder, so pull the latest code. You can also delete the stray lockfile, e.g. `~/projects/package-lock.json`.

**`npm install` blocked by a minimum-package-age policy** (e.g. Safe-chain): a dependency in `package-lock.json` is newer than your policy allows. Pinning it with `overrides` in `package.json` (as is done for `rollup`) fixes it.

**A provider doesn't appear in the image/video pickers**: its key isn't set in `.env.local`. Restart `npm run dev` after editing the file.

## Project structure

```
app/                        # Next.js App Router
  page.tsx                  # character gallery
  characters/new/page.tsx   # creation wizard
  characters/[id]/          # detail page (guide, videos, sketchbook) and exercise mode
  api/generate/             # profile, image, guide and random-concept routes
  api/characters/           # character CRUD, guide, sketch and video routes
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
  migrations/               # applied by npm run db:deploy / npm run dev
scripts/
  setup-env.mjs             # creates and checks .env.local
```
