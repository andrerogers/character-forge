"use client"

import { useState } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/chip"
import { cn } from "@/lib/utils"
import { MAX_GUIDE_STEPS, MIN_GUIDE_STEPS } from "@/lib/guide"
import { PROPORTION_SYSTEMS, isProportionSystem } from "@/lib/proportions"
import { type ImageStatus, useGuide } from "./guide-context"

interface StepView {
  stepNumber: number
  title: string
  instructions: string
  slot: string
  status: ImageStatus
  imagePath?: string
  error?: string
}

interface OverlayView {
  slot: string
  status: ImageStatus
  imagePath?: string
  error?: string
}

// Normalises a saved guide or an in-progress draft into one shape.
function useGuideView(): { steps: StepView[]; overlay: OverlayView | null; proportionSystem: string | null } {
  const { guide, draft } = useGuide()
  if (guide) {
    return {
      steps: guide.steps.map((s) => ({ ...s, slot: `step-${s.stepNumber}`, status: "done" })),
      overlay: guide.overlayImagePath
        ? { slot: "overlay", status: "done", imagePath: guide.overlayImagePath }
        : null,
      proportionSystem: guide.proportionSystem,
    }
  }
  if (draft) {
    const bySlot = new Map(draft.images.map((i) => [i.slot, i]))
    return {
      steps: draft.plan.steps.map((s) => {
        const img = bySlot.get(`step-${s.stepNumber}`)!
        return { ...s, slot: img.slot, status: img.status, imagePath: img.imagePath, error: img.error }
      }),
      overlay: bySlot.get("overlay") ?? null,
      proportionSystem: draft.plan.proportionSystem,
    }
  }
  return { steps: [], overlay: null, proportionSystem: null }
}

export function GuideDrawer() {
  const { open, setOpen, phase, characterName, draft, regenerate } = useGuide()
  const { steps, overlay, proportionSystem } = useGuideView()

  const images = draft?.images ?? []
  const ready = images.filter((i) => i.status === "done").length

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full md:w-[70vw] flex-col border-l border-border bg-background shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
          aria-describedby={undefined}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 sm:px-6 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-semibold truncate">
                Drawing Guide: {characterName}
              </DialogPrimitive.Title>
              <p className="text-xs text-muted-foreground">
                {phase === "generating" &&
                  (draft?.saving ? "Saving guide…" : `${ready} of ${images.length} images ready`)}
                {phase === "saved" &&
                  proportionSystem &&
                  isProportionSystem(proportionSystem) &&
                  `Proportions: ${PROPORTION_SYSTEMS[proportionSystem]}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {phase === "saved" && (
                <Button variant="outline" size="sm" className="border-border" onClick={regenerate}>
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Regenerate Guide</span>
                </Button>
              )}
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close guide">
                  <X className="w-5 h-5" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {phase === "setup" && <SetupPanel />}
            {phase === "planning" && (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-center" role="status">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="font-medium">Claude is planning the steps…</p>
                <p className="text-sm text-muted-foreground">Images start as soon as the plan is ready.</p>
              </div>
            )}
            {(phase === "generating" || phase === "saved") && (
              <StepViewer steps={steps} overlay={overlay} />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function SetupPanel() {
  const { stepCount, setStepCount, includeOverlay, setIncludeOverlay, generate, planError } = useGuide()
  const counts = Array.from({ length: MAX_GUIDE_STEPS - MIN_GUIDE_STEPS + 1 }, (_, i) => i + MIN_GUIDE_STEPS)

  return (
    <form
      className="max-w-lg mx-auto px-4 sm:px-6 py-10 space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        generate()
      }}
    >
      <div>
        <h3 className="text-xl font-semibold">Create a step-by-step guide</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Claude writes the steps and Gemini draws an instructional diagram for each one. The
          finished guide is saved with this character.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium" id="step-count-label">
          Number of steps
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="step-count-label">
          {counts.map((n) => (
            <Chip key={n} active={stepCount === n} onClick={() => setStepCount(n)} className="w-10 justify-center">
              {n}
            </Chip>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={includeOverlay}
          onChange={(e) => setIncludeOverlay(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#7C3AED]"
        />
        <span>
          <span className="text-sm font-medium">Include anatomy overlay</span>
          <span className="block text-xs text-muted-foreground">
            Adds a proportion-lines diagram (realistic, manga or chibi head units, chosen from the
            character&apos;s style) that you can toggle over any step.
          </span>
        </span>
      </label>

      {planError && (
        <p className="text-sm text-destructive flex gap-2" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {planError}
        </p>
      )}

      <Button type="submit" className="w-full" style={{ backgroundColor: "#7C3AED" }}>
        Generate Guide
      </Button>
    </form>
  )
}

function StepViewer({ steps, overlay }: { steps: StepView[]; overlay: OverlayView | null }) {
  const { activeStep, setActiveStep, retryImage } = useGuide()
  const [showProportions, setShowProportions] = useState(false)
  const index = Math.min(activeStep, Math.max(steps.length - 1, 0))
  const step = steps[index]
  if (!step) return null

  const go = (i: number) => setActiveStep(Math.max(0, Math.min(steps.length - 1, i)))
  const overlayReady = overlay?.status === "done" && !!overlay.imagePath

  return (
    <div
      className="flex flex-col md:flex-row h-full"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault()
          go(index + 1)
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault()
          go(index - 1)
        }
      }}
    >
      <nav
        aria-label="Guide steps"
        className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-border overflow-x-auto md:overflow-y-auto"
      >
        <ol className="flex md:flex-col gap-1 p-2 md:p-3">
          {steps.map((s, i) => (
            <li key={s.stepNumber} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === index ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                  i === index ? "bg-primary/15 text-primary" : "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    i === index ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  )}
                >
                  {s.status === "pending" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : s.status === "error" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    s.stepNumber
                  )}
                </span>
                <span className="hidden md:block truncate">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <article className="flex-1 min-w-0 p-4 sm:p-6 space-y-4">
        <div className="relative mx-auto w-full max-w-2xl aspect-square max-h-[55vh] rounded-xl border border-border bg-white overflow-hidden">
          {step.status === "pending" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted animate-pulse" role="status">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drawing step {step.stepNumber}…</p>
            </div>
          )}
          {step.status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-6 text-center" role="alert">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <p className="text-sm">This step&apos;s image failed.</p>
              {step.error && <p className="text-xs text-muted-foreground">{step.error}</p>}
              <Button size="sm" variant="outline" onClick={() => retryImage(step.slot)}>
                Retry image
              </Button>
            </div>
          )}
          {step.imagePath && step.status === "done" && (
            // Plain <img>: paths carry a ?v= cache-buster for regenerated guides
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={step.imagePath}
              alt={`Step ${step.stepNumber}: ${step.title}`}
              className={cn(
                "absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
                showProportions && overlayReady ? "opacity-0" : "opacity-100"
              )}
            />
          )}
          {overlayReady && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={overlay!.imagePath}
              alt="Proportion overlay"
              className={cn(
                "absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
                showProportions ? "opacity-100" : "opacity-0"
              )}
              aria-hidden={!showProportions}
            />
          )}
        </div>

        {overlay && (
          <div className="flex justify-center">
            {overlayReady ? (
              <Button
                variant="outline"
                size="sm"
                aria-pressed={showProportions}
                className={cn("border-border", showProportions && "border-primary text-primary")}
                onClick={() => setShowProportions((v) => !v)}
              >
                {showProportions ? "Hide Proportions" : "Show Proportions"}
              </Button>
            ) : overlay.status === "error" ? (
              <Button variant="outline" size="sm" onClick={() => retryImage(overlay.slot)}>
                Proportion overlay failed. Retry
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Drawing proportion overlay…
              </p>
            )}
          </div>
        )}

        <div className="mx-auto max-w-2xl space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Step {step.stepNumber} of {steps.length}
          </p>
          <h3 className="text-xl font-semibold">{step.title}</h3>
          <p className="leading-relaxed text-foreground/90">{step.instructions}</p>
        </div>

        <div className="mx-auto max-w-2xl flex justify-between pt-2">
          <Button variant="outline" className="border-border" onClick={() => go(index - 1)} disabled={index === 0}>
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <Button
            variant="outline"
            className="border-border"
            onClick={() => go(index + 1)}
            disabled={index === steps.length - 1}
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </article>
    </div>
  )
}
