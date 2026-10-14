import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockFetch, jsonResponse, bodyOf } from "../helpers"
import {
  generateImage,
  listImageModels,
  listVideoModels,
  estimateVideoPrice,
  submitVideo,
  getVideoStatus,
  downloadVideo,
} from "@/lib/media/openrouter"

const BASE = "https://openrouter.test/api/v1"
const png = Buffer.from("png-bytes")

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test")
  vi.stubEnv("OPENROUTER_BASE_URL", BASE)
})

describe("generateImage", () => {
  it("calls chat completions with image modality and decodes the data URL", async () => {
    const fetch = mockFetch(() =>
      jsonResponse({
        choices: [{ message: { images: [{ type: "image_url", image_url: { url: `data:image/png;base64,${png.toString("base64")}` } }] } }],
      })
    )
    const out = await generateImage("google/gemini-2.5-flash-image", { prompt: "a ronin" })
    expect(out.toString()).toBe("png-bytes")
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/chat/completions`)
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer sk-or-test")
    const body = bodyOf(init!)
    expect(body.model).toBe("google/gemini-2.5-flash-image")
    expect(body.modalities).toEqual(["image", "text"])
    expect(body.messages[0].content).toBe("a ronin")
  })

  it("sends a reference image as an image_url content part", async () => {
    const fetch = mockFetch(() =>
      jsonResponse({ choices: [{ message: { images: [{ image_url: { url: `data:image/png;base64,${png.toString("base64")}` } }] } }] })
    )
    await generateImage("m/x", { prompt: "diagram", reference: Buffer.from("ref") })
    const content = bodyOf(fetch.mock.calls[0][1]!).messages[0].content
    expect(content[0]).toEqual({ type: "text", text: "diagram" })
    expect(content[1]).toEqual({
      type: "image_url",
      image_url: { url: `data:image/png;base64,${Buffer.from("ref").toString("base64")}` },
    })
  })

  it("fetches http image URLs", async () => {
    mockFetch((url) =>
      url.endsWith("/chat/completions")
        ? jsonResponse({ choices: [{ message: { images: [{ image_url: { url: "https://cdn.test/a.png" } }] } }] })
        : new Response(png)
    )
    expect((await generateImage("m/x", { prompt: "p" })).toString()).toBe("png-bytes")
  })

  it("explains when the model returns no image", async () => {
    mockFetch(() => jsonResponse({ choices: [{ message: { content: "I can't draw that." } }] }))
    await expect(generateImage("m/x", { prompt: "p" })).rejects.toThrow(/no image.*I can't draw that/i)
  })

  it("surfaces HTTP errors with their status", async () => {
    mockFetch(() => jsonResponse({ error: { message: "Insufficient credits" } }, 402))
    await expect(generateImage("m/x", { prompt: "p" })).rejects.toMatchObject({
      status: 402,
      message: expect.stringMatching(/Insufficient credits/),
    })
  })

  it("requires an API key", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "")
    await expect(generateImage("m/x", { prompt: "p" })).rejects.toThrow(/OPENROUTER_API_KEY/)
  })
})

describe("model lists", () => {
  it("lists image models via output_modalities=image", async () => {
    const fetch = mockFetch(() =>
      jsonResponse({ data: [{ id: "google/gemini-2.5-flash-image", name: "Google: Nano Banana" }] })
    )
    expect(await listImageModels()).toEqual([
      { id: "google/gemini-2.5-flash-image", label: "Google: Nano Banana" },
    ])
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}/models?output_modalities=image`)
  })

  it("lists video models with their capabilities", async () => {
    mockFetch(() =>
      jsonResponse({
        data: [
          {
            id: "google/veo-3.1",
            name: "Veo 3.1",
            supported_durations: [4, 6, 8],
            supported_frame_images: ["first_frame", "last_frame"],
            generate_audio: true,
            pricing_skus: { video_second: "0.40" },
          },
          { id: "text/only", name: "Text Only", supported_frame_images: [], generate_audio: false },
        ],
      })
    )
    const models = await listVideoModels()
    expect(models[0]).toEqual({
      id: "google/veo-3.1",
      label: "Veo 3.1",
      durations: [4, 6, 8],
      supportsImage: true,
      supportsAudio: true,
      pricing: { video_second: "0.40" },
    })
    expect(models[1]).toMatchObject({ supportsImage: false, supportsAudio: false, durations: null })
  })
})

describe("estimateVideoPrice", () => {
  const model = (pricing: Record<string, unknown> | undefined) => ({
    id: "m/v",
    label: "v",
    durations: null,
    supportsImage: true,
    supportsAudio: true,
    pricing,
  })

  it("multiplies a per-second rate by the duration", () => {
    expect(estimateVideoPrice(model({ video_second: "0.10" }), 5, false)).toEqual({ usd: 0.5 })
  })

  it("prefers the audio rate when sound is on and one exists", () => {
    const p = model({ video_second: "0.10", video_second_audio: "0.20" })
    expect(estimateVideoPrice(p, 5, true)).toEqual({ usd: 1 })
    expect(estimateVideoPrice(p, 5, false)).toEqual({ usd: 0.5 })
  })

  it("uses a flat per-video price", () => {
    expect(estimateVideoPrice(model({ generate: 0.3 }), 8, false)).toEqual({ usd: 0.3 })
  })

  it("returns null with a note when pricing is unknown", () => {
    expect(estimateVideoPrice(model(undefined), 5, false)).toMatchObject({ usd: null, note: expect.any(String) })
    expect(estimateVideoPrice(null, 5, false)).toMatchObject({ usd: null })
  })
})

describe("video jobs", () => {
  it("submits text-to-video", async () => {
    const fetch = mockFetch(() => jsonResponse({ id: "job1", status: "pending", polling_url: `${BASE}/videos/job1` }, 202))
    expect(await submitVideo("google/veo-3.1", { prompt: "walks", durationSeconds: 5, sound: false })).toBe("job1")
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/videos`)
    expect(bodyOf(init!)).toEqual({ model: "google/veo-3.1", prompt: "walks", duration: 5, generate_audio: false })
  })

  it("submits image-to-video with the image as the first frame", async () => {
    const fetch = mockFetch(() => jsonResponse({ id: "job2", status: "pending" }, 202))
    await submitVideo("m/v", { prompt: "breathes", durationSeconds: 4, sound: true, image: Buffer.from("img") })
    expect(bodyOf(fetch.mock.calls[0][1]!).frame_images).toEqual([
      {
        type: "image_url",
        image_url: { url: `data:image/png;base64,${Buffer.from("img").toString("base64")}` },
        frame_type: "first_frame",
      },
    ])
  })

  it("maps pending, completed and failed statuses", async () => {
    let reply: unknown
    mockFetch(() => jsonResponse(reply))

    reply = { id: "j", status: "in_progress" }
    expect(await getVideoStatus("j")).toEqual({ state: "pending" })

    reply = { id: "j", status: "completed", unsigned_urls: ["https://cdn.test/v.mp4"], usage: { cost: 0.25 } }
    expect(await getVideoStatus("j")).toEqual({ state: "completed", outputUrl: "https://cdn.test/v.mp4", costUsd: 0.25 })

    reply = { id: "j", status: "completed" }
    expect(await getVideoStatus("j")).toEqual({ state: "completed", outputUrl: `${BASE}/videos/j/content`, costUsd: null })

    for (const status of ["failed", "cancelled", "expired"]) {
      reply = { id: "j", status, error: "content policy" }
      expect(await getVideoStatus("j")).toEqual({ state: "failed", error: expect.stringMatching(new RegExp(status)) })
    }
  })

  it("downloads with the API key for OpenRouter URLs only", async () => {
    const fetch = mockFetch(() => new Response(Buffer.from("mp4")))
    expect((await downloadVideo(`${BASE}/videos/j/content`)).toString()).toBe("mp4")
    expect((fetch.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBe("Bearer sk-or-test")
    await downloadVideo("https://cdn.elsewhere.test/v.mp4")
    expect((fetch.mock.calls[1][1]?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined()
  })
})
