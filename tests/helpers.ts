import { vi, type Mock } from "vitest"
import { NextRequest } from "next/server"

type ModelMock = Record<
  "findMany" | "findUnique" | "create" | "update" | "delete" | "deleteMany",
  Mock
>

export interface PrismaMock {
  character: ModelMock
  sketch: ModelMock
  drawingGuide: ModelMock
  drawingStep: ModelMock
  $transaction: Mock
}

function modelMock(): ModelMock {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
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
  concept: "A disgraced samurai",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
}
