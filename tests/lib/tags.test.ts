import { describe, it, expect } from "vitest"
import { normalizeTags, collectTags, filterCharacters } from "@/lib/tags"

describe("normalizeTags", () => {
  it("trims, drops blanks and case-insensitive duplicates, keeps order", () => {
    expect(normalizeTags([" Ronin ", "", "manga", "ronin", "Manga", "Beginner"])).toEqual([
      "Ronin",
      "manga",
      "Beginner",
    ])
  })

  it("caps at 5 tags", () => {
    expect(normalizeTags(["a", "b", "c", "d", "e", "f"])).toHaveLength(5)
  })

  it("returns [] for non-arrays and ignores non-strings", () => {
    expect(normalizeTags(undefined)).toEqual([])
    expect(normalizeTags("Ronin")).toEqual([])
    expect(normalizeTags(["Ronin", 3, null])).toEqual(["Ronin"])
  })
})

describe("collectTags", () => {
  it("returns unique tags ordered by frequency then alphabetically", () => {
    const chars = [
      { tags: ["Warrior", "Manga"] },
      { tags: ["Mage", "Manga"] },
      { tags: ["Warrior", "Comic"] },
      { tags: [] },
    ]
    expect(collectTags(chars)).toEqual(["Manga", "Warrior", "Comic", "Mage"])
  })

  it("merges tags that differ only by case under the first spelling", () => {
    expect(collectTags([{ tags: ["Manga"] }, { tags: ["manga"] }])).toEqual(["Manga"])
  })
})

describe("filterCharacters", () => {
  const chars = [
    { name: "Kaida", description: "ronin", tagline: null, tags: ["Warrior"] },
    { name: "Vex", description: "hacker elf", tagline: "Zero days", tags: ["Rogue", "warrior"] },
    { name: "Mira", description: "healer", tagline: null, tags: ["Mage"] },
  ]

  it("returns everything with no tag and no query", () => {
    expect(filterCharacters(chars, {})).toHaveLength(3)
  })

  it("filters by tag case-insensitively", () => {
    expect(filterCharacters(chars, { tag: "Warrior" }).map((c) => c.name)).toEqual(["Kaida", "Vex"])
  })

  it("filters by query across name, description and tagline", () => {
    expect(filterCharacters(chars, { query: "zero" }).map((c) => c.name)).toEqual(["Vex"])
    expect(filterCharacters(chars, { query: "HEAL" }).map((c) => c.name)).toEqual(["Mira"])
  })

  it("combines tag and query", () => {
    expect(filterCharacters(chars, { tag: "warrior", query: "elf" }).map((c) => c.name)).toEqual(["Vex"])
  })
})
