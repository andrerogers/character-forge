"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Engine, ModelOption } from "@/lib/media/types"
import type { ProviderOption } from "@/hooks/use-media-options"

const CUSTOM = "__custom__"

interface EnginePickerProps<M extends ModelOption> {
  providers: ProviderOption<M>[]
  value: Engine
  onChange: (engine: Engine) => void
  // Hide models that can't do the current job (e.g. image-to-video)
  filter?: (model: M) => boolean
  idPrefix: string
}

// Provider + model selects. OpenRouter also takes any model id typed in,
// since its catalogue is large and changes often.
export function EnginePicker<M extends ModelOption>({
  providers,
  value,
  onChange,
  filter,
  idPrefix,
}: EnginePickerProps<M>) {
  const provider = providers.find((p) => p.id === value.provider) ?? providers[0]
  const models = (provider?.models ?? []).filter((m) => !filter || filter(m))
  const known = models.some((m) => m.id === value.model)
  const [custom, setCustom] = useState(!known && !!value.model && !!provider?.allowCustomModel)

  if (!provider) return null

  // Radix Select inside a <form> can report "" while its options change;
  // ignore that rather than blanking the choice.
  const pickProvider = (id: string) => {
    if (!id) return
    const next = providers.find((p) => p.id === id)!
    const first = next.models.find((m) => !filter || filter(m))
    setCustom(!first && next.allowCustomModel)
    onChange({ provider: id, model: first?.id ?? "" })
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-provider`} className="text-xs text-muted-foreground">
          Provider
        </label>
        <Select value={provider.id} onValueChange={pickProvider}>
          <SelectTrigger id={`${idPrefix}-provider`} className="w-full bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-model`} className="text-xs text-muted-foreground">
          Model
        </label>
        {models.length > 0 && (
          <Select
            value={custom ? CUSTOM : known ? value.model : undefined}
            onValueChange={(v) => {
              if (!v) return
              if (v === CUSTOM) {
                setCustom(true)
                onChange({ provider: provider.id, model: "" })
              } else {
                setCustom(false)
                onChange({ provider: provider.id, model: v })
              }
            }}
          >
            <SelectTrigger id={`${idPrefix}-model`} className="w-full bg-card border-border">
              <SelectValue placeholder="Choose a model" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border max-h-72">
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
              {provider.allowCustomModel && <SelectItem value={CUSTOM}>Other model ID…</SelectItem>}
            </SelectContent>
          </Select>
        )}
        {(custom || models.length === 0) && provider.allowCustomModel && (
          <Input
            id={models.length === 0 ? `${idPrefix}-model` : undefined}
            placeholder="vendor/model, e.g. google/gemini-2.5-flash-image"
            value={value.model}
            onChange={(e) => onChange({ provider: provider.id, model: e.target.value.trim() })}
            className="bg-card border-border"
            aria-label="OpenRouter model ID"
          />
        )}
        {!provider.live && (
          <p className="text-xs text-muted-foreground">
            Couldn&apos;t reach {provider.label} for its model list; showing a short list.
          </p>
        )}
      </div>
    </div>
  )
}
