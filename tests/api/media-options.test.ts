import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/media/catalogue", () => ({
  getImageModels: vi.fn(async (provider: string) => ({
    models: [{ id: `${provider}/model`, label: `${provider} model` }],
    live: provider !== "openrouter",
  })),
  getVideoModels: vi.fn(async (provider: string) => ({
    models: [{ id: `${provider}-video`, label: "v", durations: null, supportsImage: true, supportsAudio: false }],
    live: true,
  })),
}))

import { GET } from "@/app/api/media/options/route"

beforeEach(() => {
  for (const k of ["GEMINI_API_KEY", "OPENROUTER_API_KEY", "HIGGSFIELD_API_KEY", "IMAGE_PROVIDER", "IMAGE_MODEL", "VIDEO_PROVIDER", "VIDEO_MODEL"]) {
    vi.stubEnv(k, "")
  }
})

describe("GET /api/media/options", () => {
  it("lists only configured providers with their models and the defaults", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g")
    vi.stubEnv("OPENROUTER_API_KEY", "o")
    const body = await (await GET()).json()
    expect(body.image.providers.map((p: { id: string }) => p.id)).toEqual(["gemini", "openrouter"])
    expect(body.image.providers[1]).toMatchObject({ label: "OpenRouter", allowCustomModel: true, live: false })
    expect(body.image.default).toEqual({ provider: "gemini", model: "gemini-2.5-flash-image" })
    expect(body.video.providers.map((p: { id: string }) => p.id)).toEqual(["openrouter"])
    expect(body.video.default).toBeNull()
  })

  it("reports no video providers when none are configured", async () => {
    const body = await (await GET()).json()
    expect(body.video.providers).toEqual([])
  })
})
