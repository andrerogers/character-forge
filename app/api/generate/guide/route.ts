import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { generateDrawingGuide } from "@/lib/anthropic"
import { errorMessage, jsonError, readJson } from "@/lib/http"
import { DEFAULT_GUIDE_STEPS, MAX_GUIDE_STEPS, MIN_GUIDE_STEPS } from "@/lib/guide"

export async function POST(request: NextRequest) {
  const body = await readJson(request)
  if (!body || typeof body.characterId !== "string") {
    return jsonError("characterId is required", 400)
  }

  const stepCount = body.stepCount ?? DEFAULT_GUIDE_STEPS
  if (
    !Number.isInteger(stepCount) ||
    (stepCount as number) < MIN_GUIDE_STEPS ||
    (stepCount as number) > MAX_GUIDE_STEPS
  ) {
    return jsonError(`stepCount must be a whole number from ${MIN_GUIDE_STEPS} to ${MAX_GUIDE_STEPS}`, 400)
  }

  const character = await prisma.character.findUnique({
    where: { id: body.characterId },
    include: { guide: { select: { id: true } } },
  })
  if (!character) return jsonError("Character not found", 404)
  if (character.guide) {
    return jsonError("This character already has a guide; delete it before regenerating", 409)
  }

  try {
    const plan = await generateDrawingGuide(character, {
      stepCount: stepCount as number,
      includeOverlay: body.includeOverlay === true,
    })
    return NextResponse.json(plan)
  } catch (err) {
    console.error("Guide generation failed:", err)
    return jsonError(`Guide generation failed: ${errorMessage(err)}`, 502)
  }
}
