import type { Engine, ImageRequest } from "./types"
import * as gemini from "./gemini"
import * as openrouter from "./openrouter"
import * as higgsfield from "./higgsfield"

const PROVIDERS: Record<string, { generateImage(model: string, req: ImageRequest): Promise<Buffer> }> = {
  gemini,
  openrouter,
  higgsfield,
}

export async function generateImageWith(engine: Engine, req: ImageRequest): Promise<Buffer> {
  const provider = PROVIDERS[engine.provider]
  if (!provider) throw new Error(`Unknown image provider "${engine.provider}"`)
  return provider.generateImage(engine.model, req)
}
