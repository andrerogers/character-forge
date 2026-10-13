import { describe, it, expect, vi } from "vitest"

const create = vi.hoisted(() => vi.fn())
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create }
  },
}))

import { generateCharacterProfile, generateDrawingGuide, generateRandomConcept } from "@/lib/anthropic"
import { sampleCharacter } from "../helpers"

const reply = (text: string) => ({ content: [{ type: "text", text }] })
const promptOf = () => create.mock.calls[0][0].messages[0].content as string

describe("generateCharacterProfile", () => {
  it("asks for tags and normalises them in the result", async () => {
    create.mockResolvedValue(
      reply(
        '```json\n{"name":"Kaida","description":"d","tagline":"t","personality":[],"backstory":"b","colorPalette":[],"tags":["Ronin","ronin","Manga","Intermediate"]}\n```'
      )
    )
    const profile = await generateCharacterProfile({ concept: "ronin", style: "Manga", moods: [] })
    expect(profile.tags).toEqual(["Ronin", "Manga", "Intermediate"])
    expect(promptOf()).toMatch(/"tags"/)
    expect(promptOf()).toMatch(/archetype/i)
    expect(promptOf()).toMatch(/difficulty/i)
  })

  it("never sends ephemeral pose or artists to Claude", async () => {
    create.mockResolvedValue(reply('{"name":"n","tags":[]}'))
    await generateCharacterProfile({
      concept: "ronin",
      style: "Manga",
      moods: [],
      pose: "Profile",
      artists: ["Moebius"],
    })
    expect(promptOf()).not.toMatch(/Moebius/)
  })
})

describe("generateDrawingGuide", () => {
  const steps = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      stepNumber: i + 1,
      title: `Step ${i + 1}`,
      instructions: "Draw.",
      imagePrompt: "diagram",
    }))

  it("requests the step count and instructional diagram style, returning a parsed plan", async () => {
    create.mockResolvedValue(
      reply(JSON.stringify({ proportionSystem: "manga", overlayPrompt: "lines", steps: steps(5) }))
    )
    const plan = await generateDrawingGuide(sampleCharacter, { stepCount: 5, includeOverlay: true })
    expect(plan.steps).toHaveLength(5)
    expect(plan.proportionSystem).toBe("manga")
    expect(plan.overlayPrompt).toBe("lines")
    const prompt = promptOf()
    expect(prompt).toMatch(/exactly 5 steps/i)
    expect(prompt).toMatch(/construction lines/i)
    expect(prompt).toMatch(/no shading or colou?r/i)
    expect(prompt).toMatch(/7\.5/)
    expect(prompt).toMatch(/8.9/)
    expect(prompt).toMatch(/2.3/)
  })

  it("does not ask for an overlay prompt when no overlay is wanted", async () => {
    create.mockResolvedValue(reply(JSON.stringify({ steps: steps(2) })))
    await generateDrawingGuide(sampleCharacter, { stepCount: 2, includeOverlay: false })
    expect(promptOf()).not.toMatch(/overlayPrompt/)
  })
})

describe("generateRandomConcept", () => {
  it("returns the parsed concept", async () => {
    create.mockResolvedValue(reply('{"concept":"c","style":"Comic","moods":["calm"]}'))
    expect(await generateRandomConcept()).toEqual({ concept: "c", style: "Comic", moods: ["calm"] })
  })
})
