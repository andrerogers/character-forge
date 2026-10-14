import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mkdtemp, rm, readFile, stat, readdir } from "fs/promises"
import { tmpdir } from "os"
import path from "path"
import sharp from "sharp"
import {
  saveImage,
  deleteImage,
  saveSketch,
  saveGuideImage,
  deleteGuideImages,
} from "@/lib/storage"

let root: string

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "cf-storage-"))
  vi.spyOn(process, "cwd").mockReturnValue(root)
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const onDisk = (publicPath: string) =>
  path.join(root, "public", publicPath.split("?")[0])

async function makeImage(width: number, height: number, format: "png" | "jpeg" | "webp") {
  return sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 40, b: 200 } },
  })
    .toFormat(format)
    .toBuffer()
}

describe("saveImage", () => {
  it("creates the uploads folder on first write", async () => {
    const p = await saveImage(Buffer.from("png"), "abc")
    expect(p).toBe("/uploads/abc.png")
    expect((await readFile(onDisk(p))).toString()).toBe("png")
  })
})

describe("deleteImage", () => {
  it("removes a file and ignores missing ones", async () => {
    const p = await saveImage(Buffer.from("x"), "gone")
    await deleteImage(p)
    await expect(stat(onDisk(p))).rejects.toThrow()
    await expect(deleteImage("/uploads/never.png")).resolves.toBeUndefined()
  })

  it("refuses paths outside the uploads folder", async () => {
    await expect(deleteImage("/../package.json")).resolves.toBeUndefined()
  })
})

describe("saveSketch", () => {
  it("resizes so the longest side is 2048px, preserving aspect ratio", async () => {
    const input = await makeImage(4096, 1024, "png")
    const p = await saveSketch(input, "image/png")
    expect(p).toMatch(/^\/uploads\/sketches\/[a-z0-9]+\.png$/)
    const meta = await sharp(await readFile(onDisk(p))).metadata()
    expect(meta.width).toBe(2048)
    expect(meta.height).toBe(512)
  })

  it("keeps the JPEG format", async () => {
    const input = await makeImage(1000, 3000, "jpeg")
    const p = await saveSketch(input, "image/jpeg")
    expect(p).toMatch(/\.jpg$/)
    const meta = await sharp(await readFile(onDisk(p))).metadata()
    expect(meta.format).toBe("jpeg")
    expect(meta.height).toBe(2048)
    expect(meta.width).toBe(683)
  })

  it("does not enlarge small images", async () => {
    const input = await makeImage(300, 200, "webp")
    const p = await saveSketch(input, "image/webp")
    const meta = await sharp(await readFile(onDisk(p))).metadata()
    expect(meta.width).toBe(300)
    expect(meta.height).toBe(200)
  })

  it("rejects data that is not an image", async () => {
    await expect(saveSketch(Buffer.from("not an image"), "image/png")).rejects.toThrow()
  })
})

describe("guide images", () => {
  it("saves step and overlay images under the character's guide folder", async () => {
    const step = await saveGuideImage(Buffer.from("s"), "char1", "step-2")
    const overlay = await saveGuideImage(Buffer.from("o"), "char1", "overlay")
    expect(step).toMatch(/^\/uploads\/guides\/char1\/step-2\.png\?v=\d+$/)
    expect(overlay).toMatch(/^\/uploads\/guides\/char1\/overlay\.png\?v=\d+$/)
    expect((await readFile(onDisk(step))).toString()).toBe("s")
  })

  it("rejects unsafe slot or character ids", async () => {
    await expect(saveGuideImage(Buffer.from("s"), "../x", "step-1")).rejects.toThrow()
    await expect(saveGuideImage(Buffer.from("s"), "char1", "../../evil")).rejects.toThrow()
  })

  it("deletes the whole guide folder", async () => {
    await saveGuideImage(Buffer.from("s"), "char1", "step-1")
    await deleteGuideImages("char1")
    const guides = await readdir(path.join(root, "public", "uploads", "guides"))
    expect(guides).toEqual([])
    await expect(deleteGuideImages("missing")).resolves.toBeUndefined()
  })
})
