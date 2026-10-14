import { prisma } from "@/lib/db"
import { deleteImage, deleteGuideImages } from "@/lib/storage"

// Deletes a character (sketch, guide and video rows cascade in the database) and
// removes every file that belonged to it. Returns false if it didn't exist.
export async function deleteCharacterWithFiles(id: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      sketches: { select: { imagePath: true } },
      videos: { select: { videoPath: true } },
    },
  })
  if (!character) return false

  await prisma.character.delete({ where: { id } })

  const files = [
    character.imagePath,
    ...character.sketches.map((s) => s.imagePath),
    ...character.videos.map((v) => v.videoPath),
  ]
  await Promise.all([
    ...files.filter((p): p is string => !!p).map((p) => deleteImage(p)),
    deleteGuideImages(id),
  ])
  return true
}
