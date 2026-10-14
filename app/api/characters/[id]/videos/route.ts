import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { submitVideo } from "@/lib/media/video"
import { errorMessage, jsonError, readJson } from "@/lib/http"
import { parseVideoRequest } from "@/lib/video-request"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const character = await prisma.character.findUnique({ where: { id } })
  if (!character) return jsonError("Character not found", 404)
  const videos = await prisma.video.findMany({ where: { characterId: id }, orderBy: { createdAt: "desc" } })
  return NextResponse.json(videos)
}

// Starts a video job. Same body as /estimate plus estimatedCostUsd (what the
// user agreed to). Returns the pending Video; poll GET /api/videos/[id].
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await readJson(request)
  const parsed = await parseVideoRequest(id, body)
  if (!parsed.ok) return jsonError(parsed.error, parsed.status)
  const { engine, mode, req } = parsed.value

  let jobId: string
  try {
    jobId = await submitVideo(engine, req)
  } catch (err) {
    console.error("Video submission failed:", err)
    return jsonError(`Video generation failed: ${errorMessage(err)}`, 502)
  }

  const estimate = body?.estimatedCostUsd
  const video = await prisma.video.create({
    data: {
      characterId: id,
      provider: engine.provider,
      model: engine.model,
      mode,
      prompt: req.prompt,
      durationSeconds: req.durationSeconds,
      sound: req.sound,
      status: "pending",
      jobId,
      estimatedCostUsd: typeof estimate === "number" && Number.isFinite(estimate) ? estimate : null,
    },
  })
  return NextResponse.json(video, { status: 201 })
}
