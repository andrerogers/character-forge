import { describe, it, expect, vi } from "vitest"

const generateContent = vi.hoisted(() => vi.fn())
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent }
  },
}))

import { generateImage } from "@/lib/media/gemini"

const imageResponse = {
  candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from("png").toString("base64") } }] } }],
}

describe("Gemini generateImage", () => {
  it("sends a plain prompt and returns the image bytes", async () => {
    generateContent.mockResolvedValue(imageResponse)
    const out = await generateImage("gemini-2.5-flash-image", { prompt: "a ronin" })
    expect(out.toString()).toBe("png")
    expect(generateContent).toHaveBeenCalledWith({ model: "gemini-2.5-flash-image", contents: "a ronin" })
  })

  it("attaches a reference image as inline data", async () => {
    generateContent.mockResolvedValue(imageResponse)
    await generateImage("gemini-2.5-flash-image", { prompt: "diagram", reference: Buffer.from("ref") })
    const parts = generateContent.mock.calls[0][0].contents[0].parts
    expect(parts[0]).toEqual({ text: "diagram" })
    expect(parts[1].inlineData).toEqual({ mimeType: "image/png", data: Buffer.from("ref").toString("base64") })
  })

  it("throws when no image comes back", async () => {
    generateContent.mockResolvedValue({ candidates: [{ content: { parts: [{ text: "sorry" }] } }] })
    await expect(generateImage("gemini-2.5-flash-image", { prompt: "p" })).rejects.toThrow(/No image/)
  })
})
