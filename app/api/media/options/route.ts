import { NextResponse } from "next/server"
import {
  PROVIDER_LABELS,
  configuredImageProviders,
  configuredVideoProviders,
  defaultImageEngine,
  defaultVideoEngine,
} from "@/lib/media/registry"
import { getImageModels, getVideoModels } from "@/lib/media/catalogue"

export const dynamic = "force-dynamic"

// What the engine pickers can offer: configured providers, their models and
// the defaults. OpenRouter lists are live (cached); `live: false` means the
// fallback list is shown because OpenRouter couldn't be reached.
export async function GET() {
  const image = await Promise.all(
    configuredImageProviders().map(async (id) => {
      const { models, live } = await getImageModels(id)
      return { id, label: PROVIDER_LABELS[id], models, live, allowCustomModel: id === "openrouter" }
    })
  )
  const video = await Promise.all(
    configuredVideoProviders().map(async (id) => {
      const { models, live } = await getVideoModels(id)
      return { id, label: PROVIDER_LABELS[id], models, live, allowCustomModel: id === "openrouter" }
    })
  )

  return NextResponse.json({
    image: { providers: image, default: image.length ? defaultImageEngine() : null },
    video: { providers: video, default: defaultVideoEngine() },
  })
}
