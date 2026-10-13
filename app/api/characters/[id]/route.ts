import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { deleteCharacterWithFiles } from "@/lib/characters"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      sketches: { orderBy: { createdAt: "desc" } },
      guide: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
    },
  })
  if (!character) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(character)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const deleted = await deleteCharacterWithFiles(id)
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const character = await prisma.character.update({
    where: { id },
    data: body,
  })

  return NextResponse.json(character)
}
