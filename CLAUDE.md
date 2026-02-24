# CharacterForge — Claude Code Guide

## Repository

https://github.com/andrerogers/character-forge

## Project overview

CharacterForge is a Next.js 16 app that lets users build fictional characters through a 3-step wizard. Claude (Anthropic) generates the character profile (name, description, backstory, colour palette, personality traits) and Gemini (Google) generates the portrait image. Characters are persisted in PostgreSQL via Prisma and rendered in a gallery.

## Development commands

```bash
npm run dev       # start Next.js dev server (Turbopack)
npm run build     # production build
npm run start     # run production build
npx prisma migrate dev   # apply schema changes and regenerate client
npx prisma studio        # open Prisma visual DB browser
```

## Environment variables

Create a `.env.local` file at the project root:

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

The `Character` model lives in `prisma/schema.prisma`. After changing the schema always run `npx prisma migrate dev`.

## Architecture

```
app/
  page.tsx                    # gallery — lists all saved characters
  characters/
    new/page.tsx              # 3-step creation wizard (client component)
    [id]/page.tsx             # individual character detail page
  api/
    generate/
      profile/route.ts        # POST → Claude generates CharacterProfile JSON
      image/route.ts          # POST → Gemini generates portrait image, saves to disk
    characters/
      route.ts                # GET (list) / POST (save) characters
      [id]/route.ts           # GET / DELETE individual character

components/
  creator/
    step-one.tsx              # concept + art style
    step-two.tsx              # name, age, moods, colour palette, artist inspiration
    step-three.tsx            # loading / result display
    step-indicator.tsx        # progress dots
  gallery/                    # gallery grid components
  ui/                         # shadcn/ui primitives

lib/
  anthropic.ts                # generateCharacterProfile() — calls Claude claude-sonnet-4-6
  gemini.ts                   # generateCharacterImage()   — calls gemini-2.5-flash-image
  db.ts                       # Prisma client singleton
  storage.ts                  # saves/reads image buffers to /images on disk

types/
  character.ts                # CharacterFormData, GeneratedProfile, Character interfaces
```

## Key data flow

1. User fills wizard (Step 1 → Step 2 → Generate).
2. `app/characters/new/page.tsx` hits `/api/generate/profile` — Claude returns `GeneratedProfile` JSON.
3. Immediately after, it hits `/api/generate/image` with the profile + style + optional artist names.
4. `lib/gemini.ts` builds the image prompt (injects `Artistic inspiration: in the style of …` when artists are supplied) and calls Gemini.
5. The image buffer is saved to `images/<cuid>.png` by `lib/storage.ts`.
6. User can save the character — the wizard calls `/api/characters` (POST) which stores everything in Postgres.

## Artist inspiration field

`artists?: string[]` in `CharacterFormData` is ephemeral — it is never stored in the database. It is forwarded from the form → image API route → `generateCharacterImage()` and injected into the Gemini prompt only when non-empty. Duplicate and blank entries are filtered in `StepTwo` before the array is updated.

## Coding conventions

- All API routes use the Next.js App Router (`route.ts`).
- Client components are marked with `"use client"` at the top.
- shadcn/ui components live in `components/ui/`; never modify them directly — use the `shadcn` CLI to add new ones.
- Prisma client is imported from `@/lib/db` (singleton pattern).
- Images are served from the `images/` directory mounted as a static path in `next.config.ts`.
