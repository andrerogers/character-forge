import { describe, it, expect, vi, beforeEach } from "vitest"
import { jsonRequest, routeParams, sampleCharacter, sampleVideo, type PrismaMock } from "../helpers"

vi.mock("@/lib/db", async () => {
  const { createPrismaMock } = await import("../helpers")
  return { prisma: createPrismaMock() }
})
vi.mock("@/lib/media/video", async (orig) => {
  const actual = await orig<typeof import("@/lib/media/video")>()
  return {
    ...actual,
    findVideoModel: vi.fn(),
    estimateVideo: vi.fn(),
    submitVideo: vi.fn(),
  }
})
vi.mock("@/lib/storage", () => ({ readPublicFile: vi.fn(), deleteImage: vi.fn() }))
vi.mock("@/lib/videos", () => ({ refreshVideo: vi.fn() }))

import { prisma } from "@/lib/db"
import { findVideoModel, estimateVideo, submitVideo } from "@/lib/media/video"
import { readPublicFile, deleteImage } from "@/lib/storage"
import { refreshVideo } from "@/lib/videos"
import { POST as estimate } from "@/app/api/characters/[id]/videos/estimate/route"
import { GET as list, POST as create } from "@/app/api/characters/[id]/videos/route"
import { GET as getOne, DELETE as remove } from "@/app/api/videos/[id]/route"

const db = prisma as unknown as PrismaMock
const kling = { id: "kling", label: "Kling 3.0 Standard", durations: null, minSeconds: 3, supportsImage: true, supportsAudio: true }

beforeEach(() => {
  vi.stubEnv("HIGGSFIELD_API_KEY", "id:secret")
  vi.stubEnv("OPENROUTER_API_KEY", "")
  vi.stubEnv("VIDEO_PROVIDER", "")
  vi.mocked(findVideoModel).mockResolvedValue(kling)
})

const request = {
  engine: { provider: "higgsfield", model: "kling" },
  mode: "image",
  prompt: "breathes",
  durationSeconds: 5,
  sound: false,
}

describe("POST /api/characters/[id]/videos/estimate", () => {
  it("prices the request without making anything", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(readPublicFile).mockResolvedValue(Buffer.from("portrait"))
    vi.mocked(estimateVideo).mockResolvedValue({ usd: 0.21 })
    const res = await estimate(jsonRequest("/x", "POST", request), routeParams({ id: "char1" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ usd: 0.21 })
    expect(estimateVideo).toHaveBeenCalledWith(
      { provider: "higgsfield", model: "kling" },
      { prompt: "breathes", durationSeconds: 5, sound: false, image: Buffer.from("portrait") }
    )
    expect(submitVideo).not.toHaveBeenCalled()
  })

  it("400s for durations the model can't make and for >10s", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    for (const durationSeconds of [2, 11, 4.5]) {
      const res = await estimate(jsonRequest("/x", "POST", { ...request, durationSeconds }), routeParams({ id: "char1" }))
      expect(res.status).toBe(400)
    }
  })

  it("400s for image mode when the character has no portrait", async () => {
    db.character.findUnique.mockResolvedValue({ ...sampleCharacter, imagePath: null })
    const res = await estimate(jsonRequest("/x", "POST", request), routeParams({ id: "char1" }))
    expect(res.status).toBe(400)
  })

  it("400s for text mode without a prompt, and for unconfigured providers", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    let res = await estimate(jsonRequest("/x", "POST", { ...request, mode: "text", prompt: " " }), routeParams({ id: "char1" }))
    expect(res.status).toBe(400)
    res = await estimate(
      jsonRequest("/x", "POST", { ...request, engine: { provider: "openrouter", model: "google/veo-3.1" } }),
      routeParams({ id: "char1" })
    )
    expect(res.status).toBe(400)
  })

  it("404s for an unknown character", async () => {
    db.character.findUnique.mockResolvedValue(null)
    const res = await estimate(jsonRequest("/x", "POST", request), routeParams({ id: "x" }))
    expect(res.status).toBe(404)
  })

  it("502s when the provider fails", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(readPublicFile).mockResolvedValue(Buffer.from("p"))
    vi.mocked(estimateVideo).mockRejectedValue(Object.assign(new Error("x"), { status: 500 }))
    const res = await estimate(jsonRequest("/x", "POST", request), routeParams({ id: "char1" }))
    expect(res.status).toBe(502)
  })
})

describe("POST /api/characters/[id]/videos", () => {
  it("submits the job and records it as pending", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(readPublicFile).mockResolvedValue(Buffer.from("portrait"))
    vi.mocked(submitVideo).mockResolvedValue("job1")
    db.video.create.mockImplementation(async ({ data }) => ({ id: "vid1", ...data }))

    const res = await create(
      jsonRequest("/x", "POST", { ...request, estimatedCostUsd: 0.21 }),
      routeParams({ id: "char1" })
    )
    expect(res.status).toBe(201)
    expect(submitVideo).toHaveBeenCalledWith(
      { provider: "higgsfield", model: "kling" },
      { prompt: "breathes", durationSeconds: 5, sound: false, image: Buffer.from("portrait") }
    )
    expect(db.video.create).toHaveBeenCalledWith({
      data: {
        characterId: "char1",
        provider: "higgsfield",
        model: "kling",
        mode: "image",
        prompt: "breathes",
        durationSeconds: 5,
        sound: false,
        status: "pending",
        jobId: "job1",
        estimatedCostUsd: 0.21,
      },
    })
  })

  it("uses a default motion prompt when animating without one", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(readPublicFile).mockResolvedValue(Buffer.from("p"))
    vi.mocked(submitVideo).mockResolvedValue("job2")
    db.video.create.mockResolvedValue(sampleVideo)
    await create(jsonRequest("/x", "POST", { ...request, prompt: "" }), routeParams({ id: "char1" }))
    expect(vi.mocked(submitVideo).mock.calls[0][1].prompt).toMatch(/\S/)
  })

  it("sends no image for text-to-video", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(submitVideo).mockResolvedValue("job3")
    db.video.create.mockResolvedValue(sampleVideo)
    await create(jsonRequest("/x", "POST", { ...request, mode: "text" }), routeParams({ id: "char1" }))
    expect(vi.mocked(submitVideo).mock.calls[0][1].image).toBeNull()
    expect(readPublicFile).not.toHaveBeenCalled()
  })

  it("502s and records nothing when submission fails", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(readPublicFile).mockResolvedValue(Buffer.from("p"))
    vi.mocked(submitVideo).mockRejectedValue(new Error("quota"))
    const res = await create(jsonRequest("/x", "POST", request), routeParams({ id: "char1" }))
    expect(res.status).toBe(502)
    expect(db.video.create).not.toHaveBeenCalled()
  })
})

describe("GET /api/characters/[id]/videos", () => {
  it("lists videos newest first", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    db.video.findMany.mockResolvedValue([sampleVideo])
    const res = await list(jsonRequest("/x", "GET"), routeParams({ id: "char1" }))
    expect(res.status).toBe(200)
    expect(db.video.findMany).toHaveBeenCalledWith({ where: { characterId: "char1" }, orderBy: { createdAt: "desc" } })
  })
})

describe("/api/videos/[id]", () => {
  it("GET refreshes a video's status", async () => {
    db.video.findUnique.mockResolvedValue(sampleVideo)
    vi.mocked(refreshVideo).mockResolvedValue({ ...sampleVideo, status: "completed", videoPath: "/uploads/videos/vid1.mp4" })
    const res = await getOne(jsonRequest("/x", "GET"), routeParams({ id: "vid1" }))
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe("completed")
    expect(refreshVideo).toHaveBeenCalledWith(sampleVideo)
  })

  it("GET 404s for an unknown video", async () => {
    db.video.findUnique.mockResolvedValue(null)
    const res = await getOne(jsonRequest("/x", "GET"), routeParams({ id: "x" }))
    expect(res.status).toBe(404)
  })

  it("DELETE removes the row and file", async () => {
    db.video.findUnique.mockResolvedValue({ ...sampleVideo, videoPath: "/uploads/videos/vid1.mp4" })
    db.video.delete.mockResolvedValue({})
    const res = await remove(jsonRequest("/x", "DELETE"), routeParams({ id: "vid1" }))
    expect(res.status).toBe(204)
    expect(db.video.delete).toHaveBeenCalledWith({ where: { id: "vid1" } })
    expect(deleteImage).toHaveBeenCalledWith("/uploads/videos/vid1.mp4")
  })
})
