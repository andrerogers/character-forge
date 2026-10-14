export type ImageProviderId = "gemini" | "openrouter" | "higgsfield"
export type VideoProviderId = "openrouter" | "higgsfield"

export interface Engine {
  provider: string
  model: string
}

export interface ImageRequest {
  prompt: string
  // Optional reference image (e.g. the portrait, for guide diagrams)
  reference?: Buffer | null
}

export interface VideoRequest {
  prompt: string
  durationSeconds: number
  sound: boolean
  // Present for image-to-video: animated from this first frame
  image?: Buffer | null
}

export interface PriceEstimate {
  usd: number | null
  // True when the figure is a list price, before any account discount
  listPrice?: boolean
  note?: string
}

export type VideoJobStatus =
  | { state: "pending" }
  | { state: "completed"; outputUrl: string; costUsd: number | null }
  | { state: "failed"; error: string }

export interface ModelOption {
  id: string
  label: string
}

export interface VideoModelOption extends ModelOption {
  // Allowed durations in seconds, or null when the provider doesn't say
  durations: number[] | null
  minSeconds?: number
  supportsImage: boolean
  supportsAudio: boolean
  pricing?: Record<string, unknown>
}
