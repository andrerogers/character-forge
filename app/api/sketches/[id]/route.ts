import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { deleteImage } from "@/lib/storage"
import { jsonError } from "@/lib/http"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sketch = await prisma.sketch.findUnique({ where: { id } })
  if (!sketch) return jsonError("Sketch not found", 404)

  await prisma.sketch.delete({ where: { id } })
  await deleteImage(sketch.imagePath)
  return new NextResponse(null, { status: 204 })
}
