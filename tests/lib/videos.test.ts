import { describe, it, expect, vi } from "vitest"
import { sampleVideo, type PrismaMock } from "../helpers"

vi.mock("@/lib/db", async () => {
  const { createPrismaMock } = await import("../helpers")
  return { prisma: createPrismaMock() }
})
vi.mock("@/lib/media/video", () => ({ getVideoStatus: vi.fn(), downloadVideo: vi.fn() }))
vi.mock("@/lib/storage", () => ({ saveVideo: vi.fn() }))

import { prisma } from "@/lib/db"
import { getVideoStatus, downloadVideo } from "@/lib/media/video"
import { saveVideo } from "@/lib/storage"
import { refreshVideo } from "@/lib/videos"

const db = prisma as unknown as PrismaMock
const engine = { provider: "higgsfield", model: "kling" }

describe("refreshVideo", () => {
  it("leaves finished videos alone", async () => {
    const done = { ...sampleVideo, status: "completed" }
    expect(await refreshVideo(done)).toBe(done)
    expect(getVideoStatus).not.toHaveBeenCalled()
  })

  it("returns pending videos unchanged while the provider is still working", async () => {
    vi.mocked(getVideoStatus).mockResolvedValue({ state: "pending" })
    expect(await refreshVideo(sampleVideo)).toEqual(sampleVideo)
    expect(getVideoStatus).toHaveBeenCalledWith(engine, "job1")
    expect(db.video.update).not.toHaveBeenCalled()
  })

  it("records provider failures", async () => {
    vi.mocked(getVideoStatus).mockResolvedValue({ state: "failed", error: "moderation" })
    db.video.update.mockImplementation(async ({ data }) => ({ ...sampleVideo, ...data }))
    const out = await refreshVideo(sampleVideo)
    expect(out.status).toBe("failed")
    expect(out.error).toBe("moderation")
  })

  it("claims, downloads and saves a completed video exactly once", async () => {
    vi.mocked(getVideoStatus).mockResolvedValue({ state: "completed", outputUrl: "https://cdn/v.mp4", costUsd: 0.2 })
    db.video.updateMany.mockResolvedValue({ count: 1 })
    vi.mocked(downloadVideo).mockResolvedValue(Buffer.from("mp4"))
    vi.mocked(saveVideo).mockResolvedValue("/uploads/videos/vid1.mp4")
    db.video.update.mockImplementation(async ({ data }) => ({ ...sampleVideo, ...data }))

    const out = await refreshVideo(sampleVideo)
    expect(db.video.updateMany).toHaveBeenCalledWith({
      where: { id: "vid1", status: "pending" },
      data: { status: "saving" },
    })
    expect(downloadVideo).toHaveBeenCalledWith(engine, "https://cdn/v.mp4")
    expect(saveVideo).toHaveBeenCalledWith(Buffer.from("mp4"), "vid1")
    expect(out).toMatchObject({ status: "completed", videoPath: "/uploads/videos/vid1.mp4", costUsd: 0.2 })
  })

  it("keeps the estimate as the cost when the provider reports none", async () => {
    vi.mocked(getVideoStatus).mockResolvedValue({ state: "completed", outputUrl: "u", costUsd: null })
    db.video.updateMany.mockResolvedValue({ count: 1 })
    vi.mocked(downloadVideo).mockResolvedValue(Buffer.from("mp4"))
    vi.mocked(saveVideo).mockResolvedValue("/p")
    db.video.update.mockImplementation(async ({ data }) => ({ ...sampleVideo, ...data }))
    expect((await refreshVideo(sampleVideo)).costUsd).toBeNull()
  })

  it("skips the download when another request already claimed it", async () => {
    vi.mocked(getVideoStatus).mockResolvedValue({ state: "completed", outputUrl: "u", costUsd: null })
    db.video.updateMany.mockResolvedValue({ count: 0 })
    db.video.findUnique.mockResolvedValue({ ...sampleVideo, status: "saving" })
    const out = await refreshVideo(sampleVideo)
    expect(downloadVideo).not.toHaveBeenCalled()
    expect(out.status).toBe("saving")
  })

  it("returns to pending if the download fails, so the next poll retries", async () => {
    vi.mocked(getVideoStatus).mockResolvedValue({ state: "completed", outputUrl: "u", costUsd: null })
    db.video.updateMany.mockResolvedValue({ count: 1 })
    vi.mocked(downloadVideo).mockRejectedValue(new Error("network"))
    db.video.update.mockImplementation(async ({ data }) => ({ ...sampleVideo, ...data }))
    const out = await refreshVideo(sampleVideo)
    expect(out.status).toBe("pending")
  })

  it("reclaims a video stuck in saving for more than five minutes", async () => {
    const stuck = { ...sampleVideo, status: "saving", updatedAt: new Date(Date.now() - 6 * 60_000) }
    db.video.update.mockImplementation(async ({ data }) => ({ ...stuck, ...data }))
    vi.mocked(getVideoStatus).mockResolvedValue({ state: "pending" })
    await refreshVideo(stuck)
    expect(db.video.update).toHaveBeenCalledWith({ where: { id: "vid1" }, data: { status: "pending" } })
  })

  it("survives a provider outage by returning the video unchanged", async () => {
    vi.mocked(getVideoStatus).mockRejectedValue(new Error("ECONNRESET"))
    expect(await refreshVideo(sampleVideo)).toEqual(sampleVideo)
  })
})
