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
  imagePath: string | null
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
  artists?: string[]
}

export interface GeneratedProfile {
  name: string
  description: string
  tagline: string
  personality: string[]
  backstory: string
  colorPalette: string[]
}
