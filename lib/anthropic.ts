import Anthropic from "@anthropic-ai/sdk"
import { CharacterFormData, GeneratedProfile } from "@/types/character"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
  "colorPalette": string[] (exactly 5 hex color strings that fit the character)
}`

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  })

  const content = message.content[0]
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude")
  }

  const jsonText = content.text.trim()
  return JSON.parse(jsonText) as GeneratedProfile
}
