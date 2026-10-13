import { describe, it, expect, vi } from "vitest"

const generateContent = vi.hoisted(() => vi.fn())
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
}))

import { buildPortraitPrompt, generateGuideImage, generateCharacterImage } from "@/lib/gemini"

const profile = {
  name: "Kaida",
  description: "A wandering ronin.",
  tagline: "",
  personality: [],
  backstory: "",
  colorPalette: ["#111111", "#eeeeee"],
  tags: [],
}

const imageResponse = {
  candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from("png").toString("base64") } }] } }],
}

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
  it("returns the image bytes", async () => {
    generateContent.mockResolvedValue(imageResponse)
    expect((await generateCharacterImage(profile, "Manga")).toString()).toBe("png")
  })

  it("throws when no image comes back", async () => {
    generateContent.mockResolvedValue({ candidates: [{ content: { parts: [{ text: "sorry" }] } }] })
    await expect(generateCharacterImage(profile, "Manga")).rejects.toThrow()
  })
})

describe("generateGuideImage", () => {
  it("enforces the instructional diagram style and attaches the reference portrait", async () => {
    generateContent.mockResolvedValue(imageResponse)
    await generateGuideImage("Step 1: gesture", Buffer.from("ref"))
    const { contents } = generateContent.mock.calls[0][0]
    const parts = contents[0].parts
    expect(parts[0].text).toMatch("Step 1: gesture")
    expect(parts[0].text).toMatch(/construction lines/i)
    expect(parts[0].text).toMatch(/no shading or colou?r/i)
    expect(parts[1].inlineData).toEqual({ mimeType: "image/png", data: Buffer.from("ref").toString("base64") })
  })

  it("works without a reference image", async () => {
    generateContent.mockResolvedValue(imageResponse)
    await generateGuideImage("Step 1", null)
    const { contents } = generateContent.mock.calls[0][0]
    expect(contents[0].parts).toHaveLength(1)
  })
})
