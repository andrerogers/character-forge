import { GoogleGenAI } from "@google/genai"
import { GeneratedProfile } from "@/types/character"
import { poseDirective } from "@/lib/poses"

const MODEL = "gemini-2.5-flash-image"

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

// Appended to every guide image prompt so diagrams stay instructional even if
// Claude's per-step prompt drifts.
const GUIDE_DIAGRAM_STYLE =
  "Style: instructional drawing diagram with construction lines and labelled proportions, clean black line art on a plain white background, no shading or colour."

interface PortraitOptions {
  pose?: string
  artists?: string[]
}

export function buildPortraitPrompt(
  profile: GeneratedProfile,
  style: string,
  { pose, artists }: PortraitOptions
): string {
  const styleDirective =
    STYLE_DIRECTIVES[style] ?? `${style} illustration of a character.`

  const artistLine =
    artists && artists.length > 0
      ? `Artistic inspiration: in the style of ${artists.join(", ")}.\n`
      : ""

  const pd = poseDirective(pose)
  const poseLine = pd ? `Pose: ${pd}.\n` : ""

  return `${styleDirective}
${artistLine}${poseLine}Character: ${profile.name}. ${profile.description}
Color palette: ${profile.colorPalette.join(", ")}.
Centered composition, character concept art, full portrait.`
}

async function generateImage(
  contents: Parameters<typeof client.models.generateContent>[0]["contents"]
): Promise<Buffer> {
  const response = await client.models.generateContent({ model: MODEL, contents })

  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) throw new Error("No content in Gemini response")

  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64")
    }
  }

  throw new Error("No image data in Gemini response")
}

export async function generateCharacterImage(
  profile: GeneratedProfile,
  style: string,
  options: PortraitOptions = {}
): Promise<Buffer> {
  return generateImage(buildPortraitPrompt(profile, style, options))
}

// Guide step / overlay diagrams. When the character's portrait is available
// it is attached so the diagram depicts the same character design.
export async function generateGuideImage(
  prompt: string,
  reference: Buffer | null
): Promise<Buffer> {
  const text = reference
    ? `${prompt}\n\nUse the attached portrait only as a reference for the character's design.\n${GUIDE_DIAGRAM_STYLE}`
    : `${prompt}\n\n${GUIDE_DIAGRAM_STYLE}`

  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text }]
  if (reference) {
    parts.push({ inlineData: { mimeType: "image/png", data: reference.toString("base64") } })
  }

  return generateImage([{ role: "user", parts }])
}
