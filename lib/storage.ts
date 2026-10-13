import { writeFile, unlink, mkdir, readFile, rm } from "fs/promises"
import path from "path"
import sharp, { type Sharp } from "sharp"
import { createId } from "@paralleldrive/cuid2"

// Files live under public/uploads so Next.js serves them at /uploads/...
const UPLOADS_URL = "/uploads"
const SKETCH_MAX_DIMENSION = 2048
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/

function uploadsDir() {
  return path.join(process.cwd(), "public", "uploads")
}

// Maps a public URL path (query string allowed) to a file on disk, refusing
// anything that would escape the uploads folder.
function resolvePublicPath(publicPath: string): string | null {
  const clean = publicPath.split("?")[0]
  const filePath = path.join(process.cwd(), "public", clean)
  const root = uploadsDir() + path.sep
  return filePath.startsWith(root) ? filePath : null
}

async function writeUpload(relativeDir: string, filename: string, buffer: Buffer) {
  const dir = path.join(uploadsDir(), relativeDir)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)
  return [UPLOADS_URL, relativeDir, filename].filter(Boolean).join("/")
}

export async function saveImage(buffer: Buffer, id: string): Promise<string> {
  return writeUpload("", `${id}.png`, buffer)
}

export async function deleteImage(imagePath: string): Promise<void> {
  const filePath = resolvePublicPath(imagePath)
  if (!filePath) return
  try {
    await unlink(filePath)
  } catch {
    // File may not exist; ignore
  }
}

export async function readPublicFile(publicPath: string): Promise<Buffer | null> {
  const filePath = resolvePublicPath(publicPath)
  if (!filePath) return null
  try {
    return await readFile(filePath)
  } catch {
    return null
  }
}

const SKETCH_FORMATS: Record<string, { ext: string; apply: (img: Sharp) => Sharp }> = {
  "image/jpeg": { ext: "jpg", apply: (img) => img.jpeg({ quality: 95, mozjpeg: true }) },
  "image/webp": { ext: "webp", apply: (img) => img.webp({ quality: 95 }) },
  "image/png": { ext: "png", apply: (img) => img.png() },
}

// Resizes so the longest side is at most 2048px (never enlarging), honours
// EXIF orientation, and keeps JPEG/WebP/PNG in their own format at high
// quality. Anything else is converted to PNG.
export async function saveSketch(buffer: Buffer, mimeType: string): Promise<string> {
  const format = SKETCH_FORMATS[mimeType] ?? SKETCH_FORMATS["image/png"]
  const pipeline = sharp(buffer)
    .rotate()
    .resize({
      width: SKETCH_MAX_DIMENSION,
      height: SKETCH_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
  const output = await format.apply(pipeline).toBuffer()
  return writeUpload("sketches", `${createId()}.${format.ext}`, output)
}

// Step images keep stable names (step-<n>.png, overlay.png); the ?v= suffix
// busts the browser cache when a guide is regenerated.
export async function saveGuideImage(
  buffer: Buffer,
  characterId: string,
  slot: string
): Promise<string> {
  if (!SAFE_SEGMENT.test(characterId) || !SAFE_SEGMENT.test(slot)) {
    throw new Error("Invalid guide image location")
  }
  const url = await writeUpload(`guides/${characterId}`, `${slot}.png`, buffer)
  return `${url}?v=${Date.now()}`
}

export async function deleteGuideImages(characterId: string): Promise<void> {
  if (!SAFE_SEGMENT.test(characterId)) return
  await rm(path.join(uploadsDir(), "guides", characterId), { recursive: true, force: true })
}
