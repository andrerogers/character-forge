// Which image/video providers are usable (by API key) and which model a
// request should use. Requests may name an engine; it's validated here.
import type { Engine, ImageProviderId, VideoProviderId } from "./types"
import { HIGGSFIELD_IMAGE_MODELS, HIGGSFIELD_VIDEO_MODELS } from "./higgsfield"

export class EngineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EngineError"
  }
}

export const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"
export const OPENROUTER_DEFAULT_IMAGE_MODEL = "google/gemini-2.5-flash-image"

export const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Gemini (direct)",
  openrouter: "OpenRouter",
  higgsfield: "Higgsfield",
}

const KEYS: Record<string, string> = {
  gemini: "GEMINI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  higgsfield: "HIGGSFIELD_API_KEY",
}

// OpenRouter ids look like "vendor/model" (optionally ":variant")
const OPENROUTER_ID = /^[\w.-]+\/[\w.:-]+$/

const hasKey = (provider: string) => !!process.env[KEYS[provider]]

export function configuredImageProviders(): ImageProviderId[] {
  return (["gemini", "openrouter", "higgsfield"] as const).filter(hasKey)
}

export function configuredVideoProviders(): VideoProviderId[] {
  return (["openrouter", "higgsfield"] as const).filter(hasKey)
}

function defaultImageModel(provider: string): string | null {
  switch (provider) {
    case "gemini":
      return GEMINI_IMAGE_MODEL
    case "openrouter":
      return OPENROUTER_DEFAULT_IMAGE_MODEL
    case "higgsfield":
      return HIGGSFIELD_IMAGE_MODELS[0].id
    default:
      return null
  }
}

function defaultVideoModel(provider: string): string | null {
  if (provider === "higgsfield") return HIGGSFIELD_VIDEO_MODELS[0].id
  // OpenRouter's catalogue changes; there is no safe hard-coded default.
  return null
}

function validImageModel(provider: string, model: string) {
  if (provider === "gemini") return /^gemini-[\w.-]+$/.test(model)
  if (provider === "openrouter") return OPENROUTER_ID.test(model)
  if (provider === "higgsfield") return HIGGSFIELD_IMAGE_MODELS.some((m) => m.id === model)
  return false
}

function validVideoModel(provider: string, model: string) {
  if (provider === "openrouter") return OPENROUTER_ID.test(model)
  if (provider === "higgsfield") return HIGGSFIELD_VIDEO_MODELS.some((m) => m.id === model)
  return false
}

export function defaultImageEngine(): Engine {
  const configured = configuredImageProviders()
  const envProvider = process.env.IMAGE_PROVIDER
  if (envProvider && configured.includes(envProvider as ImageProviderId)) {
    const model = process.env.IMAGE_MODEL || defaultImageModel(envProvider)!
    if (validImageModel(envProvider, model)) return { provider: envProvider, model }
  }
  // With nothing configured, keep the original behaviour (Gemini) so the
  // error says which key is missing.
  const provider = configured[0] ?? "gemini"
  return { provider, model: defaultImageModel(provider)! }
}

export function defaultVideoEngine(): Engine | null {
  const configured = configuredVideoProviders()
  const envProvider = process.env.VIDEO_PROVIDER
  if (envProvider && configured.includes(envProvider as VideoProviderId)) {
    const model = process.env.VIDEO_MODEL || defaultVideoModel(envProvider)
    if (model && validVideoModel(envProvider, model)) return { provider: envProvider, model }
  }
  for (const provider of configured) {
    const model = defaultVideoModel(provider)
    if (model) return { provider, model }
  }
  return null
}

function parse(input: unknown): { provider: string; model?: string } | null {
  if (input === undefined || input === null) return null
  if (typeof input !== "object") throw new EngineError("engine must be an object")
  const { provider, model } = input as Record<string, unknown>
  if (typeof provider !== "string") throw new EngineError("engine.provider is required")
  if (model !== undefined && typeof model !== "string") throw new EngineError("engine.model must be a string")
  return { provider, model: (model as string | undefined)?.trim() }
}

export function resolveImageEngine(input: unknown): Engine {
  const req = parse(input)
  if (!req) return defaultImageEngine()
  const { provider } = req
  if (!(provider in KEYS)) throw new EngineError(`Unknown image provider "${provider}"`)
  if (!hasKey(provider)) throw new EngineError(`${PROVIDER_LABELS[provider]} is not configured: set ${KEYS[provider]} in .env.local`)
  const model = req.model === undefined ? defaultImageModel(provider)! : req.model
  if (!validImageModel(provider, model)) {
    throw new EngineError(`"${model}" is not a valid ${PROVIDER_LABELS[provider]} image model`)
  }
  return { provider, model }
}

export function resolveVideoEngine(input: unknown): Engine {
  const req = parse(input)
  if (!req) {
    const engine = defaultVideoEngine()
    if (!engine) {
      throw new EngineError(
        configuredVideoProviders().length
          ? "Choose a video model"
          : "No video provider configured: set OPENROUTER_API_KEY or HIGGSFIELD_API_KEY in .env.local"
      )
    }
    return engine
  }
  const { provider } = req
  if (provider !== "openrouter" && provider !== "higgsfield") {
    throw new EngineError(`Unknown video provider "${provider}"`)
  }
  if (!hasKey(provider)) throw new EngineError(`${PROVIDER_LABELS[provider]} is not configured: set ${KEYS[provider]} in .env.local`)
  const model = req.model || defaultVideoModel(provider)
  if (!model || !validVideoModel(provider, model)) {
    throw new EngineError(`"${model ?? ""}" is not a valid ${PROVIDER_LABELS[provider]} video model`)
  }
  return { provider, model }
}
