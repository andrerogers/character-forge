"use client"

import { useState } from "react"
import Link from "next/link"
import { StepIndicator } from "@/components/creator/step-indicator"
import { StepOne } from "@/components/creator/step-one"
import { StepTwo } from "@/components/creator/step-two"
import { StepThree } from "@/components/creator/step-three"
import { GeneratedProfile } from "@/types/character"

interface FormData {
  concept: string
  style: string
  name: string
  age: string
  moods: string[]
  colorLabel: string
  artists: string[]
}

const DEFAULT_FORM: FormData = {
  concept: "",
  style: "",
  name: "",
  age: "",
  moods: [],
  colorLabel: "",
  artists: [],
}

export default function NewCharacterPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<GeneratedProfile | null>(null)
  const [imagePath, setImagePath] = useState<string | null>(null)

  const update = (key: keyof FormData, value: string | string[]) =>
    setFormData((prev) => ({ ...prev, [key]: value }))

  const handleGenerate = async () => {
    setStep(3)
    setLoading(true)
    setProfile(null)
    setImagePath(null)

    try {
      // Generate profile and image in parallel
      const [profileRes, imageRes] = await Promise.all([
        fetch("/api/generate/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concept: formData.concept,
            style: formData.style,
            name: formData.name || undefined,
            age: formData.age || undefined,
            moods: formData.moods,
            colorLabel: formData.colorLabel || undefined,
          }),
        }),
        // We need profile first for image, so we chain below
        Promise.resolve(null),
      ])

      if (!profileRes.ok) throw new Error("Profile generation failed")
      const generatedProfile: GeneratedProfile = await profileRes.json()
      setProfile(generatedProfile)

      // Now generate image with the profile
      const imgRes = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: generatedProfile,
          style: formData.style,
          artists: formData.artists.length > 0 ? formData.artists : undefined,
        }),
      })

      if (imgRes.ok) {
        const { imagePath: path } = await imgRes.json()
        setImagePath(path)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = () => {
    setStep(1)
    setProfile(null)
    setImagePath(null)
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
              artists={formData.artists}
              onNameChange={(v) => update("name", v)}
              onAgeChange={(v) => update("age", v)}
              onMoodsChange={(v) => update("moods", v)}
              onColorChange={(v) => update("colorLabel", v)}
              onArtistsChange={(v) => update("artists", v)}
              onBack={() => setStep(1)}
              onNext={handleGenerate}
            />
          )}
          {step === 3 && (
            <StepThree
              loading={loading}
              profile={profile}
              imagePath={imagePath}
              formData={formData}
              onBack={handleRegenerate}
              onRegenerate={handleGenerate}
            />
          )}
        </div>
      </main>
    </div>
  )
}
