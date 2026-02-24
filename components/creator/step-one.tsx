"use client"

import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const QUICK_STARTS = [
  "A disgraced samurai seeking redemption",
  "An elven hacker in a cyberpunk city",
  "A time-traveling archaeologist",
  "A demon who fell in love with a saint",
  "A child genius who built a robot companion",
]

const STYLES = ["Comic", "Manga", "Sketch", "Freeform"]

interface StepOneProps {
  concept: string
  style: string
  onConceptChange: (value: string) => void
  onStyleChange: (value: string) => void
  onNext: () => void
}

export function StepOne({
  concept,
  style,
  onConceptChange,
  onStyleChange,
  onNext,
}: StepOneProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">What's your character?</h2>
        <p className="text-muted-foreground text-sm">
          Describe your character concept. The more detail, the richer the result.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Character Concept</label>
        <Textarea
          placeholder="A brooding warrior from a forgotten realm who wields shadow magic..."
          value={concept}
          onChange={(e) => onConceptChange(e.target.value)}
          className="min-h-[120px] bg-card border-border resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Quick Start</label>
        <div className="flex flex-wrap gap-2">
          {QUICK_STARTS.map((qs) => (
            <Badge
              key={qs}
              variant="secondary"
              className="cursor-pointer text-xs py-1 px-2 hover:bg-primary/20 hover:text-primary transition-colors"
              onClick={() => onConceptChange(qs)}
            >
              {qs}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Art Style</label>
        <Select value={style} onValueChange={onStyleChange}>
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder="Choose a style..." />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {STYLES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full"
        style={{ backgroundColor: "#7C3AED" }}
        onClick={onNext}
        disabled={!concept.trim() || !style}
      >
        Next: Add Details
      </Button>
    </div>
  )
}
