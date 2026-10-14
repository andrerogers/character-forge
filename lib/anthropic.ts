import Anthropic from "@anthropic-ai/sdk"
import {
  Character,
  CharacterFormData,
  GeneratedProfile,
  GuidePlan,
} from "@/types/character"
import { parseModelJson } from "@/lib/json"
import { normalizeTags } from "@/lib/tags"
import { parseGuidePlan } from "@/lib/guide"
import { PROPORTION_SYSTEMS } from "@/lib/proportions"

const MODEL = "claude-sonnet-4-6"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function complete(prompt: string, maxTokens: number): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  })

  const content = message.content[0]
  if (content?.type !== "text") {
    throw new Error("Unexpected response type from Claude")
  }
  return content.text
}

export async function generateCharacterProfile(
  formData: CharacterFormData
): Promise<GeneratedProfile> {
  const prompt = `You are a creative character designer. Generate a rich character profile as valid JSON.

Concept: ${formData.concept}
Style: ${formData.style}
Name: ${formData.name || "generate a creative name"}
Age/Era: ${formData.age || "unspecified"}
Mood/Personality hints: ${formData.moods.length > 0 ? formData.moods.join(", ") : "none specified"}
Color preference: ${formData.colorLabel || "any"}

Return ONLY a JSON object with no markdown, no code blocks, no explanation:
{
  "name": string,
  "description": string (2-3 sentences vivid physical and personality description),
  "tagline": string (one punchy memorable line),
  "personality": string[] (3-5 single-word or short traits),
  "backstory": string (2-3 paragraphs rich narrative backstory),
  "colorPalette": string[] (exactly 5 hex color strings that fit the character),
  "tags": string[] (3-5 short Title Case tags for browsing a reference gallery, in this order: 1) the character archetype, e.g. "Warrior", "Mage", "Rogue", "Scholar"; 2) the art style, e.g. "${formData.style}"; 3) the drawing difficulty for an artist: "Beginner", "Intermediate" or "Advanced"; then 0-2 extra tags such as setting or genre)
}`

  const profile = parseModelJson<GeneratedProfile>(await complete(prompt, 1024))
  return { ...profile, tags: normalizeTags(profile.tags) }
}

export async function generateDrawingGuide(
  character: Pick<Character, "name" | "description" | "style" | "personality" | "concept">,
  { stepCount, includeOverlay }: { stepCount: number; includeOverlay: boolean }
): Promise<GuidePlan> {
  const systems = Object.entries(PROPORTION_SYSTEMS)
    .map(([key, label]) => `"${key}" (${label})`)
    .join(", ")

  const overlayField = includeOverlay
    ? `,
  "overlayPrompt": string (an image-generation prompt for a proportion-lines overlay of this character in a neutral standing pose: horizontal head-unit guide lines, numbered head units, labelled anatomical landmarks, using the chosen proportion system)`
    : ""

  const prompt = `You are an experienced drawing instructor writing a step-by-step guide for a hobbyist artist who wants to draw this character.

Character: ${character.name}
Concept: ${character.concept}
Art style: ${character.style}
Description: ${character.description}
Personality: ${character.personality.join(", ") || "unspecified"}

Write exactly ${stepCount} steps that progress from gesture and basic construction through to finished line art / inking. Each step builds on the previous one.

Choose the proportion system that suits the character's style: ${systems}. Use realistic for Comic, Sketch and Freeform styles, manga for Manga style, and chibi only if the character is explicitly chibi or super-deformed.

For every step, "imagePrompt" must describe an instructional drawing diagram for that stage: construction lines, basic shapes and labelled proportions, clean lines on a plain white background, no shading or colour. Each diagram shows the drawing as it should look at the end of that step.

Return ONLY a JSON object with no markdown, no code blocks, no explanation:
{
  "proportionSystem": "realistic" | "manga" | "chibi",
  "steps": [
    {
      "stepNumber": number (1-${stepCount}),
      "title": string (2-4 words, e.g. "Gesture & Flow"),
      "instructions": string (2-4 sentences of practical guidance),
      "imagePrompt": string
    }
  ]${overlayField}
}`

  const raw = parseModelJson(await complete(prompt, 4096))
  return parseGuidePlan(raw, {
    stepCount,
    includeOverlay,
    style: character.style,
    description: `${character.concept} ${character.description}`,
  })
}

export async function generateRandomConcept(): Promise<CharacterFormData> {
  const styles = ["Comic", "Manga", "Sketch", "Freeform"]
  const prompt = `Generate a completely random and creative character concept. Be imaginative — mix unexpected genres, settings, and personalities. Avoid clichés.

Return ONLY a JSON object with no markdown, no code blocks, no explanation:
{
  "concept": string (a vivid 1-2 sentence character concept, e.g. "A retired war golem who now tends a flower shop"),
  "style": string (one of: ${styles.join(", ")}),
  "name": string (a fitting creative name),
  "age": string (e.g. "Ancient", "Mid-30s", "Teenager", "Unknown"),
  "moods": string[] (2-4 personality moods, e.g. ["melancholic", "determined"]),
  "colorLabel": string (a brief color theme description, e.g. "muted earth tones with flashes of gold")
}`

  return parseModelJson<CharacterFormData>(await complete(prompt, 512))
}
