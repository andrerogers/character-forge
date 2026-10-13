import type { GuidePlan, DrawingStepPlan, DrawingStep } from "@/types/character"
import { defaultProportionSystem, isProportionSystem, overlayPromptFor } from "@/lib/proportions"

export const MIN_GUIDE_STEPS = 2
export const MAX_GUIDE_STEPS = 8
export const DEFAULT_GUIDE_STEPS = 4

interface PlanOptions {
  stepCount: number
  includeOverlay: boolean
  style: string
  description?: string
}

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "")

// Validates Claude's guide JSON. Accepts either a bare array of steps or an
// object with steps / proportionSystem / overlayPrompt.
export function parseGuidePlan(raw: unknown, opts: PlanOptions): GuidePlan {
  const obj = (Array.isArray(raw) ? { steps: raw } : raw) as Record<string, unknown> | null
  const rawSteps = obj && Array.isArray(obj.steps) ? obj.steps : null
  if (!rawSteps) throw new Error("Guide response had no steps")
  if (rawSteps.length < opts.stepCount) {
    throw new Error(`Expected ${opts.stepCount} steps, got ${rawSteps.length}`)
  }

  const steps: DrawingStepPlan[] = rawSteps.slice(0, opts.stepCount).map((s, i) => {
    const step = (s ?? {}) as Record<string, unknown>
    const parsed = {
      stepNumber: i + 1,
      title: text(step.title),
      instructions: text(step.instructions),
      imagePrompt: text(step.imagePrompt),
    }
    if (!parsed.title || !parsed.instructions || !parsed.imagePrompt) {
      throw new Error(`Step ${i + 1} is missing a title, instructions or imagePrompt`)
    }
    return parsed
  })

  const proportionSystem = isProportionSystem(obj?.proportionSystem)
    ? obj.proportionSystem
    : defaultProportionSystem(opts.style, opts.description)

  const plan: GuidePlan = { steps, proportionSystem }
  if (opts.includeOverlay) {
    plan.overlayPrompt = text(obj?.overlayPrompt) || overlayPromptFor(proportionSystem)
  }
  return plan
}

export interface GuideSaveData {
  proportionSystem: string | null
  overlayImagePath: string | null
  steps: DrawingStep[]
}

type Result = { ok: true; data: GuideSaveData } | { ok: false; error: string }

// Validates the client's request to persist a finished guide. Image paths must
// point inside this character's guide folder.
export function parseGuideSave(body: unknown, characterId: string): Result {
  const b = (body ?? {}) as Record<string, unknown>
  const prefix = `/uploads/guides/${characterId}/`
  const isOwnPath = (p: unknown): p is string =>
    typeof p === "string" && p.startsWith(prefix) && !p.includes("..")

  if (!Array.isArray(b.steps) || b.steps.length === 0) {
    return { ok: false, error: "steps must be a non-empty array" }
  }
  if (b.steps.length > MAX_GUIDE_STEPS) {
    return { ok: false, error: `at most ${MAX_GUIDE_STEPS} steps are allowed` }
  }

  const steps: DrawingStep[] = []
  const numbers = new Set<number>()
  for (const s of b.steps as Record<string, unknown>[]) {
    const stepNumber = s?.stepNumber
    if (!Number.isInteger(stepNumber) || (stepNumber as number) < 1 || numbers.has(stepNumber as number)) {
      return { ok: false, error: "each step needs a unique positive stepNumber" }
    }
    numbers.add(stepNumber as number)
    const title = text(s.title)
    const instructions = text(s.instructions)
    if (!title || !instructions) {
      return { ok: false, error: `step ${stepNumber} needs a title and instructions` }
    }
    if (!isOwnPath(s.imagePath)) {
      return { ok: false, error: `step ${stepNumber} has an invalid imagePath` }
    }
    steps.push({ stepNumber: stepNumber as number, title, instructions, imagePath: s.imagePath })
  }

  const overlay = b.overlayImagePath ?? null
  if (overlay !== null && !isOwnPath(overlay)) {
    return { ok: false, error: "invalid overlayImagePath" }
  }

  return {
    ok: true,
    data: {
      proportionSystem: isProportionSystem(b.proportionSystem) ? b.proportionSystem : null,
      overlayImagePath: overlay,
      steps: steps.sort((a, c) => a.stepNumber - c.stepNumber),
    },
  }
}
