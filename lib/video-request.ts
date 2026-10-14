import { prisma } from "@/lib/db"
import { readPublicFile } from "@/lib/storage"
import { EngineError, resolveVideoEngine } from "@/lib/media/registry"
import { DEFAULT_VIDEO_SECONDS, checkVideoRequest, findVideoModel } from "@/lib/media/video"
import type { Engine, VideoRequest } from "@/lib/media/types"

export const DEFAULT_MOTION_PROMPT =
  "The character comes to life with subtle natural motion: breathing, a slight shift of weight, hair and clothing moving gently. Static camera, same art style."

export type VideoMode = "text" | "image"

export interface ParsedVideoRequest {
  engine: Engine
  mode: VideoMode
  req: VideoRequest
}

type Result = { ok: true; value: ParsedVideoRequest } | { ok: false; error: string; status: number }

// Validates a video request for a character (shared by estimate and create).
// Image mode animates the character's portrait.
export async function parseVideoRequest(characterId: string, body: Record<string, unknown> | null): Promise<Result> {
  if (!body) return { ok: false, error: "Invalid JSON body", status: 400 }

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) return { ok: false, error: "Character not found", status: 404 }

  let engine: Engine
  try {
    engine = resolveVideoEngine(body.engine)
  } catch (err) {
    if (err instanceof EngineError) return { ok: false, error: err.message, status: 400 }
    throw err
  }

  const mode = body.mode === "text" ? "text" : body.mode === "image" ? "image" : null
  if (!mode) return { ok: false, error: 'mode must be "text" or "image"', status: 400 }

  const durationSeconds = body.durationSeconds ?? DEFAULT_VIDEO_SECONDS
  const sound = body.sound === true
  const promptText = typeof body.prompt === "string" ? body.prompt.trim() : ""
  if (mode === "text" && !promptText) return { ok: false, error: "A prompt is required for text-to-video", status: 400 }

  if (mode === "image" && !character.imagePath) {
    return { ok: false, error: "This character has no portrait to animate", status: 400 }
  }

  const model = await findVideoModel(engine)
  const problem = checkVideoRequest(model, { durationSeconds: durationSeconds as number, image: mode === "image" })
  if (problem) return { ok: false, error: problem, status: 400 }

  let image: Buffer | null = null
  if (mode === "image") {
    image = await readPublicFile(character.imagePath!)
    if (!image) return { ok: false, error: "The portrait file is missing", status: 400 }
  }

  return {
    ok: true,
    value: {
      engine,
      mode,
      req: {
        prompt: promptText || DEFAULT_MOTION_PROMPT,
        durationSeconds: durationSeconds as number,
        sound,
        image,
      },
    },
  }
}
