import { describe, it, expect, beforeEach, vi } from "vitest"
import { mockFetch, jsonResponse, bodyOf } from "../helpers"
import {
  HIGGSFIELD_IMAGE_MODELS,
  HIGGSFIELD_VIDEO_MODELS,
  generateImage,
  estimateVideo,
  submitVideo,
  getVideoStatus,
  downloadVideo,
} from "@/lib/media/higgsfield"

const BASE = "https://higgsfield.test"

beforeEach(() => {
  vi.stubEnv("HIGGSFIELD_API_KEY", "id:secret")
  vi.stubEnv("HIGGSFIELD_BASE_URL", BASE)
  vi.stubEnv("HIGGSFIELD_POLL_MS", "1")
})

const auth = (init: RequestInit) => (init.headers as Record<string, string>).Authorization

describe("catalogue", () => {
  it("offers Z-Image Turbo and Marketing Studio images, and three video models", () => {
    expect(HIGGSFIELD_IMAGE_MODELS.map((m) => m.id)).toEqual(["z-image/turbo", "marketing-studio/image"])
    expect(HIGGSFIELD_VIDEO_MODELS.map((m) => m.id)).toEqual(["seedance", "kling", "pixverse"])
  })
})

describe("generateImage", () => {
  it("submits, polls until completed and downloads the image", async () => {
    let polls = 0
    const fetch = mockFetch((url) => {
      if (url === `${BASE}/z-image/turbo`) return jsonResponse({ request_id: "r1", status_url: `${BASE}/requests/r1/status` })
      if (url === `${BASE}/requests/r1/status`)
        return jsonResponse(++polls < 2 ? { status: "in_progress" } : { status: "completed", images: [{ url: "https://cdn.test/i.png" }] })
      if (url === "https://cdn.test/i.png") return new Response(Buffer.from("img"))
      return jsonResponse({}, 404)
    })
    const out = await generateImage("z-image/turbo", { prompt: "ronin" })
    expect(out.toString()).toBe("img")
    const [, init] = fetch.mock.calls[0]
    expect(auth(init!)).toBe("Key id:secret")
    expect((init!.headers as Record<string, string>)["Idempotency-Key"]).toMatch(/\S/)
    expect(bodyOf(init!)).toEqual({ prompt: "ronin", resolution: "1k", aspect_ratio: "1:1" })
  })

  it("uploads a reference image for Marketing Studio and sends it as image_urls", async () => {
    const fetch = mockFetch((url, init) => {
      if (url === `${BASE}/files/generate-upload-url`)
        return jsonResponse({ upload_url: "https://store.test/put", upload_headers: { "x-amz": "1" }, public_url: "https://store.test/ref.png" })
      if (url === "https://store.test/put") {
        expect(auth(init)).toBeUndefined() // never send the key to storage
        return new Response(null, { status: 200 })
      }
      if (url === `${BASE}/marketing-studio/image`) return jsonResponse({ request_id: "r2" })
      if (url === `${BASE}/requests/r2/status`) return jsonResponse({ status: "completed", images: [{ url: "https://cdn.test/j.png" }] })
      return new Response(Buffer.from("img"))
    })
    await generateImage("marketing-studio/image", { prompt: "diagram", reference: Buffer.from("ref") })
    const submit = fetch.mock.calls.find(([u]) => u === `${BASE}/marketing-studio/image`)!
    expect(bodyOf(submit[1]!).image_urls).toEqual(["https://store.test/ref.png"])
  })

  it("ignores the reference for models that can't take one", async () => {
    const fetch = mockFetch((url) => {
      if (url === `${BASE}/z-image/turbo`) return jsonResponse({ request_id: "r3" })
      if (url.includes("/requests/")) return jsonResponse({ status: "completed", images: [{ url: "https://cdn.test/k.png" }] })
      return new Response(Buffer.from("img"))
    })
    await generateImage("z-image/turbo", { prompt: "p", reference: Buffer.from("ref") })
    expect(fetch.mock.calls.some(([u]) => String(u).includes("generate-upload-url"))).toBe(false)
  })

  it("reports moderation rejections and failures", async () => {
    mockFetch((url) =>
      url.includes("/requests/") ? jsonResponse({ status: "nsfw" }) : jsonResponse({ request_id: "r4" })
    )
    await expect(generateImage("z-image/turbo", { prompt: "p" })).rejects.toThrow(/moderation/i)
  })

  it("rejects unknown models", async () => {
    await expect(generateImage("nope/model", { prompt: "p" })).rejects.toThrow(/unknown/i)
  })
})

describe("video", () => {
  it("estimates via the free estimate endpoint with sound stated explicitly", async () => {
    const fetch = mockFetch(() => jsonResponse({ usd: 0.21 }))
    expect(await estimateVideo("kling", { prompt: "walks", durationSeconds: 5, sound: false })).toEqual({ usd: 0.21 })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/estimate/kling-video/v3.0/std/text-to-video`)
    expect(bodyOf(init!)).toEqual({ prompt: "walks", duration: 5, sound: "off" })
  })

  it("derives a list price from a per-second rate description", async () => {
    mockFetch(() => jsonResponse({ pricing_description: "$0.206 per second of generated video at 480p" }))
    expect(await estimateVideo("seedance", { prompt: "p", durationSeconds: 5, sound: false })).toEqual({
      usd: 1.03,
      listPrice: true,
    })
  })

  it("estimates image-to-video without uploading the image", async () => {
    const fetch = mockFetch(() => jsonResponse({ usd: 0.11 }))
    await estimateVideo("pixverse", { prompt: "p", durationSeconds: 5, sound: false, image: Buffer.from("x") })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${BASE}/estimate/pixverse/v6/image-to-video`)
    expect(bodyOf(init!).image_url).toMatch(/^https:\/\//)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("submits image-to-video with an uploaded image and returns the request id", async () => {
    const fetch = mockFetch((url) => {
      if (url.endsWith("generate-upload-url"))
        return jsonResponse({ upload_url: "https://store.test/put", public_url: "https://store.test/p.png" })
      if (url === "https://store.test/put") return new Response(null)
      return jsonResponse({ request_id: "vid1" })
    })
    expect(
      await submitVideo("seedance", { prompt: "breathes", durationSeconds: 5, sound: true, image: Buffer.from("x") })
    ).toBe("vid1")
    const submit = fetch.mock.calls.find(([u]) => u === `${BASE}/bytedance/seedance-2.5/image-to-video`)!
    expect(bodyOf(submit[1]!)).toEqual({
      prompt: "breathes",
      duration: 5,
      generate_audio: true,
      resolution: "480p",
      image_url: "https://store.test/p.png",
    })
  })

  it("maps job statuses", async () => {
    let reply: unknown
    mockFetch(() => jsonResponse(reply))
    reply = { status: "queued" }
    expect(await getVideoStatus("v")).toEqual({ state: "pending" })
    reply = { status: "completed", video: { url: "https://cdn.test/v.mp4" } }
    expect(await getVideoStatus("v")).toEqual({ state: "completed", outputUrl: "https://cdn.test/v.mp4", costUsd: null })
    reply = { status: "nsfw" }
    expect(await getVideoStatus("v")).toMatchObject({ state: "failed", error: expect.stringMatching(/moderation/) })
    reply = { status: "failed", error: "bad prompt" }
    expect(await getVideoStatus("v")).toMatchObject({ state: "failed", error: expect.stringMatching(/bad prompt/) })
  })

  it("downloads the finished clip without credentials", async () => {
    const fetch = mockFetch(() => new Response(Buffer.from("mp4")))
    expect((await downloadVideo("https://cdn.test/v.mp4")).toString()).toBe("mp4")
    expect(fetch.mock.calls[0][1]?.headers).toBeUndefined()
  })

  it("requires the API key", async () => {
    vi.stubEnv("HIGGSFIELD_API_KEY", "")
    await expect(estimateVideo("kling", { prompt: "p", durationSeconds: 5, sound: false })).rejects.toThrow(/HIGGSFIELD_API_KEY/)
  })
})
