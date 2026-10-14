// Prompt building for portraits and guide diagrams. The image itself comes
// from whichever engine (Gemini, OpenRouter, Higgsfield) the request picked.
import { GeneratedProfile } from "@/types/character"
import { poseDirective } from "@/lib/poses"
import { generateImageWith } from "@/lib/media/images"
import { defaultImageEngine } from "@/lib/media/registry"
import type { Engine } from "@/lib/media/types"

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
  engine?: Engine
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

export async function generateCharacterImage(
  profile: GeneratedProfile,
  style: string,
  options: PortraitOptions = {}
): Promise<Buffer> {
  return generateImageWith(options.engine ?? defaultImageEngine(), {
    prompt: buildPortraitPrompt(profile, style, options),
  })
}

// Guide step / overlay diagrams. When the character's portrait is available
// it is attached so the diagram depicts the same character design.
export async function generateGuideImage(
  prompt: string,
  reference: Buffer | null,
  engine: Engine = defaultImageEngine()
): Promise<Buffer> {
  const text = reference
    ? `${prompt}\n\nUse the attached portrait only as a reference for the character's design.\n${GUIDE_DIAGRAM_STYLE}`
    : `${prompt}\n\n${GUIDE_DIAGRAM_STYLE}`
  return generateImageWith(engine, { prompt: text, reference })
}
