import { NextRequest, NextResponse } from "next/server"
import { createId } from "@paralleldrive/cuid2"
import { prisma } from "@/lib/db"
import { generateCharacterImage, generateGuideImage } from "@/lib/artwork"
import { EngineError, resolveImageEngine } from "@/lib/media/registry"
import type { Engine } from "@/lib/media/types"
import { saveImage, saveGuideImage, readPublicFile } from "@/lib/storage"
import { errorMessage, jsonError, readJson } from "@/lib/http"
import { MAX_GUIDE_STEPS } from "@/lib/guide"
import { GeneratedProfile } from "@/types/character"

interface PortraitBody {
  profile?: GeneratedProfile
  style?: string
  pose?: string
  artists?: string[]
  engine?: unknown
}

interface GuideImageBody {
  characterId: string
  slot: string
  prompt?: string
}

const sourceOf = (e: Engine) => `${e.provider}:${e.model}`

const STEP_SLOT = /^step-(\d+)$/

function isValidSlot(slot: unknown): slot is string {
  if (slot === "overlay") return true
  const match = typeof slot === "string" && STEP_SLOT.exec(slot)
  if (!match) return false
  const n = Number(match[1])
  return n >= 1 && n <= MAX_GUIDE_STEPS
}

// Two modes, both taking an optional engine { provider, model } (default from
// .env.local; see lib/media/registry.ts):
//  - portrait: { profile, style, pose?, artists? } → /uploads/<cuid>.png
//  - guide:    { characterId, slot: "step-<n>" | "overlay", prompt }
//              → /uploads/guides/<characterId>/<slot>.png
// Responds { imagePath, imageSource: "provider:model" }.
export async function POST(request: NextRequest) {
  const body = await readJson<PortraitBody & Partial<GuideImageBody>>(request)
  if (!body) return jsonError("Invalid JSON body", 400)

  let engine: Engine
  try {
    engine = resolveImageEngine(body.engine)
  } catch (err) {
    if (err instanceof EngineError) return jsonError(err.message, 400)
    throw err
  }

  if (body.characterId !== undefined) {
    return guideImage(body as GuideImageBody, engine)
  }

  if (!body.profile || !body.style) {
    return jsonError("profile and style are required", 400)
  }

  try {
    const imageBuffer = await generateCharacterImage(body.profile, body.style, {
      pose: body.pose,
      artists: body.artists,
      engine,
    })
    const imagePath = await saveImage(imageBuffer, createId())
    return NextResponse.json({ imagePath, imageSource: sourceOf(engine) })
  } catch (err) {
    console.error("Portrait generation failed:", err)
    return jsonError(`Portrait generation failed: ${errorMessage(err)}`, 502)
  }
}

async function guideImage({ characterId, slot, prompt }: GuideImageBody, engine: Engine) {
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
    const buffer = await generateGuideImage(prompt.trim(), reference, engine)
    const imagePath = await saveGuideImage(buffer, characterId, slot)
    return NextResponse.json({ imagePath, imageSource: sourceOf(engine) })
  } catch (err) {
    console.error(`Guide image ${slot} failed:`, err)
    return jsonError(`Image generation failed: ${errorMessage(err)}`, 502)
  }
}
