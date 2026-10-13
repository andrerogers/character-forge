import { describe, it, expect, vi } from "vitest"
import { jsonRequest, routeParams, sampleCharacter, type PrismaMock } from "../helpers"

vi.mock("@/lib/db", async () => {
  const { createPrismaMock } = await import("../helpers")
  return { prisma: createPrismaMock() }
})
vi.mock("@/lib/characters", () => ({ deleteCharacterWithFiles: vi.fn() }))

import { prisma } from "@/lib/db"
import { deleteCharacterWithFiles } from "@/lib/characters"
import { GET as list, POST as create } from "@/app/api/characters/route"
import { GET as getOne, DELETE as remove } from "@/app/api/characters/[id]/route"

const db = prisma as unknown as PrismaMock

describe("GET /api/characters", () => {
  it("lists characters newest first", async () => {
    db.character.findMany.mockResolvedValue([sampleCharacter])
    const res = await list(jsonRequest("/api/characters", "GET"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].tags).toEqual(sampleCharacter.tags)
    expect(db.character.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "desc" } })
    )
  })
})

describe("POST /api/characters", () => {
  const payload = {
    name: "Kaida",
    description: "A wandering ronin.",
    tagline: "Steel remembers.",
    style: "Manga",
    concept: "A disgraced samurai",
    personality: ["Stoic"],
    colorPalette: ["#000000"],
    tags: ["Ronin", " ronin ", "Manga", ""],
    imagePath: "/uploads/x.png",
    // Ephemeral fields must never reach the database
    pose: "Profile",
    artists: ["Moebius"],
  }

  it("saves the character with normalised tags and no ephemeral fields", async () => {
    db.character.create.mockImplementation(async ({ data }) => ({ id: "new", ...data }))
    const res = await create(jsonRequest("/api/characters", "POST", payload))
    expect(res.status).toBe(201)
    const { data } = db.character.create.mock.calls[0][0]
    expect(data.tags).toEqual(["Ronin", "Manga"])
    expect(data).not.toHaveProperty("pose")
    expect(data).not.toHaveProperty("artists")
  })

  it("rejects payloads missing required fields", async () => {
    for (const field of ["name", "description", "style", "concept"]) {
      const res = await create(
        jsonRequest("/api/characters", "POST", { ...payload, [field]: "" })
      )
      expect(res.status).toBe(400)
    }
    expect(db.character.create).not.toHaveBeenCalled()
  })

  it("rejects invalid JSON", async () => {
    const req = jsonRequest("/api/characters", "POST")
    const bad = new Request(req.url, { method: "POST", body: "{nope" })
    const res = await create(bad as never)
    expect(res.status).toBe(400)
  })
})

describe("GET /api/characters/[id]", () => {
  it("returns the character with sketches and guide steps", async () => {
    db.character.findUnique.mockResolvedValue({ ...sampleCharacter, sketches: [], guide: null })
    const res = await getOne(jsonRequest("/api/characters/char1", "GET"), routeParams({ id: "char1" }))
    expect(res.status).toBe(200)
    expect(db.character.findUnique).toHaveBeenCalledWith({
      where: { id: "char1" },
      include: {
        sketches: { orderBy: { createdAt: "desc" } },
        guide: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      },
    })
    const body = await res.json()
    expect(body.sketches).toEqual([])
    expect(body.guide).toBeNull()
  })

  it("404s for an unknown id", async () => {
    db.character.findUnique.mockResolvedValue(null)
    const res = await getOne(jsonRequest("/api/characters/x", "GET"), routeParams({ id: "x" }))
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/characters/[id]", () => {
  it("deletes the character and its files", async () => {
    vi.mocked(deleteCharacterWithFiles).mockResolvedValue(true)
    const res = await remove(jsonRequest("/api/characters/char1", "DELETE"), routeParams({ id: "char1" }))
    expect(res.status).toBe(204)
    expect(deleteCharacterWithFiles).toHaveBeenCalledWith("char1")
  })

  it("404s for an unknown id", async () => {
    vi.mocked(deleteCharacterWithFiles).mockResolvedValue(false)
    const res = await remove(jsonRequest("/api/characters/x", "DELETE"), routeParams({ id: "x" }))
    expect(res.status).toBe(404)
  })
})
