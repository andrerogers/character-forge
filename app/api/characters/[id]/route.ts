import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { deleteImage } from "@/lib/storage"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const character = await prisma.character.findUnique({ where: { id } })
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
  const character = await prisma.character.findUnique({ where: { id } })
  if (!character) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (character.imagePath) {
    await deleteImage(character.imagePath)
  }

  await prisma.character.delete({ where: { id } })
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
