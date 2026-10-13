export const ARTIST_PRESETS = [
  "Moebius",
  "Akira Toriyama",
  "Jack Kirby",
  "Yusuke Murata",
  "Frank Miller",
  "Naoki Urasawa",
]

// Returns a new list with the incoming names appended, skipping blanks and
// case-insensitive duplicates.
export function addArtists(current: string[], ...incoming: string[]): string[] {
  const result = [...current]
  const seen = new Set(current.map((a) => a.toLowerCase()))
  for (const name of incoming) {
    const trimmed = name.trim()
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue
    seen.add(trimmed.toLowerCase())
    result.push(trimmed)
  }
  return result
}
