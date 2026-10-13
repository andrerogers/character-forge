"use client"

import { useMemo, useState } from "react"
import { Chip } from "@/components/chip"
import { Input } from "@/components/ui/input"
import { CharacterCard } from "@/components/character-card"
import { collectTags, filterCharacters } from "@/lib/tags"
import { Character } from "@/types/character"

// Tag pills + search over the full character set, filtered client-side.
export function GalleryGrid({ characters }: { characters: Character[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const tags = useMemo(() => collectTags(characters), [characters])
  const visible = useMemo(
    () => filterCharacters(characters, { tag: activeTag ?? undefined, query }),
    [characters, activeTag, query]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by tag">
          <Chip active={activeTag === null} onClick={() => setActiveTag(null)}>
            All
          </Chip>
          {tags.map((tag) => (
            <Chip
              key={tag}
              active={activeTag?.toLowerCase() === tag.toLowerCase()}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </Chip>
          ))}
        </div>
        <Input
          type="search"
          placeholder="Search characters..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:w-56 bg-card border-border"
          aria-label="Search characters"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">
          No characters match this filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {visible.map((c) => (
            <CharacterCard key={c.id} character={c} />
          ))}
        </div>
      )}
    </div>
  )
}
