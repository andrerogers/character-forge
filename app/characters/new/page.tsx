"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { StepIndicator } from "@/components/creator/step-indicator"
import { StepOne } from "@/components/creator/step-one"
import { StepTwo } from "@/components/creator/step-two"
import { StepThree, type GenerationPhase } from "@/components/creator/step-three"
import { GeneratedProfile } from "@/types/character"
import { messageOf, postJson } from "@/lib/api-client"
import type { Engine } from "@/lib/media/types"

interface FormData {
  concept: string
  style: string
  name: string
  age: string
  moods: string[]
  colorLabel: string
  pose: string
  artists: string[]
}

const DEFAULT_FORM: FormData = {
  concept: "",
  style: "",
  name: "",
  age: "",
  moods: [],
  colorLabel: "",
  pose: "",
  artists: [],
}

export default function NewCharacterPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM)
  const [phase, setPhase] = useState<GenerationPhase>("idle")
  const [profile, setProfile] = useState<GeneratedProfile | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imageSource, setImageSource] = useState<string | null>(null)
  // null = the server's default engine
  const [imageEngine, setImageEngine] = useState<Engine | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const update = (key: keyof FormData, value: string | string[]) =>
    setFormData((prev) => ({ ...prev, [key]: value }))

  const generatePortrait = async (forProfile: GeneratedProfile) => {
    setPhase("image")
    setImageError(null)
    try {
      // Pose and artists are ephemeral: they shape the image prompt only.
      const result = await postJson<{ imagePath: string; imageSource: string }>("/api/generate/image", {
        profile: forProfile,
        style: formData.style,
        pose: formData.pose || undefined,
        artists: formData.artists.length > 0 ? formData.artists : undefined,
        engine: imageEngine ?? undefined,
      })
      setImagePath(result.imagePath)
      setImageSource(result.imageSource)
    } catch (err) {
      setImageError(messageOf(err))
      toast.error("Portrait generation failed", { description: messageOf(err) })
    } finally {
      setPhase("idle")
    }
  }

  // Also used by "Regenerate": re-runs both calls with the current form data
  // and replaces the preview.
  const handleGenerate = async () => {
    setStep(3)
    setPhase("profile")
    setProfile(null)
    setImagePath(null)
    setImageSource(null)
    setProfileError(null)
    setImageError(null)

    let generated: GeneratedProfile
    try {
      generated = await postJson<GeneratedProfile>("/api/generate/profile", {
        concept: formData.concept,
        style: formData.style,
        name: formData.name || undefined,
        age: formData.age || undefined,
        moods: formData.moods,
        colorLabel: formData.colorLabel || undefined,
      })
    } catch (err) {
      setProfileError(messageOf(err))
      setPhase("idle")
      toast.error("Profile generation failed", { description: messageOf(err) })
      return
    }

    setProfile(generated)
    await generatePortrait(generated)
  }

  const handleStartOver = () => {
    setStep(1)
    setProfile(null)
    setImagePath(null)
    setProfileError(null)
    setImageError(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Gallery
          </Link>
          <h1 className="text-lg font-semibold">
            Character<span className="text-primary">Forge</span>
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <StepIndicator currentStep={step} />

        <div className="rounded-2xl border border-border p-6 bg-card">
          {step === 1 && (
            <StepOne
              concept={formData.concept}
              style={formData.style}
              onConceptChange={(v) => update("concept", v)}
              onStyleChange={(v) => update("style", v)}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepTwo
              name={formData.name}
              age={formData.age}
              moods={formData.moods}
              colorLabel={formData.colorLabel}
              pose={formData.pose}
              artists={formData.artists}
              imageEngine={imageEngine}
              onImageEngineChange={setImageEngine}
              onNameChange={(v) => update("name", v)}
              onAgeChange={(v) => update("age", v)}
              onMoodsChange={(v) => update("moods", v)}
              onColorChange={(v) => update("colorLabel", v)}
              onPoseChange={(v) => update("pose", v)}
              onArtistsChange={(v) => update("artists", v)}
              onBack={() => setStep(1)}
              onNext={handleGenerate}
            />
          )}
          {step === 3 && (
            <StepThree
              phase={phase}
              profile={profile}
              imagePath={imagePath}
              imageSource={imageSource}
              profileError={profileError}
              imageError={imageError}
              formData={formData}
              onBack={handleStartOver}
              onEditDetails={() => setStep(2)}
              onRegenerate={handleGenerate}
              onRetryImage={() => profile && generatePortrait(profile)}
            />
          )}
        </div>
      </main>
    </div>
  )
}
