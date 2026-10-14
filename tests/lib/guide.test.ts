import { describe, it, expect } from "vitest"
import { parseGuidePlan, parseGuideSave } from "@/lib/guide"

const rawSteps = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    stepNumber: i + 1,
    title: ` Step ${i + 1} `,
    instructions: "Do the thing.",
    imagePrompt: "diagram",
  }))

describe("parseGuidePlan", () => {
  it("accepts a bare array of steps and fills the proportion system from style", () => {
    const plan = parseGuidePlan(rawSteps(4), { stepCount: 4, includeOverlay: false, style: "Manga" })
    expect(plan.steps).toHaveLength(4)
    expect(plan.steps[0].title).toBe("Step 1")
    expect(plan.proportionSystem).toBe("manga")
    expect(plan.overlayPrompt).toBeUndefined()
  })

  it("accepts an object with steps, proportionSystem and overlayPrompt", () => {
    const plan = parseGuidePlan(
      { steps: rawSteps(3), proportionSystem: "chibi", overlayPrompt: "lines" },
      { stepCount: 3, includeOverlay: true, style: "Manga" }
    )
    expect(plan.proportionSystem).toBe("chibi")
    expect(plan.overlayPrompt).toBe("lines")
  })

  it("drops the overlay prompt when no overlay was requested", () => {
    const plan = parseGuidePlan(
      { steps: rawSteps(2), overlayPrompt: "lines" },
      { stepCount: 2, includeOverlay: false, style: "Comic" }
    )
    expect(plan.overlayPrompt).toBeUndefined()
  })

  it("builds a fallback overlay prompt when one was requested but not returned", () => {
    const plan = parseGuidePlan({ steps: rawSteps(2) }, { stepCount: 2, includeOverlay: true, style: "Comic" })
    expect(plan.overlayPrompt).toMatch(/7\.5/)
  })

  it("ignores an invalid proportion system", () => {
    const plan = parseGuidePlan(
      { steps: rawSteps(2), proportionSystem: "heroic" },
      { stepCount: 2, includeOverlay: false, style: "Comic" }
    )
    expect(plan.proportionSystem).toBe("realistic")
  })

  it("trims extra steps and renumbers sequentially", () => {
    const steps = rawSteps(6).map((s) => ({ ...s, stepNumber: s.stepNumber * 10 }))
    const plan = parseGuidePlan(steps, { stepCount: 4, includeOverlay: false, style: "Comic" })
    expect(plan.steps.map((s) => s.stepNumber)).toEqual([1, 2, 3, 4])
  })

  it("throws when fewer steps than requested come back", () => {
    expect(() =>
      parseGuidePlan(rawSteps(2), { stepCount: 4, includeOverlay: false, style: "Comic" })
    ).toThrow()
  })

  it("throws when a step is missing required text", () => {
    const steps = rawSteps(2)
    steps[1].instructions = ""
    expect(() =>
      parseGuidePlan(steps, { stepCount: 2, includeOverlay: false, style: "Comic" })
    ).toThrow()
  })
})

describe("parseGuideSave", () => {
  const base = "/uploads/guides/char1/"
  const valid = {
    proportionSystem: "manga",
    overlayImagePath: `${base}overlay.png?v=1`,
    steps: [
      { stepNumber: 1, title: "Gesture", instructions: "Loose lines.", imagePath: `${base}step-1.png?v=1` },
      { stepNumber: 2, title: "Shapes", instructions: "Block in.", imagePath: `${base}step-2.png?v=1` },
    ],
  }

  it("accepts a valid payload", () => {
    const result = parseGuideSave(valid, "char1")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.steps).toHaveLength(2)
  })

  it("allows a missing overlay", () => {
    const result = parseGuideSave({ ...valid, overlayImagePath: null }, "char1")
    expect(result.ok && result.data.overlayImagePath).toBe(null)
  })

  it("rejects an empty step list", () => {
    expect(parseGuideSave({ ...valid, steps: [] }, "char1").ok).toBe(false)
  })

  it("rejects image paths outside this character's guide folder", () => {
    const steps = [{ ...valid.steps[0], imagePath: "/uploads/guides/other/step-1.png" }]
    expect(parseGuideSave({ ...valid, steps }, "char1").ok).toBe(false)
    expect(parseGuideSave({ ...valid, overlayImagePath: "/etc/passwd" }, "char1").ok).toBe(false)
  })

  it("rejects steps missing a title or instructions", () => {
    const steps = [{ ...valid.steps[0], title: "" }]
    expect(parseGuideSave({ ...valid, steps }, "char1").ok).toBe(false)
  })

  it("rejects duplicate step numbers", () => {
    const steps = [valid.steps[0], { ...valid.steps[1], stepNumber: 1 }]
    expect(parseGuideSave({ ...valid, steps }, "char1").ok).toBe(false)
  })
})
