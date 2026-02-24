import { NextRequest, NextResponse } from "next/server"
import { generateCharacterImage } from "@/lib/gemini"
import { saveImage } from "@/lib/storage"
import { GeneratedProfile } from "@/types/character"
import { createId } from "@paralleldrive/cuid2"

export async function POST(request: NextRequest) {
  const body: { profile: GeneratedProfile; style: string; artists?: string[] } =
    await request.json()

  if (!body.profile || !body.style) {
    return NextResponse.json(
      { error: "profile and style are required" },
      { status: 400 }
    )
  }

  const imageBuffer = await generateCharacterImage(body.profile, body.style, body.artists)
  const id = createId()
  const imagePath = await saveImage(imageBuffer, id)

  return NextResponse.json({ imagePath })
}
