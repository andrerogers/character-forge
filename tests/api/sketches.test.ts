import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"
import { jsonRequest, routeParams, sampleCharacter, type PrismaMock } from "../helpers"

vi.mock("@/lib/db", async () => {
  const { createPrismaMock } = await import("../helpers")
  return { prisma: createPrismaMock() }
})
vi.mock("@/lib/storage", () => ({ saveSketch: vi.fn(), deleteImage: vi.fn() }))

import { prisma } from "@/lib/db"
import { saveSketch, deleteImage } from "@/lib/storage"
import { GET as list, POST as upload } from "@/app/api/characters/[id]/sketches/route"
import { DELETE as remove } from "@/app/api/sketches/[id]/route"

const db = prisma as unknown as PrismaMock

function uploadRequest(file?: File, note?: string) {
  const form = new FormData()
  if (file) form.append("file", file)
  if (note !== undefined) form.append("note", note)
  return new NextRequest("http://localhost/api/characters/char1/sketches", {
    method: "POST",
    body: form,
  })
}

const png = () => new File([new Uint8Array([1, 2, 3])], "sketch.png", { type: "image/png" })

describe("GET /api/characters/[id]/sketches", () => {
  it("lists a character's sketches newest first", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    db.sketch.findMany.mockResolvedValue([{ id: "s1" }])
    const res = await list(jsonRequest("/x", "GET"), routeParams({ id: "char1" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: "s1" }])
    expect(db.sketch.findMany).toHaveBeenCalledWith({
      where: { characterId: "char1" },
      orderBy: { createdAt: "desc" },
    })
  })

  it("404s for an unknown character", async () => {
    db.character.findUnique.mockResolvedValue(null)
    const res = await list(jsonRequest("/x", "GET"), routeParams({ id: "x" }))
    expect(res.status).toBe(404)
  })
})

describe("POST /api/characters/[id]/sketches", () => {
  it("resizes, saves and records the sketch with its note", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(saveSketch).mockResolvedValue("/uploads/sketches/s.png")
    db.sketch.create.mockImplementation(async ({ data }) => ({ id: "s1", ...data }))

    const res = await upload(uploadRequest(png(), "  first try  "), routeParams({ id: "char1" }))
    expect(res.status).toBe(201)
    expect(saveSketch).toHaveBeenCalledWith(expect.any(Buffer), "image/png")
    expect(db.sketch.create).toHaveBeenCalledWith({
      data: { characterId: "char1", imagePath: "/uploads/sketches/s.png", note: "first try" },
    })
  })

  it("stores a blank note as null", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(saveSketch).mockResolvedValue("/p")
    db.sketch.create.mockResolvedValue({})
    await upload(uploadRequest(png(), "   "), routeParams({ id: "char1" }))
    expect(db.sketch.create.mock.calls[0][0].data.note).toBeNull()
  })

  it("400s without a file or for non-image files", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    expect((await upload(uploadRequest(), routeParams({ id: "char1" }))).status).toBe(400)
    const txt = new File(["hi"], "notes.txt", { type: "text/plain" })
    expect((await upload(uploadRequest(txt), routeParams({ id: "char1" }))).status).toBe(400)
    expect(saveSketch).not.toHaveBeenCalled()
  })

  it("400s when the image cannot be decoded", async () => {
    db.character.findUnique.mockResolvedValue(sampleCharacter)
    vi.mocked(saveSketch).mockRejectedValue(new Error("unsupported image"))
    const res = await upload(uploadRequest(png()), routeParams({ id: "char1" }))
    expect(res.status).toBe(400)
  })

  it("404s for an unknown character", async () => {
    db.character.findUnique.mockResolvedValue(null)
    const res = await upload(uploadRequest(png()), routeParams({ id: "x" }))
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/sketches/[id]", () => {
  it("deletes the sketch row and file", async () => {
    db.sketch.findUnique.mockResolvedValue({ id: "s1", imagePath: "/uploads/sketches/s.png" })
    db.sketch.delete.mockResolvedValue({})
    const res = await remove(jsonRequest("/x", "DELETE"), routeParams({ id: "s1" }))
    expect(res.status).toBe(204)
    expect(db.sketch.delete).toHaveBeenCalledWith({ where: { id: "s1" } })
    expect(deleteImage).toHaveBeenCalledWith("/uploads/sketches/s.png")
  })

  it("404s for an unknown sketch", async () => {
    db.sketch.findUnique.mockResolvedValue(null)
    const res = await remove(jsonRequest("/x", "DELETE"), routeParams({ id: "x" }))
    expect(res.status).toBe(404)
  })
})
