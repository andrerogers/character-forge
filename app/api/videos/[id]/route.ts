import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { deleteImage } from "@/lib/storage"
import { jsonError } from "@/lib/http"
import { refreshVideo } from "@/lib/videos"

type Params = { params: Promise<{ id: string }> }

// Returns the video, first checking on it with the provider if it's pending.
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const video = await prisma.video.findUnique({ where: { id } })
  if (!video) return jsonError("Video not found", 404)
  return NextResponse.json(await refreshVideo(video))
}

// Deleting a pending video only forgets it: providers have no cancel, so a
// job already running there may still be charged.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const video = await prisma.video.findUnique({ where: { id } })
  if (!video) return jsonError("Video not found", 404)
  await prisma.video.delete({ where: { id } })
  if (video.videoPath) await deleteImage(video.videoPath)
  return new NextResponse(null, { status: 204 })
}
