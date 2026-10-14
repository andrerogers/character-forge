import { describe, it, expect } from "vitest"
import { errorMessage } from "@/lib/http"

describe("errorMessage", () => {
  it("summarises SDK errors by HTTP status", () => {
    const err = Object.assign(new Error('{"error":{"code":500}}'), { status: 500 })
    expect(errorMessage(err)).toBe("the AI service returned an error (500)")
    expect(errorMessage(Object.assign(new Error("x"), { status: 429 }))).toMatch(/rate limiting/)
    expect(errorMessage(Object.assign(new Error("x"), { status: 401 }))).toMatch(/API key/)
  })

  it("passes plain messages through, truncated", () => {
    expect(errorMessage(new Error("Expected 4 steps, got 2"))).toBe("Expected 4 steps, got 2")
    expect(errorMessage(new Error("x".repeat(300)))).toHaveLength(201)
  })
})
