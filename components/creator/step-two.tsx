"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Chip } from "@/components/chip"
import { ARTIST_PRESETS, addArtists } from "@/lib/artists"
import { POSES } from "@/lib/poses"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MOODS = [
  "Brooding", "Cheerful", "Fierce", "Gentle", "Mysterious",
  "Loyal", "Chaotic", "Wise", "Naive", "Cunning",
]

const AGE_OPTIONS = [
  "Child (8-12)", "Teen (13-17)", "Young Adult (18-25)",
  "Adult (26-40)", "Middle-Aged (41-60)", "Elder (60+)", "Ancient / Immortal",
]

const COLOR_PALETTES = [
  { label: "Dark & Moody", value: "dark_moody" },
  { label: "Vibrant & Bold", value: "vibrant_bold" },
  { label: "Pastel & Soft", value: "pastel_soft" },
  { label: "Earthy & Natural", value: "earthy_natural" },
  { label: "Neon & Cyber", value: "neon_cyber" },
  { label: "Let AI Decide", value: "ai_choice" },
]

interface StepTwoProps {
  name: string
  age: string
  moods: string[]
  colorLabel: string
  pose: string
  artists: string[]
  onNameChange: (v: string) => void
  onAgeChange: (v: string) => void
  onMoodsChange: (v: string[]) => void
  onColorChange: (v: string) => void
  onPoseChange: (v: string) => void
  onArtistsChange: (v: string[]) => void
  onBack: () => void
  onNext: () => void
}

export function StepTwo({
  name,
  age,
  moods,
  colorLabel,
  pose,
  artists = [],
  onNameChange,
  onAgeChange,
  onMoodsChange,
  onColorChange,
  onPoseChange,
  onArtistsChange,
  onBack,
  onNext,
}: StepTwoProps) {
  const [artistInput, setArtistInput] = useState("")

  const addArtist = (name: string) => {
    const next = addArtists(artists, name)
    if (next.length !== artists.length) onArtistsChange(next)
  }

  const addTypedArtist = () => {
    addArtist(artistInput)
    setArtistInput("")
  }

  const hasArtist = (name: string) =>
    artists.some((a) => a.toLowerCase() === name.toLowerCase())

  const removeArtist = (artist: string) => {
    onArtistsChange(artists.filter((a) => a !== artist))
  }

  const toggleMood = (mood: string) => {
    if (moods.includes(mood)) {
      onMoodsChange(moods.filter((m) => m !== mood))
    } else if (moods.length < 5) {
      onMoodsChange([...moods, mood])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Refine the Details</h2>
        <p className="text-muted-foreground text-sm">
          All fields are optional — Claude will fill in the blanks creatively.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Name (optional)</label>
        <Input
          placeholder="Leave blank to auto-generate..."
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="bg-card border-border"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Age / Era (optional)</label>
        <Select value={age} onValueChange={onAgeChange}>
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder="Select age range..." />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {AGE_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Mood / Personality{" "}
          <span className="text-muted-foreground font-normal">(pick up to 5)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((mood) => {
            const active = moods.includes(mood)
            return (
              <Chip key={mood} active={active} onClick={() => toggleMood(mood)}>
                {mood}
              </Chip>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Color Palette Preference</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COLOR_PALETTES.map((cp) => (
            <button
              key={cp.value}
              onClick={() => onColorChange(cp.value)}
              className={`text-sm py-2 px-3 rounded-lg border transition-all text-left ${
                colorLabel === cp.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {cp.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" id="pose-label">
          Pose / Angle{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="pose-label">
          {POSES.map((p) => (
            <Chip
              key={p}
              active={pose === p}
              onClick={() => onPoseChange(pose === p ? "" : p)}
            >
              {p}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Artist Inspiration{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Todd McFarlane, Moebius, Norman Rockwell…"
            value={artistInput}
            onChange={(e) => setArtistInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTypedArtist() } }}
            className="bg-card border-border"
          />
          <Button variant="outline" className="border-border" onClick={addTypedArtist}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ARTIST_PRESETS.map((name) => (
            <Chip
              key={name}
              active={hasArtist(name)}
              className="text-xs"
              onClick={() =>
                hasArtist(name)
                  ? onArtistsChange(artists.filter((a) => a.toLowerCase() !== name.toLowerCase()))
                  : addArtist(name)
              }
            >
              {hasArtist(name) ? "✓" : "+"} {name}
            </Chip>
          ))}
        </div>
        {artists.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {artists.map((artist) => (
              <Badge key={artist} variant="secondary" className="text-sm py-1 px-3 gap-1">
                {artist}
                <button
                  onClick={() => removeArtist(artist)}
                  className="ml-1 hover:text-foreground text-muted-foreground leading-none"
                  aria-label={`Remove ${artist}`}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 border-border"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          className="flex-1"
          style={{ backgroundColor: "#7C3AED" }}
          onClick={onNext}
        >
          Generate Character
        </Button>
      </div>
    </div>
  )
}
