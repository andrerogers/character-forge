import { vi, type Mock } from "vitest"
import { NextRequest } from "next/server"

type ModelMock = Record<
  "findMany" | "findUnique" | "create" | "update" | "updateMany" | "delete" | "deleteMany",
  Mock
>

export interface PrismaMock {
  character: ModelMock
  sketch: ModelMock
  drawingGuide: ModelMock
  drawingStep: ModelMock
  video: ModelMock
  $transaction: Mock
}

function modelMock(): ModelMock {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  }
}

export function createPrismaMock(): PrismaMock {
  return {
    character: modelMock(),
    sketch: modelMock(),
    drawingGuide: modelMock(),
    drawingStep: modelMock(),
    video: modelMock(),
    $transaction: vi.fn(),
  }
}

export function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(new URL(url, "http://localhost"), {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function routeParams<T extends Record<string, string>>(p: T) {
  return { params: Promise.resolve(p) }
}

export const sampleCharacter = {
  id: "char1",
  name: "Kaida",
  description: "A wandering ronin.",
  tagline: "Steel remembers.",
  style: "Manga",
  age: "Young Adult (18-25)",
  personality: ["Stoic"],
  backstory: "Long ago...",
  colorPalette: ["#000000"],
  tags: ["Ronin", "Manga", "Intermediate"],
  imagePath: "/uploads/char1.png",
  imageSource: null,
  concept: "A disgraced samurai",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}

// Replaces global fetch with a handler; returns the mock so tests can
// inspect calls as [url, init].
export function mockFetch(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>
) {
  const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init ?? {}))
  )
  vi.stubGlobal("fetch", fn)
  return fn
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export const bodyOf = (init: RequestInit) => JSON.parse(String(init.body))

export const sampleVideo = {
  id: "vid1",
  createdAt: new Date("2026-01-02"),
  updatedAt: new Date("2026-01-02"),
  characterId: "char1",
  provider: "higgsfield",
  model: "kling",
  mode: "image",
  prompt: "breathes",
  durationSeconds: 5,
  sound: false,
  status: "pending",
  jobId: "job1",
  videoPath: null,
  error: null,
  estimatedCostUsd: 0.21,
  costUsd: null,
}
