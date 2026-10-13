import Link from "next/link"
import Image from "next/image"
import { Timer } from "lucide-react"
import { Character } from "@/types/character"
import { Badge } from "@/components/ui/badge"

interface CharacterCardProps {
  character: Character
}

export function CharacterCard({ character }: CharacterCardProps) {
  // Claude orders tags archetype-first
  const archetype = character.tags[0]

  return (
    <div className="group relative">
      <Link href={`/characters/${character.id}`} className="block">
        <div className="rounded-xl overflow-hidden bg-card border border-border transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 group-hover:-translate-y-1">
          <div className="relative aspect-[3/4] bg-muted">
            {character.imagePath ? (
              <Image
                src={character.imagePath}
                alt={character.name}
                fill
                className="object-cover"
                sizes="(max-width: 420px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-3xl text-primary/60">?</span>
                </div>
              </div>
            )}
            {character.colorPalette.length > 0 && (
              <div className="absolute bottom-2 left-2 flex gap-1">
                {character.colorPalette.slice(0, 5).map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border border-white/30 shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate text-sm">
                {character.name}
              </h3>
              <Badge variant="secondary" className="text-xs shrink-0 bg-primary/20 text-primary border-primary/30">
                {character.style}
              </Badge>
            </div>
            {archetype && (
              <Badge variant="outline" className="text-xs mb-1">
                {archetype}
              </Badge>
            )}
            {character.tagline && (
              <p className="text-xs text-muted-foreground line-clamp-2 italic">
                &ldquo;{character.tagline}&rdquo;
              </p>
            )}
          </div>
        </div>
      </Link>
      {character.imagePath && (
        <Link
          href={`/characters/${character.id}/exercise?from=gallery`}
          className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 group-hover:-translate-y-1 duration-200"
          aria-label={`Start a drawing exercise with ${character.name}`}
        >
          <Timer className="w-3.5 h-3.5" />
          Exercise
        </Link>
      )}
    </div>
  )
}
