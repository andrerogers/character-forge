import { describe, it, expect, vi } from "vitest"
import { jsonRequest, routeParams, sampleCharacter, type PrismaMock } from "../helpers"

vi.mock("@/lib/db", async () => {
  const { createPrismaMock } = await import("../helpers")
  return { prisma: createPrismaMock() }
})
vi.mock("@/lib/storage", () => ({ deleteGuideImages: vi.fn() }))

import { prisma } from "@/lib/db"
import { deleteGuideImages } from "@/lib/storage"
import { POST as save, DELETE as remove } from "@/app/api/characters/[id]/guide/route"

const db = prisma as unknown as PrismaMock
const base = "/uploads/guides/char1/"
const payload = {
  proportionSystem: "manga",
  overlayImagePath: `${base}overlay.png?v=1`,
  steps: [
    { stepNumber: 1, title: "Gesture", instructions: "Loose lines.", imagePath: `${base}step-1.png?v=1` },
    { stepNumber: 2, title: "Shapes", instructions: "Block in.", imagePath: `${base}step-2.png?v=1` },
  ],
}

describe("POST /api/characters/[id]/guide", () => {
  it("persists the guide with its ordered steps", async () => {
    db.character.findUnique.mockResolvedValue({ ...sampleCharacter, guide: null })
    db.drawingGuide.create.mockImplementation(async ({ data }) => ({
      id: "g1",
      characterId: data.characterId,
      overlayImagePath: data.overlayImagePath,
      proportionSystem: data.proportionSystem,
      steps: data.steps.create,
    }))

    const res = await save(jsonRequest("/x", "POST", payload), routeParams({ id: "char1" }))
    expect(res.status).toBe(201)
    const { data, include } = db.drawingGuide.create.mock.calls[0][0]
    expect(data.characterId).toBe("char1")
    expect(data.overlayImagePath).toBe(payload.overlayImagePath)
    expect(data.steps.create).toEqual(payload.steps)
    expect(include).toEqual({ steps: { orderBy: { stepNumber: "asc" } } })
    expect((await res.json()).steps).toHaveLength(2)
  })

  it("400s for an invalid payload", async () => {
    db.character.findUnique.mockResolvedValue({ ...sampleCharacter, guide: null })
    const res = await save(jsonRequest("/x", "POST", { steps: [] }), routeParams({ id: "char1" }))
    expect(res.status).toBe(400)
    expect(db.drawingGuide.create).not.toHaveBeenCalled()
  })

  it("404s for an unknown character", async () => {
    db.character.findUnique.mockResolvedValue(null)
    const res = await save(jsonRequest("/x", "POST", payload), routeParams({ id: "char1" }))
    expect(res.status).toBe(404)
  })

  it("409s when a guide already exists", async () => {
    db.character.findUnique.mockResolvedValue({ ...sampleCharacter, guide: { id: "g0" } })
    const res = await save(jsonRequest("/x", "POST", payload), routeParams({ id: "char1" }))
    expect(res.status).toBe(409)
  })
})

describe("DELETE /api/characters/[id]/guide", () => {
  it("deletes the guide row and its images", async () => {
    db.drawingGuide.findUnique.mockResolvedValue({ id: "g1", characterId: "char1" })
    db.drawingGuide.delete.mockResolvedValue({})
    const res = await remove(jsonRequest("/x", "DELETE"), routeParams({ id: "char1" }))
    expect(res.status).toBe(204)
    expect(db.drawingGuide.delete).toHaveBeenCalledWith({ where: { characterId: "char1" } })
    expect(deleteGuideImages).toHaveBeenCalledWith("char1")
  })

  it("404s when there is no guide", async () => {
    db.drawingGuide.findUnique.mockResolvedValue(null)
    const res = await remove(jsonRequest("/x", "DELETE"), routeParams({ id: "char1" }))
    expect(res.status).toBe(404)
    expect(deleteGuideImages).not.toHaveBeenCalled()
  })
})
