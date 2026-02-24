import { writeFile, unlink } from "fs/promises"
import path from "path"

export async function saveImage(buffer: Buffer, id: string): Promise<string> {
  const filename = `${id}.png`
  const filePath = path.join(process.cwd(), "public", "uploads", filename)
  await writeFile(filePath, buffer)
  return `/uploads/${filename}`
}

export async function deleteImage(imagePath: string): Promise<void> {
  try {
    const filePath = path.join(process.cwd(), "public", imagePath)
    await unlink(filePath)
  } catch {
    // File may not exist; ignore
  }
}
