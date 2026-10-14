import { NextRequest, NextResponse } from "next/server"
import { createId } from "@paralleldrive/cuid2"
import { prisma } from "@/lib/db"
import { generateCharacterImage, generateGuideImage } from "@/lib/gemini"
import { saveImage, saveGuideImage, readPublicFile } from "@/lib/storage"
import { errorMessage, jsonError, readJson } from "@/lib/http"
import { MAX_GUIDE_STEPS } from "@/lib/guide"
import { GeneratedProfile } from "@/types/character"

interface PortraitBody {
  profile?: GeneratedProfile
  style?: string
  pose?: string
  artists?: string[]
}

interface GuideImageBody {
  characterId: string
  slot: string
  prompt?: string
}

const STEP_SLOT = /^step-(\d+)$/

function isValidSlot(slot: unknown): slot is string {
  if (slot === "overlay") return true
  const match = typeof slot === "string" && STEP_SLOT.exec(slot)
  if (!match) return false
  const n = Number(match[1])
  return n >= 1 && n <= MAX_GUIDE_STEPS
}

// Two modes:
//  - portrait: { profile, style, pose?, artists? } → /uploads/<cuid>.png
//  - guide:    { characterId, slot: "step-<n>" | "overlay", prompt }
//              → /uploads/guides/<characterId>/<slot>.png
export async function POST(request: NextRequest) {
  const body = await readJson<PortraitBody & Partial<GuideImageBody>>(request)
  if (!body) return jsonError("Invalid JSON body", 400)

  if (body.characterId !== undefined) {
    return guideImage(body as GuideImageBody)
  }

  if (!body.profile || !body.style) {
    return jsonError("profile and style are required", 400)
  }

  try {
    const imageBuffer = await generateCharacterImage(body.profile, body.style, {
      pose: body.pose,
      artists: body.artists,
    })
    const imagePath = await saveImage(imageBuffer, createId())
    return NextResponse.json({ imagePath })
  } catch (err) {
    console.error("Portrait generation failed:", err)
    return jsonError(`Portrait generation failed: ${errorMessage(err)}`, 502)
  }
}

async function guideImage({ characterId, slot, prompt }: GuideImageBody) {
  if (!isValidSlot(slot)) {
    return jsonError(`slot must be "overlay" or step-1…step-${MAX_GUIDE_STEPS}`, 400)
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return jsonError("prompt is required", 400)
  }

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) return jsonError("Character not found", 404)

  try {
    const reference = character.imagePath ? await readPublicFile(character.imagePath) : null
    const buffer = await generateGuideImage(prompt.trim(), reference)
    const imagePath = await saveGuideImage(buffer, characterId, slot)
    return NextResponse.json({ imagePath })
  } catch (err) {
    console.error(`Guide image ${slot} failed:`, err)
    return jsonError(`Image generation failed: ${errorMessage(err)}`, 502)
  }
}
