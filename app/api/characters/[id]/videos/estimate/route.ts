import { NextRequest, NextResponse } from "next/server"
import { estimateVideo } from "@/lib/media/video"
import { errorMessage, jsonError, readJson } from "@/lib/http"
import { parseVideoRequest } from "@/lib/video-request"

// Prices a video before anything is made. Body: { engine, mode, prompt,
// durationSeconds, sound } → { usd: number | null, listPrice?, note? }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parsed = await parseVideoRequest(id, await readJson(request))
  if (!parsed.ok) return jsonError(parsed.error, parsed.status)

  try {
    return NextResponse.json(await estimateVideo(parsed.value.engine, parsed.value.req))
  } catch (err) {
    console.error("Video estimate failed:", err)
    return jsonError(`Could not price the video: ${errorMessage(err)}`, 502)
  }
}
