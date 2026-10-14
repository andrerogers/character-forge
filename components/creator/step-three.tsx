"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CharacterFormData, GeneratedProfile } from "@/types/character"
import { messageOf, postJson } from "@/lib/api-client"

export type GenerationPhase = "idle" | "profile" | "image"

interface StepThreeProps {
  phase: GenerationPhase
  profile: GeneratedProfile | null
  imagePath: string | null
  imageSource: string | null
  profileError: string | null
  imageError: string | null
  formData: CharacterFormData
  onBack: () => void
  onEditDetails: () => void
  onRegenerate: () => void
  onRetryImage: () => void
}

function Spinner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6" role="status">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  )
}

export function StepThree({
  phase,
  profile,
  imagePath,
  imageSource,
  profileError,
  imageError,
  formData,
  onBack,
  onEditDetails,
  onRegenerate,
  onRetryImage,
}: StepThreeProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const busy = phase !== "idle"

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const saved = await postJson<{ id: string }>("/api/characters", {
        ...profile,
        style: formData.style,
        age: formData.age || null,
        concept: formData.concept,
        imagePath: imagePath ?? null,
        imageSource: imagePath ? imageSource : null,
      })
      toast.success(`${profile.name} saved to the gallery`)
      router.push(`/characters/${saved.id}`)
    } catch (err) {
      toast.error("Could not save character", { description: messageOf(err) })
      setSaving(false)
    }
  }

  if (phase === "profile") {
    return (
      <Spinner
        title="Forging your character…"
        subtitle="Claude is crafting the profile, then Gemini paints the portrait"
      />
    )
  }

  if (profileError || !profile) {
    return (
      <div className="flex flex-col items-center text-center py-12 gap-4" role="alert">
        <p className="font-semibold text-foreground">The profile couldn&apos;t be generated</p>
        <p className="text-sm text-muted-foreground max-w-md">
          {profileError ?? "Something went wrong."}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="border-border" onClick={onEditDetails}>
            Edit Details
          </Button>
          <Button style={{ backgroundColor: "#7C3AED" }} onClick={onRegenerate}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {phase === "image" ? "Painting the portrait…" : "Character Ready!"}
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="border-border text-sm"
          onClick={onRegenerate}
          disabled={busy || saving}
        >
          Regenerate
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {phase === "image" ? (
          <div className="relative aspect-[3/4] bg-muted animate-pulse flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Gemini is painting…</p>
          </div>
        ) : imagePath ? (
          <div className="relative aspect-[3/4]">
            <Image
              src={imagePath}
              alt={profile.name}
              fill
              className="object-cover object-top"
            />
          </div>
        ) : imageError ? (
          <div
            className="aspect-[3/4] bg-muted flex flex-col items-center justify-center gap-3 p-6 text-center"
            role="alert"
          >
            <p className="text-sm font-medium">The portrait couldn&apos;t be generated</p>
            <p className="text-xs text-muted-foreground">{imageError}</p>
            <Button size="sm" variant="outline" className="border-border" onClick={onRetryImage}>
              Retry Portrait
            </Button>
          </div>
        ) : null}

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

          {imagePath && imageSource && (
            <p className="text-xs text-muted-foreground">Portrait by {imageSource}</p>
          )}

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

          {profile.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground">Tags:</span>
              {profile.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

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
          disabled={saving}
        >
          Start Over
        </Button>
        <Button
          className="flex-1"
          style={{ backgroundColor: "#7C3AED" }}
          onClick={handleSave}
          disabled={busy || saving}
        >
          {saving ? "Saving…" : "Save to Gallery"}
        </Button>
      </div>
    </div>
  )
}
