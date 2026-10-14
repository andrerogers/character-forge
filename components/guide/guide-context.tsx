"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { del, messageOf, postJson } from "@/lib/api-client"
import { DEFAULT_GUIDE_STEPS } from "@/lib/guide"
import { DrawingGuide, GuidePlan } from "@/types/character"
import type { Engine } from "@/lib/media/types"

export type ImageStatus = "pending" | "done" | "error"

export interface GuideImageState {
  slot: string
  prompt: string
  status: ImageStatus
  imagePath?: string
  error?: string
}

// A guide being generated: Claude's plan plus the per-image progress.
export interface GuideDraft {
  plan: GuidePlan
  images: GuideImageState[] // one per step, then the overlay if requested
  saving: boolean
  engine: Engine | null // null = server default; retries reuse it
}

type Phase = "setup" | "planning" | "generating" | "saved"

interface GuideContextValue {
  characterId: string
  characterName: string
  guide: DrawingGuide | null
  draft: GuideDraft | null
  phase: Phase
  planError: string | null
  open: boolean
  activeStep: number
  stepCount: number
  includeOverlay: boolean
  imageEngine: Engine | null
  setImageEngine: (engine: Engine) => void
  setStepCount: (n: number) => void
  setIncludeOverlay: (v: boolean) => void
  openGuide: (stepIndex?: number) => void
  setOpen: (open: boolean) => void
  setActiveStep: (index: number) => void
  generate: () => Promise<void>
  retryImage: (slot: string) => void
  regenerate: () => Promise<void>
}

const GuideContext = createContext<GuideContextValue | null>(null)

export function useGuide() {
  const ctx = useContext(GuideContext)
  if (!ctx) throw new Error("useGuide must be used inside <GuideProvider>")
  return ctx
}

const allDone = (draft: GuideDraft) => draft.images.every((i) => i.status === "done")

export function GuideProvider({
  characterId,
  characterName,
  initialGuide,
  children,
}: {
  characterId: string
  characterName: string
  initialGuide: DrawingGuide | null
  children: React.ReactNode
}) {
  const [guide, setGuide] = useState(initialGuide)
  const [draft, setDraft] = useState<GuideDraft | null>(null)
  const [planning, setPlanning] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [stepCount, setStepCount] = useState(DEFAULT_GUIDE_STEPS)
  const [includeOverlay, setIncludeOverlay] = useState(false)
  const [imageEngine, setImageEngine] = useState<Engine | null>(null)

  const phase: Phase = guide ? "saved" : draft ? "generating" : planning ? "planning" : "setup"

  const openGuide = useCallback((stepIndex = 0) => {
    setActiveStep(stepIndex)
    setOpen(true)
  }, [])

  const updateImage = useCallback((slot: string, patch: Partial<GuideImageState>) => {
    setDraft((d) =>
      d && { ...d, images: d.images.map((img) => (img.slot === slot ? { ...img, ...patch } : img)) }
    )
  }, [])

  const requestImage = useCallback(
    async (slot: string, prompt: string, engine: Engine | null) => {
      updateImage(slot, { status: "pending", error: undefined })
      try {
        const { imagePath } = await postJson<{ imagePath: string }>("/api/generate/image", {
          characterId,
          slot,
          prompt,
          engine: engine ?? undefined,
        })
        updateImage(slot, { status: "done", imagePath })
      } catch (err) {
        updateImage(slot, { status: "error", error: messageOf(err) })
      }
    },
    [characterId, updateImage]
  )

  const generate = useCallback(async () => {
    setPlanning(true)
    setPlanError(null)
    setActiveStep(0)
    let plan: GuidePlan
    try {
      plan = await postJson<GuidePlan>("/api/generate/guide", {
        characterId,
        stepCount,
        includeOverlay,
      })
    } catch (err) {
      setPlanError(messageOf(err))
      toast.error("Guide generation failed", { description: messageOf(err) })
      return
    } finally {
      setPlanning(false)
    }

    const images: GuideImageState[] = plan.steps.map((s) => ({
      slot: `step-${s.stepNumber}`,
      prompt: s.imagePrompt,
      status: "pending",
    }))
    if (plan.overlayPrompt) {
      images.push({ slot: "overlay", prompt: plan.overlayPrompt, status: "pending" })
    }
    setDraft({ plan, images, saving: false, engine: imageEngine })

    // One image call per step, all in parallel; each step renders as it lands.
    images.forEach((img) => requestImage(img.slot, img.prompt, imageEngine))
  }, [characterId, stepCount, includeOverlay, imageEngine, requestImage])

  const retryImage = useCallback(
    (slot: string) => {
      const img = draft?.images.find((i) => i.slot === slot)
      if (img) requestImage(slot, img.prompt, draft!.engine)
    },
    [draft, requestImage]
  )

  // Persist once every image has resolved successfully.
  useEffect(() => {
    if (!draft || draft.saving || !allDone(draft)) return
    setDraft({ ...draft, saving: true })

    const overlay = draft.images.find((i) => i.slot === "overlay")
    const steps = draft.plan.steps.map((s) => ({
      stepNumber: s.stepNumber,
      title: s.title,
      instructions: s.instructions,
      imagePath: draft.images.find((i) => i.slot === `step-${s.stepNumber}`)!.imagePath!,
    }))

    postJson<DrawingGuide>(`/api/characters/${characterId}/guide`, {
      proportionSystem: draft.plan.proportionSystem,
      overlayImagePath: overlay?.imagePath ?? null,
      steps,
    })
      .then((saved) => {
        setGuide(saved)
        setDraft(null)
        toast.success("Drawing guide saved")
      })
      .catch((err) => {
        setDraft((d) => d && { ...d, saving: false })
        toast.error("Could not save the guide", { description: messageOf(err) })
      })
  }, [draft, characterId])

  const regenerate = useCallback(async () => {
    if (!window.confirm("Discard this guide and generate a new one?")) return
    try {
      await del(`/api/characters/${characterId}/guide`)
    } catch (err) {
      // Already gone is fine; anything else stops here.
      if (!/no guide/i.test(messageOf(err))) {
        toast.error("Could not delete the guide", { description: messageOf(err) })
        return
      }
    }
    setGuide(null)
    setDraft(null)
    setActiveStep(0)
  }, [characterId])

  return (
    <GuideContext.Provider
      value={{
        characterId,
        characterName,
        guide,
        draft,
        phase,
        planError,
        open,
        activeStep,
        stepCount,
        includeOverlay,
        imageEngine,
        setImageEngine,
        setStepCount,
        setIncludeOverlay,
        openGuide,
        setOpen,
        setActiveStep,
        generate,
        retryImage,
        regenerate,
      }}
    >
      {children}
    </GuideContext.Provider>
  )
}
