import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { CharacterFormData } from "@/types/character"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const STYLES = ["Comic", "Manga", "Sketch", "Freeform"]

export async function POST() {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Generate a completely random and creative character concept. Be imaginative — mix unexpected genres, settings, and personalities. Avoid clichés.

Return ONLY a JSON object with no markdown, no code blocks, no explanation:
{
  "concept": string (a vivid 1-2 sentence character concept, e.g. "A retired war golem who now tends a flower shop"),
  "style": string (one of: ${STYLES.join(", ")}),
  "name": string (a fitting creative name),
  "age": string (e.g. "Ancient", "Mid-30s", "Teenager", "Unknown"),
  "moods": string[] (2-4 personality moods, e.g. ["melancholic", "determined"]),
  "colorLabel": string (a brief color theme description, e.g. "muted earth tones with flashes of gold")
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== "text") throw new Error("Unexpected Claude response")

  const formData = JSON.parse(content.text.trim()) as CharacterFormData
  return NextResponse.json(formData)
}
