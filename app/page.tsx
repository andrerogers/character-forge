import Link from "next/link"
import { Suspense } from "react"
import { prisma } from "@/lib/db"
import { CharacterCard } from "@/components/character-card"
import { FilterBar } from "@/components/gallery/filter-bar"
import { EmptyState } from "@/components/gallery/empty-state"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { RandomButton } from "@/components/random-button"
import { Character } from "@/types/character"

interface PageProps {
  searchParams: Promise<{ style?: string; q?: string }>
}

async function CharacterGrid({ style, q }: { style?: string; q?: string }) {
  const characters = await prisma.character.findMany({
    where: {
      ...(style ? { style } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { tagline: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  if (characters.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {characters.map((c) => (
        <CharacterCard key={c.id} character={c as unknown as Character} />
      ))}
    </div>
  )
}

export default async function GalleryPage({ searchParams }: PageProps) {
  const { style, q } = await searchParams

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-background/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Character<span className="text-primary">Forge</span>
            </h1>
            <p className="text-xs text-muted-foreground">AI Character Creator</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <RandomButton />
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/characters/new">+ New Character</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Suspense fallback={null}>
          <FilterBar />
        </Suspense>
        <Suspense
          fallback={
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl bg-card animate-pulse"
                />
              ))}
            </div>
          }
        >
          <CharacterGrid style={style} q={q} />
        </Suspense>
      </main>
    </div>
  )
}
