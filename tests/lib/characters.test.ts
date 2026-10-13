import { describe, it, expect, vi } from "vitest"
import { sampleCharacter, type PrismaMock } from "../helpers"

vi.mock("@/lib/db", async () => {
  const { createPrismaMock } = await import("../helpers")
  return { prisma: createPrismaMock() }
})
vi.mock("@/lib/storage", () => ({
  deleteImage: vi.fn(),
  deleteGuideImages: vi.fn(),
}))

import { prisma } from "@/lib/db"
import { deleteImage, deleteGuideImages } from "@/lib/storage"
import { deleteCharacterWithFiles } from "@/lib/characters"

const db = prisma as unknown as PrismaMock

describe("deleteCharacterWithFiles", () => {
  it("deletes the row (cascading sketches and guide) and every file", async () => {
    db.character.findUnique.mockResolvedValue({
      ...sampleCharacter,
      sketches: [{ imagePath: "/uploads/sketches/a.png" }, { imagePath: "/uploads/sketches/b.jpg" }],
    })
    db.character.delete.mockResolvedValue({})

    expect(await deleteCharacterWithFiles("char1")).toBe(true)
    expect(db.character.delete).toHaveBeenCalledWith({ where: { id: "char1" } })
    expect(deleteImage).toHaveBeenCalledWith("/uploads/char1.png")
    expect(deleteImage).toHaveBeenCalledWith("/uploads/sketches/a.png")
    expect(deleteImage).toHaveBeenCalledWith("/uploads/sketches/b.jpg")
    expect(deleteGuideImages).toHaveBeenCalledWith("char1")
  })

  it("returns false when the character does not exist", async () => {
    db.character.findUnique.mockResolvedValue(null)
    expect(await deleteCharacterWithFiles("x")).toBe(false)
    expect(db.character.delete).not.toHaveBeenCalled()
  })
})
