import { describe, it, expect, vi, beforeEach } from "vitest"
import { jsonRequest, sampleCharacter, type PrismaMock } from "../helpers"

vi.mock("@/lib/db", async () => {
  const { createPrismaMock } = await import("../helpers")
  return { prisma: createPrismaMock() }
})
vi.mock("@/lib/anthropic", () => ({
  generateCharacterProfile: vi.fn(),
  generateDrawingGuide: vi.fn(),
  generateRandomConcept: vi.fn(),
}))
vi.mock("@/lib/artwork", () => ({
  generateCharacterImage: vi.fn(),
  generateGuideImage: vi.fn(),
}))
vi.mock("@/lib/storage", () => ({
  saveImage: vi.fn(),
  saveGuideImage: vi.fn(),
  readPublicFile: vi.fn(),
}))

import { prisma } from "@/lib/db"
import { generateCharacterProfile, generateDrawingGuide, generateRandomConcept } from "@/lib/anthropic"
import { generateCharacterImage, generateGuideImage } from "@/lib/artwork"
import { saveImage, saveGuideImage, readPublicFile } from "@/lib/storage"
import { POST as profileRoute } from "@/app/api/generate/profile/route"
import { POST as imageRoute } from "@/app/api/generate/image/route"
import { POST as guideRoute } from "@/app/api/generate/guide/route"
import { POST as randomRoute } from "@/app/api/generate/random/route"

const db = prisma as unknown as PrismaMock

const GEMINI = { provider: "gemini", model: "gemini-2.5-flash-image" }

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "g")
  vi.stubEnv("OPENROUTER_API_KEY", "o")
  vi.stubEnv("HIGGSFIELD_API_KEY", "")
  vi.stubEnv("IMAGE_PROVIDER", "")
})

describe("POST /api/generate/profile", () => {
  const form = { concept: "A ronin", style: "Manga", moods: [] }

  it("returns the generated profile including tags", async () => {
    const profile = { name: "Kaida", tags: ["Ronin", "Manga", "Beginner"] }
    vi.mocked(generateCharacterProfile).mockResolvedValue(profile as never)
    const res = await profileRoute(jsonRequest("/api/generate/profile", "POST", form))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(profile)
  })

  it("400s without concept or style", async () => {
    const res = await profileRoute(jsonRequest("/api/generate/profile", "POST", { concept: "x" }))
    expect(res.status).toBe(400)
  })

  it("502s with a message when Claude fails", async () => {
    vi.mocked(generateCharacterProfile).mockRejectedValue(new Error("overloaded"))
    const res = await profileRoute(jsonRequest("/api/generate/profile", "POST", form))
    expect(res.status).toBe(502)
    expect((await res.json()).error).toMatch(/profile/i)
  })
})

describe("POST /api/generate/image (portrait)", () => {
  const profile = { name: "Kaida", description: "d", colorPalette: [] }

  it("generates, saves and returns the portrait path, forwarding pose and artists", async () => {
    vi.mocked(generateCharacterImage).mockResolvedValue(Buffer.from("img"))
    vi.mocked(saveImage).mockResolvedValue("/uploads/abc.png")
    const res = await imageRoute(
      jsonRequest("/api/generate/image", "POST", {
        profile,
        style: "Manga",
        pose: "Profile",
        artists: ["Moebius"],
      })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ imagePath: "/uploads/abc.png", imageSource: "gemini:gemini-2.5-flash-image" })
    expect(generateCharacterImage).toHaveBeenCalledWith(profile, "Manga", {
      pose: "Profile",
      artists: ["Moebius"],
      engine: GEMINI,
    })
  })

  it("uses the requested engine and reports which one made the image", async () => {
    vi.mocked(generateCharacterImage).mockResolvedValue(Buffer.from("img"))
    vi.mocked(saveImage).mockResolvedValue("/uploads/abc.png")
    const engine = { provider: "openrouter", model: "black-forest-labs/flux.2-pro" }
    const res = await imageRoute(
      jsonRequest("/api/generate/image", "POST", { profile, style: "Manga", engine })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      imagePath: "/uploads/abc.png",
      imageSource: "openrouter:black-forest-labs/flux.2-pro",
    })
    expect(vi.mocked(generateCharacterImage).mock.calls[0][2]).toMatchObject({ engine })
  })

  it("400s for an engine that isn't configured or valid", async () => {
    for (const engine of [
      { provider: "higgsfield", model: "z-image/turbo" },
      { provider: "openrouter", model: "not a model" },
      "gemini",
    ]) {
      const res = await imageRoute(jsonRequest("/api/generate/image", "POST", { profile, style: "Manga", engine }))
      expect(res.status).toBe(400)
    }
    expect(generateCharacterImage).not.toHaveBeenCalled()
  })

  it("400s without profile or style", async () => {
    const res = await imageRoute(jsonRequest("/api/generate/image", "POST", { style: "Manga" }))
    expect(res.status).toBe(400)
  })

  it("502s when Gemini fails", async () => {
    vi.mocked(generateCharacterImage).mockRejectedValue(new Error("quota"))
    const res = await imageRoute(jsonRequest("/api/generate/image", "POST", { profile, style: "Manga" }))
    expect(res.status).toBe(502)
  })
})

describe("POST /api/generate/image (guide)", () => {
  const body = { characterId: "char1", slot: "step-2", prompt: "gesture diagram" }

  it("generates a guide image using the portrait as reference", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(readPublicFile).mockResolvedValue(Buffer.from("portrait"))
    vi.mocked(generateGuideImage).mockResolvedValue(Buffer.from("img"))
    vi.mocked(saveGuideImage).mockResolvedValue("/uploads/guides/char1/step-2.png?v=1")

    const res = await imageRoute(jsonRequest("/api/generate/image", "POST", body))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      imagePath: "/uploads/guides/char1/step-2.png?v=1",
      imageSource: "gemini:gemini-2.5-flash-image",
    })
    expect(readPublicFile).toHaveBeenCalledWith("/uploads/char1.png")
    expect(generateGuideImage).toHaveBeenCalledWith("gesture diagram", Buffer.from("portrait"), GEMINI)
    expect(saveGuideImage).toHaveBeenCalledWith(Buffer.from("img"), "char1", "step-2")
  })

  it("still works when the portrait file is missing", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(readPublicFile).mockResolvedValue(null)
    vi.mocked(generateGuideImage).mockResolvedValue(Buffer.from("img"))
    vi.mocked(saveGuideImage).mockResolvedValue("/p")
    const res = await imageRoute(jsonRequest("/api/generate/image", "POST", body))
    expect(res.status).toBe(200)
    expect(generateGuideImage).toHaveBeenCalledWith("gesture diagram", null, GEMINI)
  })

  it("generates guide images with the requested engine", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(readPublicFile).mockResolvedValue(null)
    vi.mocked(generateGuideImage).mockResolvedValue(Buffer.from("img"))
    vi.mocked(saveGuideImage).mockResolvedValue("/p")
    const engine = { provider: "openrouter", model: "openai/gpt-5.4-image-2" }
    await imageRoute(jsonRequest("/api/generate/image", "POST", { ...body, engine }))
    expect(generateGuideImage).toHaveBeenCalledWith("gesture diagram", null, engine)
  })

  it("400s for an invalid slot", async () => {
    for (const slot of ["step-0", "step-9", "../x", "cover"]) {
      const res = await imageRoute(jsonRequest("/api/generate/image", "POST", { ...body, slot }))
      expect(res.status).toBe(400)
    }
  })

  it("400s without a prompt", async () => {
    const res = await imageRoute(jsonRequest("/api/generate/image", "POST", { ...body, prompt: " " }))
    expect(res.status).toBe(400)
  })

  it("404s for an unknown character", async () => {
    db.character.findUnique.mockResolvedValue(null)
    const res = await imageRoute(jsonRequest("/api/generate/image", "POST", body))
    expect(res.status).toBe(404)
  })

  it("502s when Gemini fails", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(readPublicFile).mockResolvedValue(null)
    vi.mocked(generateGuideImage).mockRejectedValue(new Error("boom"))
    const res = await imageRoute(jsonRequest("/api/generate/image", "POST", body))
    expect(res.status).toBe(502)
  })
})

describe("POST /api/generate/guide", () => {
  const plan = {
    steps: [{ stepNumber: 1, title: "t", instructions: "i", imagePrompt: "p" }],
    proportionSystem: "manga",
  }

  it("returns Claude's step plan for the character", async () => {
    db.character.findUnique.mockResolvedValue({ ...sampleCharacter, guide: null })
    vi.mocked(generateDrawingGuide).mockResolvedValue(plan as never)
    const res = await guideRoute(
      jsonRequest("/api/generate/guide", "POST", { characterId: "char1", stepCount: 4, includeOverlay: true })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(plan)
    expect(generateDrawingGuide).toHaveBeenCalledWith(
      expect.objectContaining({ id: "char1" }),
      { stepCount: 4, includeOverlay: true }
    )
  })

  it("defaults to 4 steps without an overlay", async () => {
    db.character.findUnique.mockResolvedValue({ ...sampleCharacter, guide: null })
    vi.mocked(generateDrawingGuide).mockResolvedValue(plan as never)
    await guideRoute(jsonRequest("/api/generate/guide", "POST", { characterId: "char1" }))
    expect(generateDrawingGuide).toHaveBeenCalledWith(expect.anything(), {
      stepCount: 4,
      includeOverlay: false,
    })
  })

  it("400s for step counts outside 2–8", async () => {
    for (const stepCount of [1, 9, 3.5, "4"]) {
      const res = await guideRoute(
        jsonRequest("/api/generate/guide", "POST", { characterId: "char1", stepCount })
      )
      expect(res.status).toBe(400)
    }
  })

  it("404s for an unknown character", async () => {
    db.character.findUnique.mockResolvedValue(null)
    const res = await guideRoute(jsonRequest("/api/generate/guide", "POST", { characterId: "x" }))
    expect(res.status).toBe(404)
  })

  it("409s when a guide already exists", async () => {
    db.character.findUnique.mockResolvedValue({ ...sampleCharacter, guide: { id: "g1" } })
    const res = await guideRoute(jsonRequest("/api/generate/guide", "POST", { characterId: "char1" }))
    expect(res.status).toBe(409)
    expect(generateDrawingGuide).not.toHaveBeenCalled()
  })

  it("502s when Claude fails", async () => {
    db.character.findUnique.mockResolvedValue({ ...sampleCharacter, guide: null })
    vi.mocked(generateDrawingGuide).mockRejectedValue(new Error("bad json"))
    const res = await guideRoute(jsonRequest("/api/generate/guide", "POST", { characterId: "char1" }))
    expect(res.status).toBe(502)
  })
})

describe("POST /api/generate/random", () => {
  it("returns a random concept", async () => {
    const concept = { concept: "A golem florist", style: "Comic", moods: [] }
    vi.mocked(generateRandomConcept).mockResolvedValue(concept as never)
    const res = await randomRoute()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(concept)
  })

  it("502s when Claude fails", async () => {
    vi.mocked(generateRandomConcept).mockRejectedValue(new Error("x"))
    const res = await randomRoute()
    expect(res.status).toBe(502)
  })
})
