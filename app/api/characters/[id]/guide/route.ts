import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { deleteGuideImages } from "@/lib/storage"
import { jsonError, readJson } from "@/lib/http"
import { parseGuideSave } from "@/lib/guide"

type Params = { params: Promise<{ id: string }> }

// Persists a finished guide once all of its images have been generated.
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params

  const character = await prisma.character.findUnique({
    where: { id },
    include: { guide: { select: { id: true } } },
  })
  if (!character) return jsonError("Character not found", 404)
  if (character.guide) return jsonError("This character already has a guide", 409)

  const parsed = parseGuideSave(await readJson(request), id)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const guide = await prisma.drawingGuide.create({
    data: {
      characterId: id,
      proportionSystem: parsed.data.proportionSystem,
      overlayImagePath: parsed.data.overlayImagePath,
      steps: { create: parsed.data.steps },
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  })

  return NextResponse.json(guide, { status: 201 })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params

  const guide = await prisma.drawingGuide.findUnique({ where: { characterId: id } })
  if (!guide) return jsonError("No guide for this character", 404)

  await prisma.drawingGuide.delete({ where: { characterId: id } })
  await deleteGuideImages(id)
  return new NextResponse(null, { status: 204 })
}
