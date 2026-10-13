"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CharacterFormData, GeneratedProfile } from "@/types/character"

type Stage = "idle" | "concept" | "profile" | "image" | "saving"

const STAGE_LABELS: Record<Stage, string> = {
  idle: "Random",
  concept: "Imagining…",
  profile: "Crafting profile…",
  image: "Painting portrait…",
  saving: "Saving…",
}

export function RandomButton() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("idle")

  const handleRandom = async () => {
    if (stage !== "idle") return
    try {
      setStage("concept")
      const conceptRes = await fetch("/api/generate/random", { method: "POST" })
      if (!conceptRes.ok) throw new Error("Random concept failed")
      const formData: CharacterFormData = await conceptRes.json()

      setStage("profile")
      const profileRes = await fetch("/api/generate/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!profileRes.ok) throw new Error("Profile generation failed")
      const profile: GeneratedProfile = await profileRes.json()

      setStage("image")
      const imageRes = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, style: formData.style }),
      })
      const imagePath: string | null = imageRes.ok
        ? (await imageRes.json()).imagePath
        : null

      setStage("saving")
      const saveRes = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          style: formData.style,
          age: formData.age ?? null,
          concept: formData.concept,
          imagePath,
        }),
      })
      if (!saveRes.ok) throw new Error("Save failed")
      const saved = await saveRes.json()
      router.push(`/characters/${saved.id}`)
    } catch (err) {
      console.error(err)
      toast.error("Random character failed", {
        description: err instanceof Error ? err.message : undefined,
      })
      setStage("idle")
    }
  }

  const busy = stage !== "idle"

  return (
    <Button variant="outline" onClick={handleRandom} disabled={busy} className="gap-2">
      <Shuffle className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
      {STAGE_LABELS[stage]}
    </Button>
  )
}
