import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const style = searchParams.get("style")
  const q = searchParams.get("q")

  const characters = await prisma.character.findMany({
    where: {
      ...(style ? { style } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { tagline: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(characters)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  const character = await prisma.character.create({
    data: {
      name: body.name,
      description: body.description,
      tagline: body.tagline ?? null,
      style: body.style,
      age: body.age ?? null,
      personality: body.personality ?? [],
      backstory: body.backstory ?? null,
      colorPalette: body.colorPalette ?? [],
      imagePath: body.imagePath ?? null,
      concept: body.concept,
    },
  })

  return NextResponse.json(character, { status: 201 })
}
