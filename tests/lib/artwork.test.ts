import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/media/images", () => ({ generateImageWith: vi.fn() }))

import { generateImageWith } from "@/lib/media/images"
import { buildPortraitPrompt, generateCharacterImage, generateGuideImage } from "@/lib/artwork"

const profile = {
  name: "Kaida",
  description: "A wandering ronin.",
  tagline: "",
  personality: [],
  backstory: "",
  colorPalette: ["#111111", "#eeeeee"],
  tags: [],
}

const engine = { provider: "openrouter", model: "black-forest-labs/flux.2-pro" }

describe("buildPortraitPrompt", () => {
  it("includes the artist line only when artists are supplied", () => {
    expect(buildPortraitPrompt(profile, "Manga", {})).not.toMatch(/Artistic inspiration/)
    expect(buildPortraitPrompt(profile, "Manga", { artists: [] })).not.toMatch(/Artistic inspiration/)
    expect(buildPortraitPrompt(profile, "Manga", { artists: ["Moebius", "Jack Kirby"] })).toMatch(
      "Artistic inspiration: in the style of Moebius, Jack Kirby."
    )
  })

  it("injects the pose directive when a pose is chosen", () => {
    expect(buildPortraitPrompt(profile, "Manga", {})).not.toMatch(/Pose/)
    expect(buildPortraitPrompt(profile, "Manga", { pose: "3/4 View" })).toMatch(/Pose: .*three-quarter/i)
  })

  it("describes the character and palette", () => {
    const prompt = buildPortraitPrompt(profile, "Comic", {})
    expect(prompt).toMatch("Kaida")
    expect(prompt).toMatch("#111111, #eeeeee")
  })
})

describe("generateCharacterImage", () => {
  it("sends the portrait prompt to the chosen engine", async () => {
    vi.mocked(generateImageWith).mockResolvedValue(Buffer.from("img"))
    const out = await generateCharacterImage(profile, "Manga", { pose: "Profile", engine })
    expect(out.toString()).toBe("img")
    const [usedEngine, req] = vi.mocked(generateImageWith).mock.calls[0]
    expect(usedEngine).toEqual(engine)
    expect(req.prompt).toMatch(/Pose: side profile/)
    expect(req.reference).toBeUndefined()
  })
})

describe("generateGuideImage", () => {
  it("enforces the instructional diagram style and passes the reference portrait", async () => {
    vi.mocked(generateImageWith).mockResolvedValue(Buffer.from("img"))
    await generateGuideImage("Step 1: gesture", Buffer.from("ref"), engine)
    const [usedEngine, req] = vi.mocked(generateImageWith).mock.calls[0]
    expect(usedEngine).toEqual(engine)
    expect(req.prompt).toMatch("Step 1: gesture")
    expect(req.prompt).toMatch(/construction lines/i)
    expect(req.prompt).toMatch(/no shading or colou?r/i)
    expect(req.prompt).toMatch(/attached portrait/i)
    expect(req.reference?.toString()).toBe("ref")
  })

  it("omits the reference wording when there is no portrait", async () => {
    vi.mocked(generateImageWith).mockResolvedValue(Buffer.from("img"))
    await generateGuideImage("Step 1", null, engine)
    const [, req] = vi.mocked(generateImageWith).mock.calls[0]
    expect(req.prompt).not.toMatch(/attached portrait/i)
    expect(req.reference).toBeNull()
  })
})
