import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { jsonError, readJson } from "@/lib/http"
import { normalizeTags } from "@/lib/tags"

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

const stringArray = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []

export async function POST(request: NextRequest) {
  const body = await readJson(request)
  if (!body) return jsonError("Invalid JSON body", 400)

  for (const field of ["name", "description", "style", "concept"]) {
    const value = body[field]
    if (typeof value !== "string" || !value.trim()) {
      return jsonError(`${field} is required`, 400)
    }
  }

  // Only known fields are persisted; ephemeral wizard inputs (pose, artists)
  // are dropped here.
  const character = await prisma.character.create({
    data: {
      name: body.name as string,
      description: body.description as string,
      tagline: (body.tagline as string) ?? null,
      style: body.style as string,
      age: (body.age as string) ?? null,
      personality: stringArray(body.personality),
      backstory: (body.backstory as string) ?? null,
      colorPalette: stringArray(body.colorPalette),
      tags: normalizeTags(body.tags),
      imagePath: (body.imagePath as string) ?? null,
      imageSource: typeof body.imageSource === "string" ? body.imageSource : null,
      concept: body.concept as string,
    },
  })

  return NextResponse.json(character, { status: 201 })
}
