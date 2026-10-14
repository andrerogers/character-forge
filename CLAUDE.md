# CharacterForge — Claude Code Guide

## Repository

https://github.com/andrerogers/character-forge

## Project overview

CharacterForge is a local-first, single-user Next.js 16 app for hobbyist artists. Users build fictional characters through a 3-step wizard: Claude (Anthropic) generates the character profile (name, description, backstory, colour palette, personality traits, tags) and an image model generates the portrait — Gemini directly, any OpenRouter image model, or Higgsfield. Characters can also get videos (OpenRouter or Higgsfield; text-to-video or animating the portrait). Characters are persisted in PostgreSQL via Prisma and rendered in a tag-filterable gallery. Each character also has drawing-practice tools: a fullscreen timed exercise mode, an AI step-by-step drawing guide, and a sketchbook of the user's own uploads.

## Development commands

```bash
npm run dev       # start Next.js dev server (Turbopack)
npm run build     # production build
npm run start     # run production build
npm test          # Vitest suite (API routes + lib); needs no DB or API keys
npx prisma migrate dev   # apply schema changes and regenerate client
npx prisma studio        # open Prisma visual DB browser
```

## Environment variables

Copy `.env.example` to `.env.local` at the project root (`prisma.config.ts` loads `.env.local` too, so the Prisma CLI uses the same file):

```
ANTHROPIC_API_KEY=sk-ant-...        # required
GEMINI_API_KEY=AIza...              # any of these three; pickers offer only configured providers
OPENROUTER_API_KEY=sk-or-...
HIGGSFIELD_API_KEY=id:secret
IMAGE_PROVIDER= IMAGE_MODEL=        # optional defaults
VIDEO_PROVIDER= VIDEO_MODEL=
DATABASE_URL=postgresql://character_forge:character_forge@localhost:5432/character_forge
```

`OPENROUTER_BASE_URL`, `HIGGSFIELD_BASE_URL` and `HIGGSFIELD_POLL_MS` exist only to point the clients at a fake server in tests.

## Database (PostgreSQL)

Docker Compose spins up a local Postgres 16 instance:

```bash
docker compose up -d   # start DB
docker compose down    # stop DB
```

Models live in `prisma/schema.prisma`: `Character` (with `tags String[]`), `Sketch` (many per character), `DrawingGuide` (at most one per character), `DrawingStep` (ordered by `stepNumber`) and `Video` (a provider job plus the downloaded clip). Sketches, guides and videos cascade-delete with their character. `Character.imageSource` records the `provider:model` that made the portrait. After changing the schema always run `npx prisma migrate dev`.

## Architecture

```
app/
  page.tsx                    # gallery: server-fetches all characters, GalleryGrid filters client-side
  characters/
    new/page.tsx              # 3-step creation wizard (client component)
    [id]/page.tsx             # detail page: profile, Drawing Guide, Videos, My Sketches
    [id]/exercise/page.tsx    # duration picker + fullscreen timed exercise
  api/
    generate/
      profile/route.ts        # POST → Claude generates GeneratedProfile JSON (incl. tags)
      image/route.ts          # POST → image from the chosen engine. Portrait mode {profile, style, pose?, artists?}
                              #   or guide mode {characterId, slot: "step-<n>"|"overlay", prompt}; both take engine?
      guide/route.ts          # POST → Claude returns GuidePlan (steps + proportion system), no images
      random/route.ts         # POST → Claude invents a random concept
    characters/
      route.ts                # GET (list) / POST (save) characters
      [id]/route.ts           # GET (with sketches, guide, videos) / DELETE (rows + files) / PATCH
      [id]/guide/route.ts     # POST save finished guide / DELETE guide (for regenerate)
      [id]/sketches/route.ts  # GET list / POST multipart upload (file, note)
      [id]/videos/route.ts    # GET list / POST start a video job
      [id]/videos/estimate/   # POST price a video without making it
    sketches/[id]/route.ts    # DELETE one sketch
    videos/[id]/route.ts      # GET (advances the job, downloads when done) / DELETE
    media/options/route.ts    # GET configured providers, models and defaults for the pickers

components/
  chip.tsx                    # toggle pill button (purple filled when active); use for all chips
  engine-picker.tsx           # provider + model selects (OpenRouter also takes a typed model id)
  creator/                    # wizard steps + step indicator
  gallery/                    # GalleryGrid (tag pills + search), empty state
  exercise/                   # ExerciseMode + useCountdown
  guide/                      # GuideProvider (state), GuideDrawer, GuideSection/GuideButton
  sketchbook/                 # Sketchbook (upload dialog, grid, lightbox)
  videos/                     # VideoStudio (price → confirm → follow job, video cards)
  ui/                         # shadcn/ui primitives

lib/
  anthropic.ts                # generateCharacterProfile(), generateDrawingGuide(), generateRandomConcept()
  artwork.ts                  # buildPortraitPrompt(), generateCharacterImage(), generateGuideImage()
  media/                      # provider layer, no React:
    registry.ts               #   which providers are configured, defaults, resolve/validate engines
    images.ts / video.ts      #   dispatch to the provider; video.ts also checks durations
    gemini.ts openrouter.ts higgsfield.ts   # API clients
    catalogue.ts              #   model lists (OpenRouter live, cached 10 min, fallback list)
  videos.ts                   # refreshVideo(): poll provider, claim + download finished clip
  video-request.ts            # parseVideoRequest(): shared validation for estimate/create
  db.ts                       # Prisma client singleton
  storage.ts                  # saveImage(), saveSketch() (sharp resize), saveGuideImage(), deletes
  characters.ts               # deleteCharacterWithFiles()
  guide.ts                    # parseGuidePlan() (Claude output), parseGuideSave() (client payload)
  tags.ts / artists.ts / poses.ts / proportions.ts / timer.ts   # pure helpers
  json.ts                     # parseModelJson(): tolerant JSON extraction from Claude replies
  http.ts / api-client.ts     # server route helpers / browser fetch helpers

hooks/
  use-media-options.ts        # fetches /api/media/options once per page

types/
  character.ts                # CharacterFormData, GeneratedProfile, Character, Sketch, DrawingGuide, GuidePlan…

tests/                        # Vitest: tests/api/* (routes, Prisma + AI mocked), tests/lib/*, tests/media/* (provider clients)
```

## Key data flow

1. User fills wizard (Step 1 → Step 2 → Generate).
2. `app/characters/new/page.tsx` hits `/api/generate/profile`; Claude returns `GeneratedProfile` JSON with 3–5 tags ordered archetype, style, difficulty (normalised by `normalizeTags`).
3. Then it hits `/api/generate/image` with the profile + style + optional pose and artist names.
4. `lib/artwork.ts` builds the image prompt (`Artistic inspiration: in the style of …` when artists are supplied, `Pose: …` when a pose is chosen) and sends it to the engine chosen in Step 2 (or the default).
5. The image buffer is saved to `public/uploads/<cuid>.png` (served at `/uploads/...`); the response's `imageSource` is saved on the character.
6. Regenerate re-runs both calls; Save POSTs to `/api/characters` and opens the detail page.

### Drawing guide

1. The drawer's setup panel POSTs `/api/generate/guide` `{characterId, stepCount 2–8, includeOverlay}` (409 if a guide exists).
2. Claude returns steps (`title`, `instructions`, `imagePrompt`) and picks a proportion system (realistic 7.5 heads / manga 8–9 / chibi 2–3) from the style; `parseGuidePlan` validates it and falls back to a style default.
3. The client fires one `/api/generate/image` guide-mode call per step (plus `overlay`) in parallel. The server attaches the portrait as a reference image and always appends the instructional-diagram style. Files go to `public/uploads/guides/<characterId>/<slot>.png?v=<ts>` (the `?v=` busts caches after regeneration, so guide images use plain `<img>`).
4. Steps render as their images land; failed images get a Retry button. Only when every image succeeds does the client POST `/api/characters/[id]/guide`, which validates that paths point into that character's guide folder.
5. Regenerate Guide = DELETE the guide (rows + folder), then the setup panel again.

### Image and video engines

An engine is `{ provider, model }`. `lib/media/registry.ts` decides what's available from the API keys set: images from `gemini`, `openrouter` (any `vendor/model` id) and `higgsfield` (`z-image/turbo`, `marketing-studio/image`); video from `openrouter` (any id) and `higgsfield` (`seedance`, `kling`, `pixverse`). Routes call `resolveImageEngine` / `resolveVideoEngine` on client input and return 400 for an unconfigured provider or invalid model.

- OpenRouter images: chat completions with `modalities: ["image","text"]`; a reference image goes in as an `image_url` content part. OpenRouter video: `POST /videos` → poll `/videos/{id}` → download `unsigned_urls[0]` or `/videos/{id}/content` with the API key (not presigned).
- Higgsfield: submit with an `Idempotency-Key`, poll `/requests/{id}/status`, download the output (kept only 7 days there). Reference/first-frame images go through a presigned upload; the API key is never sent to the storage URL.

### Videos

Rules: every video is priced first (`/videos/estimate`; Higgsfield's estimate endpoint is free, OpenRouter's is computed from its published pricing SKUs and may be unknown) and made only when the user confirms; sound is off unless asked; 5 s by default, 10 s max, and durations are checked against each model. Image mode animates the portrait as the first frame. Jobs are async: the client polls `GET /api/videos/[id]` every 5 s, which asks the provider and, once done, claims the row (`pending → saving`), downloads to `public/uploads/videos/<id>.mp4` and marks it `completed` with the actual cost when reported. A job survives reloads; deleting a pending one can't cancel it at the provider.

### Sketches

`POST /api/characters/[id]/sketches` (multipart `file`, `note`) → `saveSketch()` resizes with sharp to 2048px on the longest side (never enlarging, EXIF-rotated, JPEG/WebP/PNG kept at high quality, other formats → PNG) into `public/uploads/sketches/`.

## Ephemeral pose and artist fields

`pose?: string` and `artists?: string[]` in `CharacterFormData` are never stored in the database and never sent to Claude. They are forwarded from the form → image API route → `generateCharacterImage()` and injected into the image prompt only when set. Artists come from the free-text input or the `ARTIST_PRESETS` chips; `addArtists()` drops blanks and case-insensitive duplicates. `POST /api/characters` only persists known fields, so these are dropped even if sent.

## Coding conventions

- All API routes use the Next.js App Router (`route.ts`).
- Client components are marked with `"use client"` at the top.
- shadcn/ui components live in `components/ui/`; never modify them directly — use the `shadcn` CLI to add new ones. (If the registry at ui.shadcn.com is unreachable, compose from the `radix-ui` package outside `components/ui/` instead, as `components/guide/guide-drawer.tsx` does.)
- Prisma client is imported from `@/lib/db` (singleton pattern).
- Uploaded and generated images live in `public/uploads/` (git-ignored) and are served at `/uploads/...`; the folders are created on first write. `next.config.ts` allows `/uploads/**` for `next/image`.
- API routes return `{ error }` with 400/404/409 for bad input and 502 when Claude or an image/video provider fails (`lib/http.ts` summarises upstream errors by status); the client surfaces these with `sonner` toasts or inline retry states.
- Tests come first: add or update the Vitest suite in `tests/` before changing an API route. Route tests mock `@/lib/db` with `createPrismaMock()` from `tests/helpers.ts`; provider clients are tested against `mockFetch()`.
