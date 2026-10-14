"use client"

import { useEffect, useState } from "react"
import type { Engine, ModelOption, VideoModelOption } from "@/lib/media/types"

export interface ProviderOption<M> {
  id: string
  label: string
  models: M[]
  live: boolean
  allowCustomModel: boolean
}

export interface MediaOptions {
  image: { providers: ProviderOption<ModelOption>[]; default: Engine | null }
  video: { providers: ProviderOption<VideoModelOption>[]; default: Engine | null }
}

// Loaded once per page; every picker shares the same request.
let pending: Promise<MediaOptions> | null = null

function load(): Promise<MediaOptions> {
  pending ??= fetch("/api/media/options")
    .then((r) => {
      if (!r.ok) throw new Error(`media options ${r.status}`)
      return r.json()
    })
    .catch((err) => {
      pending = null
      throw err
    })
  return pending
}

export function useMediaOptions(): MediaOptions | null {
  const [options, setOptions] = useState<MediaOptions | null>(null)
  useEffect(() => {
    let alive = true
    load()
      .then((o) => alive && setOptions(o))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return options
}
