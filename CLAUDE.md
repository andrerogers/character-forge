# CharacterForge — Claude Code Guide

## Repository

https://github.com/andrerogers/character-forge

## Project overview

CharacterForge is a local-first, single-user Next.js 16 app for hobbyist artists. Users build fictional characters through a 3-step wizard: Claude (Anthropic) generates the character profile (name, description, backstory, colour palette, personality traits, tags) and Gemini (Google) generates the portrait image. Characters are persisted in PostgreSQL via Prisma and rendered in a tag-filterable gallery. Each character also has drawing-practice tools: a fullscreen timed exercise mode, an AI step-by-step drawing guide, and a sketchbook of the user's own uploads.

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
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
DATABASE_URL=postgresql://character_forge:character_forge@localhost:5432/character_forge
```

## Database (PostgreSQL)

Docker Compose spins up a local Postgres 16 instance:

```bash
docker compose up -d   # start DB
docker compose down    # stop DB
```

Models live in `prisma/schema.prisma`: `Character` (with `tags String[]`), `Sketch` (many per character), `DrawingGuide` (at most one per character) and `DrawingStep` (ordered by `stepNumber`). Sketches and guides cascade-delete with their character. After changing the schema always run `npx prisma migrate dev`.

## Architecture

```
app/
  page.tsx                    # gallery: server-fetches all characters, GalleryGrid filters client-side
  characters/
    new/page.tsx              # 3-step creation wizard (client component)
    [id]/page.tsx             # detail page: profile, Drawing Guide section, My Sketches
    [id]/exercise/page.tsx    # duration picker + fullscreen timed exercise
  api/
    generate/
      profile/route.ts        # POST → Claude generates GeneratedProfile JSON (incl. tags)
      image/route.ts          # POST → Gemini image. Portrait mode {profile, style, pose?, artists?}
                              #   or guide mode {characterId, slot: "step-<n>"|"overlay", prompt}
      guide/route.ts          # POST → Claude returns GuidePlan (steps + proportion system), no images
      random/route.ts         # POST → Claude invents a random concept
    characters/
      route.ts                # GET (list) / POST (save) characters
      [id]/route.ts           # GET (with sketches + guide) / DELETE (rows + files) / PATCH
      [id]/guide/route.ts     # POST save finished guide / DELETE guide (for regenerate)
      [id]/sketches/route.ts  # GET list / POST multipart upload (file, note)
    sketches/[id]/route.ts    # DELETE one sketch

components/
  chip.tsx                    # toggle pill button (purple filled when active); use for all chips
  creator/                    # wizard steps + step indicator
  gallery/                    # GalleryGrid (tag pills + search), empty state
  exercise/                   # ExerciseMode + useCountdown
  guide/                      # GuideProvider (state), GuideDrawer, GuideSection/GuideButton
  sketchbook/                 # Sketchbook (upload dialog, grid, lightbox)
  ui/                         # shadcn/ui primitives

lib/
  anthropic.ts                # generateCharacterProfile(), generateDrawingGuide(), generateRandomConcept()
  gemini.ts                   # generateCharacterImage(), generateGuideImage(), buildPortraitPrompt()
  db.ts                       # Prisma client singleton
  storage.ts                  # saveImage(), saveSketch() (sharp resize), saveGuideImage(), deletes
  characters.ts               # deleteCharacterWithFiles()
  guide.ts                    # parseGuidePlan() (Claude output), parseGuideSave() (client payload)
  tags.ts / artists.ts / poses.ts / proportions.ts / timer.ts   # pure helpers
  json.ts                     # parseModelJson(): tolerant JSON extraction from Claude replies
  http.ts / api-client.ts     # server route helpers / browser fetch helpers

types/
  character.ts                # CharacterFormData, GeneratedProfile, Character, Sketch, DrawingGuide, GuidePlan…

tests/                        # Vitest: tests/api/* (routes, Prisma + AI mocked), tests/lib/*
```

## Key data flow

1. User fills wizard (Step 1 → Step 2 → Generate).
2. `app/characters/new/page.tsx` hits `/api/generate/profile`; Claude returns `GeneratedProfile` JSON with 3–5 tags ordered archetype, style, difficulty (normalised by `normalizeTags`).
3. Then it hits `/api/generate/image` with the profile + style + optional pose and artist names.
4. `lib/gemini.ts` builds the image prompt (`Artistic inspiration: in the style of …` when artists are supplied, `Pose: …` when a pose is chosen) and calls Gemini.
5. The image buffer is saved to `public/uploads/<cuid>.png` (served at `/uploads/...`).
6. Regenerate re-runs both calls; Save POSTs to `/api/characters` and opens the detail page.

### Drawing guide

1. The drawer's setup panel POSTs `/api/generate/guide` `{characterId, stepCount 2–8, includeOverlay}` (409 if a guide exists).
2. Claude returns steps (`title`, `instructions`, `imagePrompt`) and picks a proportion system (realistic 7.5 heads / manga 8–9 / chibi 2–3) from the style; `parseGuidePlan` validates it and falls back to a style default.
3. The client fires one `/api/generate/image` guide-mode call per step (plus `overlay`) in parallel. The server attaches the portrait as a reference image and always appends the instructional-diagram style. Files go to `public/uploads/guides/<characterId>/<slot>.png?v=<ts>` (the `?v=` busts caches after regeneration, so guide images use plain `<img>`).
4. Steps render as their images land; failed images get a Retry button. Only when every image succeeds does the client POST `/api/characters/[id]/guide`, which validates that paths point into that character's guide folder.
5. Regenerate Guide = DELETE the guide (rows + folder), then the setup panel again.

### Sketches

`POST /api/characters/[id]/sketches` (multipart `file`, `note`) → `saveSketch()` resizes with sharp to 2048px on the longest side (never enlarging, EXIF-rotated, JPEG/WebP/PNG kept at high quality, other formats → PNG) into `public/uploads/sketches/`.

## Ephemeral pose and artist fields

`pose?: string` and `artists?: string[]` in `CharacterFormData` are never stored in the database and never sent to Claude. They are forwarded from the form → image API route → `generateCharacterImage()` and injected into the Gemini prompt only when set. Artists come from the free-text input or the `ARTIST_PRESETS` chips; `addArtists()` drops blanks and case-insensitive duplicates. `POST /api/characters` only persists known fields, so these are dropped even if sent.

## Coding conventions

- All API routes use the Next.js App Router (`route.ts`).
- Client components are marked with `"use client"` at the top.
- shadcn/ui components live in `components/ui/`; never modify them directly — use the `shadcn` CLI to add new ones. (If the registry at ui.shadcn.com is unreachable, compose from the `radix-ui` package outside `components/ui/` instead, as `components/guide/guide-drawer.tsx` does.)
- Prisma client is imported from `@/lib/db` (singleton pattern).
- Uploaded and generated images live in `public/uploads/` (git-ignored) and are served at `/uploads/...`; the folders are created on first write. `next.config.ts` allows `/uploads/**` for `next/image`.
- API routes return `{ error }` with 400/404/409 for bad input and 502 when Claude or Gemini fails (`lib/http.ts`); the client surfaces these with `sonner` toasts or inline retry states.
- Tests come first: add or update the Vitest suite in `tests/` before changing an API route. Route tests mock `@/lib/db` with `createPrismaMock()` from `tests/helpers.ts`.
