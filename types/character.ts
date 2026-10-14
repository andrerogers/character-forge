export interface Character {
  id: string
  name: string
  description: string
  tagline: string | null
  style: string
  age: string | null
  personality: string[]
  backstory: string | null
  colorPalette: string[]
  tags: string[]
  imagePath: string | null
  imageSource: string | null
  concept: string
  createdAt: Date
  updatedAt: Date
}

export interface CharacterFormData {
  concept: string
  style: string
  name?: string
  age?: string
  moods: string[]
  colorLabel?: string
  // Ephemeral: forwarded to the image prompt only, never persisted
  pose?: string
  artists?: string[]
}

export interface GeneratedProfile {
  name: string
  description: string
  tagline: string
  personality: string[]
  backstory: string
  colorPalette: string[]
  // 3–5 tags, ordered: archetype, style, difficulty, then extras
  tags: string[]
}

export interface Sketch {
  id: string
  createdAt: Date | string
  characterId: string
  imagePath: string
  note: string | null
}

export type ProportionSystem = "realistic" | "manga" | "chibi"

// What Claude returns for each step, before images exist
export interface DrawingStepPlan {
  stepNumber: number
  title: string
  instructions: string
  imagePrompt: string
}

export interface GuidePlan {
  steps: DrawingStepPlan[]
  proportionSystem: ProportionSystem
  // Present only when an anatomy overlay was requested
  overlayPrompt?: string
}

export interface DrawingStep {
  id?: string
  stepNumber: number
  title: string
  instructions: string
  imagePath: string
}

export interface DrawingGuide {
  id: string
  createdAt: Date | string
  characterId: string
  proportionSystem: string | null
  overlayImagePath: string | null
  steps: DrawingStep[]
}

export type VideoStatus = "pending" | "saving" | "completed" | "failed"

export interface Video {
  id: string
  createdAt: Date | string
  updatedAt: Date | string
  characterId: string
  provider: string
  model: string
  mode: string // "text" | "image"
  prompt: string
  durationSeconds: number
  sound: boolean
  status: string
  jobId: string | null
  videoPath: string | null
  error: string | null
  estimatedCostUsd: number | null
  costUsd: number | null
}

export interface CharacterWithRelations extends Character {
  sketches: Sketch[]
  guide: DrawingGuide | null
  videos: Video[]
}
