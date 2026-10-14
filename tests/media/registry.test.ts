import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  configuredImageProviders,
  configuredVideoProviders,
  defaultImageEngine,
  defaultVideoEngine,
  resolveImageEngine,
  resolveVideoEngine,
  EngineError,
} from "@/lib/media/registry"

beforeEach(() => {
  for (const k of ["GEMINI_API_KEY", "OPENROUTER_API_KEY", "HIGGSFIELD_API_KEY", "IMAGE_PROVIDER", "IMAGE_MODEL", "VIDEO_PROVIDER", "VIDEO_MODEL"]) {
    vi.stubEnv(k, "")
  }
})

describe("configured providers", () => {
  it("follows which API keys are set", () => {
    expect(configuredImageProviders()).toEqual([])
    vi.stubEnv("GEMINI_API_KEY", "g")
    vi.stubEnv("OPENROUTER_API_KEY", "o")
    vi.stubEnv("HIGGSFIELD_API_KEY", "h")
    expect(configuredImageProviders()).toEqual(["gemini", "openrouter", "higgsfield"])
    expect(configuredVideoProviders()).toEqual(["openrouter", "higgsfield"])
  })
})

describe("defaults", () => {
  it("prefers IMAGE_PROVIDER / IMAGE_MODEL", () => {
    vi.stubEnv("OPENROUTER_API_KEY", "o")
    vi.stubEnv("IMAGE_PROVIDER", "openrouter")
    vi.stubEnv("IMAGE_MODEL", "openai/gpt-5.4-image-2")
    expect(defaultImageEngine()).toEqual({ provider: "openrouter", model: "openai/gpt-5.4-image-2" })
  })

  it("falls back to the first configured provider and its default model", () => {
    vi.stubEnv("HIGGSFIELD_API_KEY", "h")
    expect(defaultImageEngine()).toEqual({ provider: "higgsfield", model: "z-image/turbo" })
    vi.stubEnv("GEMINI_API_KEY", "g")
    expect(defaultImageEngine()).toEqual({ provider: "gemini", model: "gemini-2.5-flash-image" })
  })

  it("uses Gemini when nothing is configured (original behaviour)", () => {
    expect(defaultImageEngine()).toEqual({ provider: "gemini", model: "gemini-2.5-flash-image" })
  })

  it("has no default video engine without a video provider", () => {
    expect(defaultVideoEngine()).toBeNull()
    vi.stubEnv("HIGGSFIELD_API_KEY", "h")
    expect(defaultVideoEngine()).toEqual({ provider: "higgsfield", model: "seedance" })
    vi.stubEnv("VIDEO_PROVIDER", "openrouter")
    vi.stubEnv("VIDEO_MODEL", "google/veo-3.1")
    vi.stubEnv("OPENROUTER_API_KEY", "o")
    expect(defaultVideoEngine()).toEqual({ provider: "openrouter", model: "google/veo-3.1" })
  })
})

describe("resolveImageEngine", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "g")
    vi.stubEnv("OPENROUTER_API_KEY", "o")
  })

  it("returns the default when nothing is requested", () => {
    expect(resolveImageEngine(undefined)).toEqual({ provider: "gemini", model: "gemini-2.5-flash-image" })
  })

  it("accepts any well-formed OpenRouter model id", () => {
    expect(resolveImageEngine({ provider: "openrouter", model: "black-forest-labs/flux.2-pro" })).toEqual({
      provider: "openrouter",
      model: "black-forest-labs/flux.2-pro",
    })
  })

  it("rejects unconfigured providers, malformed ids and unknown Higgsfield models", () => {
    expect(() => resolveImageEngine({ provider: "higgsfield", model: "z-image/turbo" })).toThrow(EngineError)
    expect(() => resolveImageEngine({ provider: "openrouter", model: "no spaces allowed" })).toThrow(EngineError)
    expect(() => resolveImageEngine({ provider: "openrouter", model: "" })).toThrow(EngineError)
    expect(() => resolveImageEngine({ provider: "dall-e", model: "x" })).toThrow(EngineError)
    vi.stubEnv("HIGGSFIELD_API_KEY", "h")
    expect(() => resolveImageEngine({ provider: "higgsfield", model: "made/up" })).toThrow(EngineError)
  })

  it("uses the provider's default model when only the provider is given", () => {
    expect(resolveImageEngine({ provider: "openrouter" })).toEqual({
      provider: "openrouter",
      model: "google/gemini-2.5-flash-image",
    })
  })
})

describe("resolveVideoEngine", () => {
  it("requires a configured video provider", () => {
    expect(() => resolveVideoEngine(undefined)).toThrow(EngineError)
    vi.stubEnv("HIGGSFIELD_API_KEY", "h")
    expect(resolveVideoEngine(undefined)).toEqual({ provider: "higgsfield", model: "seedance" })
    expect(() => resolveVideoEngine({ provider: "higgsfield", model: "sora" })).toThrow(EngineError)
  })
})
