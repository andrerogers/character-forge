import { describe, it, expect } from "vitest"
import { addArtists, ARTIST_PRESETS } from "@/lib/artists"

describe("addArtists", () => {
  it("appends new trimmed names", () => {
    expect(addArtists(["Moebius"], "  Jack Kirby ")).toEqual(["Moebius", "Jack Kirby"])
  })

  it("ignores blanks and case-insensitive duplicates", () => {
    expect(addArtists(["Moebius"], "", "   ", "moebius", "MOEBIUS")).toEqual(["Moebius"])
  })

  it("dedupes within the incoming batch", () => {
    expect(addArtists([], "Frank Miller", "frank miller")).toEqual(["Frank Miller"])
  })

  it("does not mutate the input", () => {
    const current = ["Moebius"]
    addArtists(current, "Akira Toriyama")
    expect(current).toEqual(["Moebius"])
  })
})

describe("ARTIST_PRESETS", () => {
  it("contains the six curated artists", () => {
    expect(ARTIST_PRESETS).toEqual([
      "Moebius",
      "Akira Toriyama",
      "Jack Kirby",
      "Yusuke Murata",
      "Frank Miller",
      "Naoki Urasawa",
    ])
  })
})
