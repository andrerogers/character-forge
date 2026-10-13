import { prisma } from "@/lib/db"
import { deleteImage, deleteGuideImages } from "@/lib/storage"

// Deletes a character (sketches and guide rows cascade in the database) and
// removes every file that belonged to it. Returns false if it didn't exist.
export async function deleteCharacterWithFiles(id: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id },
    include: { sketches: { select: { imagePath: true } } },
  })
  if (!character) return false

  await prisma.character.delete({ where: { id } })

  const files = [character.imagePath, ...character.sketches.map((s) => s.imagePath)]
  await Promise.all([
    ...files.filter((p): p is string => !!p).map((p) => deleteImage(p)),
    deleteGuideImages(id),
  ])
  return true
}
