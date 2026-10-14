import { NextRequest, NextResponse } from "next/server"
import { generateCharacterProfile } from "@/lib/anthropic"
import { errorMessage, jsonError, readJson } from "@/lib/http"
import { CharacterFormData } from "@/types/character"

export async function POST(request: NextRequest) {
  const body = await readJson<CharacterFormData>(request)

  if (!body?.concept || !body.style) {
    return jsonError("concept and style are required", 400)
  }

  try {
    const profile = await generateCharacterProfile({ ...body, moods: body.moods ?? [] })
    return NextResponse.json(profile)
  } catch (err) {
    console.error("Profile generation failed:", err)
    return jsonError(`Profile generation failed: ${errorMessage(err)}`, 502)
  }
}
