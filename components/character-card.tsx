import Link from "next/link"
import Image from "next/image"
import { Character } from "@/types/character"
import { Badge } from "@/components/ui/badge"

interface CharacterCardProps {
  character: Character
}

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <Link href={`/characters/${character.id}`} className="group block">
      <div className="rounded-xl overflow-hidden bg-card border border-border transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
        <div className="relative aspect-[3/4] bg-muted">
          {character.imagePath ? (
            <Image
              src={character.imagePath}
              alt={character.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
          {character.tagline && (
            <p className="text-xs text-muted-foreground line-clamp-2 italic">
              &ldquo;{character.tagline}&rdquo;
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
