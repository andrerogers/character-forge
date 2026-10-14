import type { Engine, PriceEstimate, VideoJobStatus, VideoModelOption, VideoRequest } from "./types"
import * as openrouter from "./openrouter"
import * as higgsfield from "./higgsfield"
import { getVideoModels } from "./catalogue"

export const DEFAULT_VIDEO_SECONDS = 5
export const MAX_VIDEO_SECONDS = 10

export async function findVideoModel(engine: Engine): Promise<VideoModelOption | null> {
  const { models } = await getVideoModels(engine.provider)
  return models.find((m) => m.id === engine.model) ?? null
}

// Checks duration and image support against what's known about the model.
// Returns an error message, or null when the request is acceptable.
export function checkVideoRequest(
  model: VideoModelOption | null,
  req: { durationSeconds: number; image: boolean }
): string | null {
  const { durationSeconds: s } = req
  if (!Number.isInteger(s) || s < 1 || s > MAX_VIDEO_SECONDS) {
    return `Duration must be a whole number of seconds from 1 to ${MAX_VIDEO_SECONDS}`
  }
  if (model?.durations && !model.durations.includes(s)) {
    return `${model.label} supports ${model.durations.join(", ")} seconds`
  }
  if (model?.minSeconds && s < model.minSeconds) {
    return `${model.label} needs at least ${model.minSeconds} seconds`
  }
  if (req.image && model && !model.supportsImage) {
    return `${model.label} can't animate an image; choose another model or use text-to-video`
  }
  return null
}

export async function estimateVideo(engine: Engine, req: VideoRequest): Promise<PriceEstimate> {
  if (engine.provider === "higgsfield") return higgsfield.estimateVideo(engine.model, req)
  return openrouter.estimateVideoPrice(await findVideoModel(engine), req.durationSeconds, req.sound)
}

export async function submitVideo(engine: Engine, req: VideoRequest): Promise<string> {
  return engine.provider === "higgsfield"
    ? higgsfield.submitVideo(engine.model, req)
    : openrouter.submitVideo(engine.model, req)
}

export async function getVideoStatus(engine: Engine, jobId: string): Promise<VideoJobStatus> {
  return engine.provider === "higgsfield"
    ? higgsfield.getVideoStatus(jobId)
    : openrouter.getVideoStatus(jobId)
}

export async function downloadVideo(engine: Engine, url: string): Promise<Buffer> {
  return engine.provider === "higgsfield" ? higgsfield.downloadVideo(url) : openrouter.downloadVideo(url)
}
