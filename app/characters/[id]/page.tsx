import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Character } from "@/types/character"
import { deleteImage } from "@/lib/storage"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CharacterDetailPage({ params }: PageProps) {
  const { id } = await params
  const character = await prisma.character.findUnique({ where: { id } })

  if (!character) notFound()

  const c = character as unknown as Character

  async function handleDelete() {
    "use server"
    const char = await prisma.character.findUnique({ where: { id } })
    if (char?.imagePath) await deleteImage(char.imagePath)
    await prisma.character.delete({ where: { id } })
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-background/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            ← Back to Gallery
          </Link>
          <form action={handleDelete}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              Delete
            </Button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
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
      </main>
    </div>
  )
}
