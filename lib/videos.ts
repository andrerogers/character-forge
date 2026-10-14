import { prisma } from "@/lib/db"
import { downloadVideo, getVideoStatus } from "@/lib/media/video"
import { saveVideo } from "@/lib/storage"
import type { Video } from "@/types/character"

const STUCK_SAVING_MS = 5 * 60_000

// Advances a video job: asks the provider how it's going and, once it has
// finished, downloads the clip (providers only keep outputs for a while).
// Called whenever the client polls, so jobs resume after a reload or restart.
export async function refreshVideo(video: Video): Promise<Video> {
  if (video.status === "saving" && Date.now() - new Date(video.updatedAt).getTime() > STUCK_SAVING_MS) {
    // A download died mid-way (e.g. the server restarted): try again.
    video = await prisma.video.update({ where: { id: video.id }, data: { status: "pending" } })
  }
  if (video.status !== "pending" || !video.jobId) return video

  const engine = { provider: video.provider, model: video.model }
  let status
  try {
    status = await getVideoStatus(engine, video.jobId)
  } catch (err) {
    console.warn(`Video ${video.id}: status check failed, will retry`, err)
    return video
  }

  if (status.state === "pending") return video

  if (status.state === "failed") {
    return prisma.video.update({ where: { id: video.id }, data: { status: "failed", error: status.error } })
  }

  // Completed: claim the download so concurrent polls don't fetch it twice.
  const claimed = await prisma.video.updateMany({
    where: { id: video.id, status: "pending" },
    data: { status: "saving" },
  })
  if (claimed.count === 0) {
    return (await prisma.video.findUnique({ where: { id: video.id } })) ?? video
  }

  try {
    const clip = await downloadVideo(engine, status.outputUrl)
    const videoPath = await saveVideo(clip, video.id)
    return prisma.video.update({
      where: { id: video.id },
      data: { status: "completed", videoPath, costUsd: status.costUsd, error: null },
    })
  } catch (err) {
    console.warn(`Video ${video.id}: download failed, will retry`, err)
    return prisma.video.update({ where: { id: video.id }, data: { status: "pending" } })
  }
}
