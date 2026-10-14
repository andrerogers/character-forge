// OpenRouter (https://openrouter.ai): one key for many image and video models.
//  - Images: chat completions with modalities ["image", "text"]; images come
//    back in message.images[].image_url.url (usually a base64 data URL).
//  - Video: POST /videos → 202 { id }, poll GET /videos/{id} until
//    completed, then download unsigned_urls[0] (or /videos/{id}/content).
//    Those URLs are not presigned, so the API key is sent with the download.
import type { ImageRequest, ModelOption, PriceEstimate, VideoJobStatus, VideoModelOption, VideoRequest } from "./types"
import { ProviderError, dataUrl, decodeDataUrl, requestBytes, requestJson, requireEnv } from "./http"

const NAME = "OpenRouter"

const base = () => (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "")

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${requireEnv("OPENROUTER_API_KEY")}`,
    "Content-Type": "application/json",
    "X-Title": "CharacterForge",
  }
}

interface ChatImageResponse {
  choices?: {
    message?: {
      content?: string | null
      images?: { image_url?: { url?: string } }[]
    }
  }[]
}

export async function generateImage(model: string, { prompt, reference }: ImageRequest): Promise<Buffer> {
  const content = reference
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: dataUrl(reference) } },
      ]
    : prompt

  const data = await requestJson<ChatImageResponse>(NAME, `${base()}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model,
      modalities: ["image", "text"],
      messages: [{ role: "user", content }],
    }),
  })

  const message = data.choices?.[0]?.message
  const url = message?.images?.[0]?.image_url?.url
  if (!url) {
    const said = message?.content ? ` The model said: ${message.content.slice(0, 200)}` : ""
    throw new ProviderError(`${model} returned no image.${said}`)
  }
  return decodeDataUrl(url) ?? requestBytes(NAME, url)
}

export async function listImageModels(): Promise<ModelOption[]> {
  const data = await requestJson<{ data?: { id: string; name?: string }[] }>(
    NAME,
    `${base()}/models?output_modalities=image`,
    { headers: headers() }
  )
  return (data.data ?? []).map((m) => ({ id: m.id, label: m.name || m.id }))
}

interface RawVideoModel {
  id: string
  name?: string
  supported_durations?: number[] | null
  supported_frame_images?: string[] | null
  generate_audio?: boolean | null
  pricing_skus?: Record<string, unknown> | null
}

export async function listVideoModels(): Promise<VideoModelOption[]> {
  const data = await requestJson<{ data?: RawVideoModel[] } | RawVideoModel[]>(NAME, `${base()}/videos/models`, {
    headers: headers(),
  })
  const models = Array.isArray(data) ? data : (data.data ?? [])
  return models.map((m) => ({
    id: m.id,
    label: m.name || m.id,
    durations: m.supported_durations?.length ? m.supported_durations : null,
    supportsImage: (m.supported_frame_images ?? []).includes("first_frame"),
    supportsAudio: m.generate_audio === true,
    pricing: m.pricing_skus ?? undefined,
  }))
}

const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : v
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

// Pricing SKU names vary by model, so this is best-effort: a per-second rate
// (preferring an audio-specific one when sound is on, and skipping 1080p
// variants) times the duration, else a flat per-video price.
export function estimateVideoPrice(
  model: VideoModelOption | null,
  seconds: number,
  sound: boolean
): PriceEstimate {
  const pricing = model?.pricing
  if (pricing) {
    const entries = Object.entries(pricing)
      .map(([k, v]) => [k.toLowerCase(), num(v)] as const)
      .filter(([, v]) => v !== null) as [string, number][]
    const perSecond = entries.filter(([k]) => k.includes("second") && !k.includes("1080"))
    const withAudio = perSecond.find(([k]) => k.includes("audio"))
    const silent = perSecond.find(([k]) => !k.includes("audio"))
    const rate = sound ? (withAudio ?? silent) : (silent ?? withAudio)
    if (rate) return { usd: Math.round(rate[1] * seconds * 1000) / 1000 }
    const flat = entries.find(([k]) => !k.includes("second"))
    if (flat) return { usd: flat[1] }
  }
  return { usd: null, note: "OpenRouter didn't publish a price for this model; check openrouter.ai before generating." }
}

export async function submitVideo(model: string, req: VideoRequest): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    prompt: req.prompt,
    duration: req.durationSeconds,
    generate_audio: req.sound,
  }
  if (req.image) {
    body.frame_images = [
      { type: "image_url", image_url: { url: dataUrl(req.image) }, frame_type: "first_frame" },
    ]
  }
  const job = await requestJson<{ id?: string }>(NAME, `${base()}/videos`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!job.id) throw new ProviderError("OpenRouter accepted the video but returned no job id")
  return job.id
}

export async function getVideoStatus(jobId: string): Promise<VideoJobStatus> {
  const job = await requestJson<{
    status?: string
    error?: string | null
    unsigned_urls?: string[]
    usage?: { cost?: number | null }
  }>(NAME, `${base()}/videos/${encodeURIComponent(jobId)}`, { headers: headers() })

  switch (job.status) {
    case "completed":
      return {
        state: "completed",
        outputUrl: job.unsigned_urls?.[0] ?? `${base()}/videos/${encodeURIComponent(jobId)}/content`,
        costUsd: num(job.usage?.cost),
      }
    case "failed":
    case "cancelled":
    case "expired":
      return { state: "failed", error: `OpenRouter job ${job.status}${job.error ? `: ${job.error}` : ""}` }
    default:
      return { state: "pending" }
  }
}

export async function downloadVideo(url: string): Promise<Buffer> {
  const own = new URL(url).host === new URL(base()).host || new URL(url).host.endsWith("openrouter.ai")
  return requestBytes(NAME, url, own ? { headers: { Authorization: headers().Authorization } } : undefined)
}
