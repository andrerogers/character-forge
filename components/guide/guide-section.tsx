"use client"

import { BookOpen, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGuide } from "./guide-context"
import { GuideDrawer } from "./guide-drawer"

export function GuideButton() {
  const { openGuide } = useGuide()
  return (
    <Button variant="outline" className="border-border" onClick={() => openGuide()}>
      <BookOpen className="w-4 h-4" />
      Drawing Guide
    </Button>
  )
}

// The guide's permanent spot on the detail page, plus the drawer itself.
export function GuideSection() {
  const { guide, phase, draft, openGuide } = useGuide()

  return (
    <section className="space-y-4" aria-labelledby="guide-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="guide-heading" className="text-lg font-semibold">
            Drawing Guide
          </h2>
          <p className="text-sm text-muted-foreground">
            {guide
              ? `${guide.steps.length} steps from gesture to finished line art.`
              : phase === "planning" || phase === "generating"
                ? "Generating…"
                : "Step-by-step construction diagrams for this character."}
          </p>
        </div>
        <Button variant="outline" className="border-border" onClick={() => openGuide()}>
          {phase === "planning" || (phase === "generating" && !draft?.saving) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BookOpen className="w-4 h-4" />
          )}
          {guide ? "Open Guide" : phase === "setup" ? "Create Guide" : "View Progress"}
        </Button>
      </div>

      {guide && (
        <ol className="flex gap-3 overflow-x-auto pb-2">
          {guide.steps.map((step, i) => (
            <li key={step.stepNumber} className="shrink-0 w-36">
              <button
                type="button"
                onClick={() => openGuide(i)}
                className="block w-full text-left rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={step.imagePath} alt="" className="aspect-square w-full object-contain bg-white" />
                <span className="block px-2 py-1.5 text-xs">
                  <span className="text-muted-foreground">{step.stepNumber}.</span> {step.title}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <GuideDrawer />
    </section>
  )
}
