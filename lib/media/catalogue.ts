// Model lists for the pickers. OpenRouter's catalogue is fetched live and
// cached for 10 minutes; when that fails, a short fallback list is used and
// any OpenRouter model id can still be typed in.
import type { ModelOption, VideoModelOption } from "./types"
import * as openrouter from "./openrouter"
import { HIGGSFIELD_IMAGE_MODELS, HIGGSFIELD_VIDEO_MODELS } from "./higgsfield"
import { GEMINI_IMAGE_MODEL, OPENROUTER_DEFAULT_IMAGE_MODEL } from "./registry"

const TTL_MS = 10 * 60 * 1000

const FALLBACK_OPENROUTER_IMAGE: ModelOption[] = [
  { id: OPENROUTER_DEFAULT_IMAGE_MODEL, label: "Google: Gemini 2.5 Flash Image" },
  { id: "google/gemini-3.1-flash-image-preview", label: "Google: Gemini 3.1 Flash Image (preview)" },
  { id: "openai/gpt-5.4-image-2", label: "OpenAI: GPT Image 2" },
]

const cache = new Map<string, { at: number; value: unknown; live: boolean }>()

async function cached<T>(key: string, load: () => Promise<T>, fallback: T): Promise<{ value: T; live: boolean }> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return { value: hit.value as T, live: hit.live }
  try {
    const value = await load()
    cache.set(key, { at: Date.now(), value, live: true })
    return { value, live: true }
  } catch (err) {
    console.warn(`Could not load ${key}:`, err instanceof Error ? err.message : err)
    // Cache the fallback briefly so a dead network doesn't slow every request
    cache.set(key, { at: Date.now() - TTL_MS + 60_000, value: fallback, live: false })
    return { value: fallback, live: false }
  }
}

export function clearCatalogueCache() {
  cache.clear()
}

export async function getImageModels(provider: string): Promise<{ models: ModelOption[]; live: boolean }> {
  if (provider === "gemini") return { models: [{ id: GEMINI_IMAGE_MODEL, label: "Gemini 2.5 Flash Image" }], live: true }
  if (provider === "higgsfield") {
    return { models: HIGGSFIELD_IMAGE_MODELS.map(({ id, label }) => ({ id, label })), live: true }
  }
  const { value, live } = await cached("openrouter-image-models", openrouter.listImageModels, FALLBACK_OPENROUTER_IMAGE)
  return { models: value, live }
}

export async function getVideoModels(provider: string): Promise<{ models: VideoModelOption[]; live: boolean }> {
  if (provider === "higgsfield") {
    const models = HIGGSFIELD_VIDEO_MODELS.map(({ id, label, durations, minSeconds, supportsImage, supportsAudio }) => ({
      id,
      label,
      durations,
      minSeconds,
      supportsImage,
      supportsAudio,
    }))
    return { models, live: true }
  }
  if (provider === "openrouter") {
    const { value, live } = await cached("openrouter-video-models", openrouter.listVideoModels, [] as VideoModelOption[])
    return { models: value, live }
  }
  return { models: [], live: true }
}
