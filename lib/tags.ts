const MAX_TAGS = 5

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const tag of tags) {
    if (typeof tag !== "string") continue
    const trimmed = tag.trim()
    const key = trimmed.toLowerCase()
    if (!trimmed || seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
    if (result.length === MAX_TAGS) break
  }
  return result
}

// Unique tags across all characters, most common first. Tags differing only
// by case are merged under the first spelling seen.
export function collectTags(characters: { tags: string[] }[]): string[] {
  const counts = new Map<string, { label: string; count: number }>()
  for (const { tags } of characters) {
    for (const tag of tags) {
      const key = tag.toLowerCase()
      const entry = counts.get(key)
      if (entry) entry.count++
      else counts.set(key, { label: tag, count: 1 })
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((e) => e.label)
}

interface Filterable {
  name: string
  description: string
  tagline: string | null
  tags: string[]
}

export function filterCharacters<T extends Filterable>(
  characters: T[],
  { tag, query }: { tag?: string; query?: string }
): T[] {
  const tagKey = tag?.toLowerCase()
  const q = query?.trim().toLowerCase()
  return characters.filter((c) => {
    if (tagKey && !c.tags.some((t) => t.toLowerCase() === tagKey)) return false
    if (q) {
      const haystack = [c.name, c.description, c.tagline ?? ""].join(" ").toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
