import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { saveSketch } from "@/lib/storage"
import { jsonError } from "@/lib/http"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const character = await prisma.character.findUnique({ where: { id } })
  if (!character) return jsonError("Character not found", 404)

  const sketches = await prisma.sketch.findMany({
    where: { characterId: id },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(sketches)
}

// multipart/form-data: file (image/*), note (optional)
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const character = await prisma.character.findUnique({ where: { id } })
  if (!character) return jsonError("Character not found", 404)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return jsonError("Expected multipart form data", 400)
  }

  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("An image file is required", 400)
  }
  if (!file.type.startsWith("image/")) {
    return jsonError("Only image files can be uploaded", 400)
  }

  let imagePath: string
  try {
    imagePath = await saveSketch(Buffer.from(await file.arrayBuffer()), file.type)
  } catch (err) {
    console.error("Sketch processing failed:", err)
    return jsonError("That image could not be read. Try a PNG, JPEG or WebP file.", 400)
  }

  const note = form.get("note")
  const sketch = await prisma.sketch.create({
    data: {
      characterId: id,
      imagePath,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    },
  })
  return NextResponse.json(sketch, { status: 201 })
}
