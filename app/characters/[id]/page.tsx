import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Timer } from "lucide-react"
import { CharacterWithRelations } from "@/types/character"
import { deleteCharacterWithFiles } from "@/lib/characters"
import { GuideProvider } from "@/components/guide/guide-context"
import { GuideButton, GuideSection } from "@/components/guide/guide-section"
import { Sketchbook } from "@/components/sketchbook/sketchbook"
import { DeleteCharacterButton } from "@/components/delete-character-button"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CharacterDetailPage({ params }: PageProps) {
  const { id } = await params
  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      sketches: { orderBy: { createdAt: "desc" } },
      guide: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      videos: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!character) notFound()

  const c: CharacterWithRelations = character

  async function handleDelete() {
    "use server"
    await deleteCharacterWithFiles(id)
    redirect("/")
  }

  return (
    <GuideProvider characterId={c.id} characterName={c.name} initialGuide={c.guide}>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-background/90">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              ← Back to Gallery
            </Link>
            <DeleteCharacterButton name={c.name} action={handleDelete} />
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image panel */}
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-border aspect-[3/4] relative bg-card">
                {c.imagePath ? (
                  <Image
                    src={c.imagePath}
                    alt={c.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 512px"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-4xl text-primary/60">?</span>
                    </div>
                  </div>
                )}
              </div>

              {c.colorPalette.length > 0 && (
                <div className="rounded-xl border border-border p-4 bg-card">
                  <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">
                    Color Palette
                  </p>
                  <div className="flex gap-3">
                    {c.colorPalette.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div
                          className="w-10 h-10 rounded-lg border border-white/10 shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-muted-foreground font-mono">
                          {color}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info panel */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Badge
                    className="bg-primary/20 text-primary border-primary/30"
                  >
                    {c.style}
                  </Badge>
                  {c.age && (
                    <span className="text-sm text-muted-foreground">{c.age}</span>
                  )}
                </div>
                <h1 className="text-3xl font-bold text-foreground">{c.name}</h1>
                {c.tagline && (
                  <p className="text-primary italic mt-2">
                    &ldquo;{c.tagline}&rdquo;
                  </p>
                )}
                {c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {c.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {c.imagePath && (
                  <Button asChild variant="outline" className="border-border">
                    <Link href={`/characters/${c.id}/exercise`}>
                      <Timer className="w-4 h-4" />
                      Exercise Mode
                    </Link>
                  </Button>
                )}
                <GuideButton />
              </div>

              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  Description
                </p>
                <p className="text-foreground leading-relaxed">{c.description}</p>
              </div>

              {c.personality.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                    Personality
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {c.personality.map((trait) => (
                      <Badge
                        key={trait}
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {c.backstory && (
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium mb-2">
                    Backstory
                  </p>
                  <div className="space-y-3">
                    {c.backstory.split("\n\n").map((para, i) => (
                      <p key={i} className="text-foreground/90 leading-relaxed text-sm">
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Original concept:</span>{" "}
                  {c.concept}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {new Date(c.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 space-y-12">
            <GuideSection />
            <Sketchbook
              characterId={c.id}
              characterName={c.name}
              initialSketches={c.sketches}
            />
          </div>
        </main>
      </div>
    </GuideProvider>
  )
}
