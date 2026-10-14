// Higgsfield (https://api.higgsfield.ai). Every job is: submit (with an
// Idempotency-Key so a retry is never a second charge) → poll
// /requests/{id}/status (queued → in_progress → completed | failed | nsfw |
// canceled; failed and nsfw are not charged) → download. Outputs are only
// kept for 7 days, so results are always downloaded. Local images are sent
// through a presigned upload. POST /estimate/<endpoint> prices a request for
// free without making anything.
import type { ImageRequest, PriceEstimate, VideoJobStatus, VideoModelOption, VideoRequest } from "./types"
import { ProviderError, requestBytes, requestJson, requireEnv, sleep } from "./http"

const NAME = "Higgsfield"
const IMAGE_POLL_TIMEOUT_MS = 180_000

const base = () => (process.env.HIGGSFIELD_BASE_URL || "https://api.higgsfield.ai").replace(/\/$/, "")
const pollMs = () => Number(process.env.HIGGSFIELD_POLL_MS) || 2000

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Key ${requireEnv("HIGGSFIELD_API_KEY")}`,
    "Content-Type": "application/json",
    ...extra,
  }
}

interface ImageModel {
  id: string // also the endpoint
  label: string
  body: Record<string, unknown>
  takesReference: boolean
}

export const HIGGSFIELD_IMAGE_MODELS: ImageModel[] = [
  {
    id: "z-image/turbo",
    label: "Z-Image Turbo (fast, cheap; no reference image)",
    body: { resolution: "1k", aspect_ratio: "1:1" },
    takesReference: false,
  },
  {
    id: "marketing-studio/image",
    label: "Marketing Studio Image (medium quality; accepts a reference)",
    body: { quality: "medium", resolution: "1k", aspect_ratio: "1:1" },
    takesReference: true,
  },
]

interface VideoModel extends VideoModelOption {
  endpointBase: string
  resolution?: string
  // Sound must always be stated: each model's own default is on, at the higher price
  soundField: "sound" | "generate_audio"
}

export const HIGGSFIELD_VIDEO_MODELS: VideoModel[] = [
  {
    id: "seedance",
    label: "Seedance 2.5 (480p)",
    endpointBase: "bytedance/seedance-2.5",
    minSeconds: 4,
    resolution: "480p",
    soundField: "generate_audio",
    durations: null,
    supportsImage: true,
    supportsAudio: true,
  },
  {
    id: "kling",
    label: "Kling 3.0 Standard",
    endpointBase: "kling-video/v3.0/std",
    minSeconds: 3,
    soundField: "sound",
    durations: null,
    supportsImage: true,
    supportsAudio: true,
  },
  {
    id: "pixverse",
    label: "PixVerse v6 (360p), a cheap test",
    endpointBase: "pixverse/v6",
    minSeconds: 1,
    resolution: "360p",
    soundField: "generate_audio",
    durations: null,
    supportsImage: true,
    supportsAudio: true,
  },
]

function imageModel(id: string) {
  const m = HIGGSFIELD_IMAGE_MODELS.find((x) => x.id === id)
  if (!m) throw new ProviderError(`Unknown Higgsfield image model "${id}"`)
  return m
}

function videoModel(id: string) {
  const m = HIGGSFIELD_VIDEO_MODELS.find((x) => x.id === id)
  if (!m) throw new ProviderError(`Unknown Higgsfield video model "${id}"`)
  return m
}

async function upload(image: Buffer, contentType = "image/png"): Promise<string> {
  const slot = await requestJson<{ upload_url: string; upload_headers?: Record<string, string>; public_url: string }>(
    NAME,
    `${base()}/files/generate-upload-url`,
    { method: "POST", headers: headers(), body: JSON.stringify({ content_type: contentType }) }
  )
  // Only the headers Higgsfield returned; never its API key to the storage URL.
  const put = await fetch(slot.upload_url, {
    method: "PUT",
    headers: slot.upload_headers ?? {},
    body: new Uint8Array(image),
  })
  if (!put.ok) throw new ProviderError(`Higgsfield upload failed (${put.status})`, put.status)
  return slot.public_url
}

async function submit(endpoint: string, body: Record<string, unknown>): Promise<string> {
  const job = await requestJson<{ request_id?: string }>(NAME, `${base()}/${endpoint}`, {
    method: "POST",
    headers: headers({ "Idempotency-Key": crypto.randomUUID() }),
    body: JSON.stringify(body),
  })
  if (!job.request_id) throw new ProviderError("Higgsfield accepted the job but returned no request id")
  return job.request_id
}

interface RawStatus {
  status?: string
  error?: string | null
  images?: { url: string }[]
  video?: { url: string }
}

async function rawStatus(requestId: string): Promise<RawStatus> {
  return requestJson<RawStatus>(NAME, `${base()}/requests/${encodeURIComponent(requestId)}/status`, {
    headers: headers(),
  })
}

function failure(s: RawStatus): string | null {
  if (s.status === "nsfw") return "Higgsfield's moderation rejected it (not charged)"
  if (s.status === "failed" || s.status === "canceled") {
    return `Higgsfield job ${s.status} (not charged)${s.error ? `: ${s.error}` : ""}`
  }
  return null
}

export async function generateImage(model: string, { prompt, reference }: ImageRequest): Promise<Buffer> {
  const m = imageModel(model)
  const body: Record<string, unknown> = { prompt, ...m.body }
  if (reference && m.takesReference) body.image_urls = [await upload(reference)]

  const requestId = await submit(m.id, body)
  const deadline = Date.now() + IMAGE_POLL_TIMEOUT_MS
  let wait = pollMs()
  while (Date.now() < deadline) {
    await sleep(wait)
    wait = Math.min(wait * 1.5, 10_000)
    const s = await rawStatus(requestId)
    const failed = failure(s)
    if (failed) throw new ProviderError(failed)
    if (s.status === "completed") {
      const url = s.images?.[0]?.url
      if (!url) throw new ProviderError("Higgsfield finished but returned no image")
      return requestBytes(NAME, url)
    }
  }
  throw new ProviderError(`Higgsfield image still running after ${IMAGE_POLL_TIMEOUT_MS / 1000}s (request ${requestId})`)
}

function videoEndpoint(m: VideoModel, req: VideoRequest) {
  return `${m.endpointBase}/${req.image ? "image-to-video" : "text-to-video"}`
}

function videoBody(m: VideoModel, req: VideoRequest, imageUrl: string | null) {
  const body: Record<string, unknown> = {
    prompt: req.prompt,
    duration: req.durationSeconds,
    [m.soundField]: m.soundField === "sound" ? (req.sound ? "on" : "off") : req.sound,
  }
  if (m.resolution) body.resolution = m.resolution
  if (imageUrl) body.image_url = imageUrl
  return body
}

// A model priced by tokens (Seedance) answers with its list rate per second
// in words rather than a dollar figure.
const RATE = /\$([0-9.]+) per second of generated video at (\w+)/g

export async function estimateVideo(model: string, req: VideoRequest): Promise<PriceEstimate> {
  const m = videoModel(model)
  // The estimate needs an image_url for image-to-video but not the real
  // image, so nothing is uploaded until the user says yes.
  const standIn = req.image ? "https://example.com/stand-in.png" : null
  const data = await requestJson<{ usd?: number | string; pricing_description?: string }>(
    NAME,
    `${base()}/estimate/${videoEndpoint(m, req)}`,
    { method: "POST", headers: headers(), body: JSON.stringify(videoBody(m, req, standIn)) }
  )
  if (data.usd !== undefined && data.usd !== null) return { usd: Number(data.usd) }
  for (const [, rate, at] of String(data.pricing_description ?? "").matchAll(RATE)) {
    if (!m.resolution || at === m.resolution) {
      return { usd: Math.round(Number(rate) * req.durationSeconds * 1000) / 1000, listPrice: true }
    }
  }
  return { usd: null, note: "Higgsfield didn't return a price for this request." }
}

export async function submitVideo(model: string, req: VideoRequest): Promise<string> {
  const m = videoModel(model)
  const imageUrl = req.image ? await upload(req.image) : null
  return submit(videoEndpoint(m, req), videoBody(m, req, imageUrl))
}

export async function getVideoStatus(requestId: string): Promise<VideoJobStatus> {
  const s = await rawStatus(requestId)
  const failed = failure(s)
  if (failed) return { state: "failed", error: failed }
  if (s.status === "completed") {
    const url = s.video?.url
    if (!url) return { state: "failed", error: "Higgsfield finished but returned no video" }
    return { state: "completed", outputUrl: url, costUsd: null }
  }
  return { state: "pending" }
}

export async function downloadVideo(url: string): Promise<Buffer> {
  return requestBytes(NAME, url)
}
