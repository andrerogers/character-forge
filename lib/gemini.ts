import { GoogleGenAI } from "@google/genai"
import { GeneratedProfile } from "@/types/character"

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
})

const STYLE_DIRECTIVES: Record<string, string> = {
  Comic:
    "American comic book art style. Bold black ink outlines, flat cel-shaded colors, halftone dot shading, high contrast, dynamic heroic pose, vivid saturated colors, superhero comic panel aesthetic.",
  Manga:
    "Japanese manga art style. Clean crisp ink lines, screentone shading, large expressive eyes, sharp angular features, dynamic speed lines, black and white with selective spot color, manga panel aesthetic.",
  Sketch:
    "Hand-drawn pencil sketch. Loose gestural graphite strokes, rough crosshatching for shadow, visible pencil marks, unfinished raw sketchbook feel, monochrome or limited washed color, artistic figure study.",
  Freeform:
    "Digital painting, loose painterly brush strokes, rich atmospheric lighting, impressionistic textured artwork, expressive fine art illustration, no specific genre constraints.",
}

export async function generateCharacterImage(
  profile: GeneratedProfile,
  style: string,
  artists?: string[]
): Promise<Buffer> {
  const styleDirective =
    STYLE_DIRECTIVES[style] ?? `${style} illustration of a character.`

  const artistLine =
    artists && artists.length > 0
      ? `Artistic inspiration: in the style of ${artists.join(", ")}.\n`
      : ""

  const prompt = `${styleDirective}
${artistLine}Character: ${profile.name}. ${profile.description}
Color palette: ${profile.colorPalette.join(", ")}.
Centered composition, character concept art, full portrait.`

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
  })

  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) throw new Error("No content in Gemini response")

  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64")
    }
  }

  throw new Error("No image data in Gemini response")
}
