import { NextRequest, NextResponse } from "next/server"
import { generateCharacterProfile } from "@/lib/anthropic"
import { CharacterFormData } from "@/types/character"

export async function POST(request: NextRequest) {
  const body: CharacterFormData = await request.json()

  if (!body.concept || !body.style) {
    return NextResponse.json(
      { error: "concept and style are required" },
      { status: 400 }
    )
  }

  const profile = await generateCharacterProfile(body)
  return NextResponse.json(profile)
}
