"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GeneratedProfile } from "@/types/character"
import { CharacterFormData } from "@/types/character"

interface StepThreeProps {
  loading: boolean
  profile: GeneratedProfile | null
  imagePath: string | null
  formData: CharacterFormData
  onBack: () => void
  onRegenerate: () => void
}

export function StepThree({
  loading,
  profile,
  imagePath,
  formData,
  onBack,
  onRegenerate,
}: StepThreeProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          style: formData.style,
          age: formData.age ?? null,
          concept: formData.concept,
          imagePath: imagePath ?? null,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      router.push("/")
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">✨</span>
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Forging your character…</p>
          <p className="text-sm text-muted-foreground mt-1">
            Claude is crafting the profile, Gemini is painting the portrait
          </p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Character Ready!</h2>
        <Button
          variant="outline"
          size="sm"
          className="border-border text-sm"
          onClick={onRegenerate}
        >
          Regenerate
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {imagePath && (
          <div className="relative aspect-[3/4]">
            <Image
              src={imagePath}
              alt={profile.name}
              fill
              className="object-cover object-top"
            />
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-2xl font-bold text-foreground">{profile.name}</h3>
            {profile.tagline && (
              <p className="text-primary italic mt-1 text-sm">
                &ldquo;{profile.tagline}&rdquo;
              </p>
            )}
          </div>

          <p className="text-muted-foreground text-sm leading-relaxed">
            {profile.description}
          </p>

          <div className="flex flex-wrap gap-2">
            {profile.personality.map((trait) => (
              <Badge
                key={trait}
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-xs"
              >
                {trait}
              </Badge>
            ))}
          </div>

          {profile.colorPalette.length > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground">Palette:</span>
              {profile.colorPalette.map((color, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-border"
          onClick={onBack}
        >
          Start Over
        </Button>
        <Button
          className="flex-1"
          style={{ backgroundColor: "#7C3AED" }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save to Gallery"}
        </Button>
      </div>
    </div>
  )
}
