"use client"

import { useEffect, useMemo, useState } from "react"
import { Clapperboard, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Chip } from "@/components/chip"
import { EnginePicker } from "@/components/engine-picker"
import { LocalTime } from "@/components/local-time"
import { useMediaOptions } from "@/hooks/use-media-options"
import { del, messageOf, postJson } from "@/lib/api-client"
import type { Engine, PriceEstimate, VideoModelOption } from "@/lib/media/types"
import type { Video } from "@/types/character"

const MAX_SECONDS = 10
const DEFAULT_SECONDS = 5
const POLL_MS = 5000

type Mode = "image" | "text"

interface VideoStudioProps {
  characterId: string
  characterName: string
  characterDescription: string
  hasPortrait: boolean
  initialVideos: Video[]
}

const money = (usd: number) => `$${usd < 1 ? usd.toFixed(3).replace(/0$/, "") : usd.toFixed(2)}`

export function VideoStudio({
  characterId,
  characterName,
  characterDescription,
  hasPortrait,
  initialVideos,
}: VideoStudioProps) {
  const media = useMediaOptions()
  const providers = media?.video.providers ?? []
  const [videos, setVideos] = useState(initialVideos)
  const [mode, setMode] = useState<Mode>(hasPortrait ? "image" : "text")
  const [prompts, setPrompts] = useState<Record<Mode, string>>({
    image: "",
    text: `${characterName}: ${characterDescription}`,
  })
  const [chosenEngine, setChosenEngine] = useState<Engine | null>(null)
  const [duration, setDuration] = useState(DEFAULT_SECONDS)
  const [sound, setSound] = useState(false)
  const [quote, setQuote] = useState<PriceEstimate | null>(null)
  const [busy, setBusy] = useState<"quote" | "submit" | null>(null)

  const engine = useMemo<Engine | null>(() => {
    if (chosenEngine) return chosenEngine
    if (media?.video.default) return media.video.default
    const first = providers[0]
    return first ? { provider: first.id, model: first.models[0]?.id ?? "" } : null
  }, [chosenEngine, media, providers])

  const model: VideoModelOption | undefined = providers
    .find((p) => p.id === engine?.provider)
    ?.models.find((m) => m.id === engine?.model)

  const durations = useMemo(() => {
    if (model?.durations) return model.durations.filter((d) => d <= MAX_SECONDS)
    const min = model?.minSeconds ?? 1
    return Array.from({ length: MAX_SECONDS - min + 1 }, (_, i) => i + min)
  }, [model])

  // Keep the duration valid when the model changes
  useEffect(() => {
    if (!durations.includes(duration)) {
      setDuration(durations.includes(DEFAULT_SECONDS) ? DEFAULT_SECONDS : durations[0])
    }
  }, [durations, duration])

  const canSound = model ? model.supportsAudio : true
  const pendingIds = videos.filter((v) => v.status === "pending" || v.status === "saving").map((v) => v.id)
  const pendingKey = pendingIds.join(",")

  // Follow running jobs; the server downloads the clip when it's ready.
  useEffect(() => {
    if (!pendingKey) return
    const ids = pendingKey.split(",")
    const timer = setInterval(async () => {
      for (const id of ids) {
        try {
          const res = await fetch(`/api/videos/${id}`)
          if (!res.ok) continue
          const fresh: Video = await res.json()
          setVideos((prev) => prev.map((v) => (v.id === id ? fresh : v)))
          if (fresh.status === "completed") toast.success("Video ready")
          if (fresh.status === "failed") toast.error("Video failed", { description: fresh.error ?? undefined })
        } catch {
          // try again next tick
        }
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [pendingKey])

  // Any change invalidates the price shown
  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setQuote(null)
  }

  const requestBody = () => ({
    engine: engine ?? undefined,
    mode,
    prompt: prompts[mode],
    durationSeconds: duration,
    sound: canSound && sound,
  })

  const getQuote = async () => {
    setBusy("quote")
    try {
      setQuote(await postJson<PriceEstimate>(`/api/characters/${characterId}/videos/estimate`, requestBody()))
    } catch (err) {
      toast.error("Couldn't price the video", { description: messageOf(err) })
    } finally {
      setBusy(null)
    }
  }

  const generate = async () => {
    setBusy("submit")
    try {
      const video = await postJson<Video>(`/api/characters/${characterId}/videos`, {
        ...requestBody(),
        estimatedCostUsd: quote?.usd ?? null,
      })
      setVideos((prev) => [video, ...prev])
      setQuote(null)
      toast.success("Video started", { description: "It usually takes a few minutes; you can leave this page." })
    } catch (err) {
      toast.error("Video generation failed", { description: messageOf(err) })
    } finally {
      setBusy(null)
    }
  }

  const remove = async (video: Video) => {
    const running = video.status === "pending" || video.status === "saving"
    const ask = running
      ? "Stop tracking this video? The provider can't cancel it, so it may still be charged."
      : "Delete this video?"
    if (!window.confirm(ask)) return
    try {
      await del(`/api/videos/${video.id}`)
      setVideos((prev) => prev.filter((v) => v.id !== video.id))
    } catch (err) {
      toast.error("Could not delete video", { description: messageOf(err) })
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="videos-heading">
      <div>
        <h2 id="videos-heading" className="text-lg font-semibold">
          Videos
        </h2>
        <p className="text-sm text-muted-foreground">
          Animate {characterName}&apos;s portrait or generate a clip from a description. You see the
          price before anything is made.
        </p>
      </div>

      {media && providers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Add <code>OPENROUTER_API_KEY</code> or <code>HIGGSFIELD_API_KEY</code> to{" "}
          <code>.env.local</code> to generate videos.
        </div>
      ) : !media || !engine ? (
        <div className="h-40 rounded-xl bg-card animate-pulse" />
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Video type">
            <Chip active={mode === "image"} onClick={() => change(setMode)("image")} disabled={!hasPortrait}>
              Animate portrait
            </Chip>
            <Chip active={mode === "text"} onClick={() => change(setMode)("text")}>
              From text
            </Chip>
          </div>

          <div className="space-y-1">
            <label htmlFor="video-prompt" className="text-sm font-medium">
              {mode === "image" ? "Motion (optional)" : "Prompt"}
            </label>
            <Textarea
              id="video-prompt"
              value={prompts[mode]}
              onChange={(e) => {
                setPrompts((p) => ({ ...p, [mode]: e.target.value }))
                setQuote(null)
              }}
              placeholder={
                mode === "image"
                  ? "e.g. turns toward the camera and draws a sword. Leave blank for subtle idle motion."
                  : "Describe the scene"
              }
              className="min-h-20 resize-none bg-background border-border"
            />
          </div>

          <EnginePicker
            idPrefix="video-engine"
            providers={providers}
            value={engine}
            onChange={change(setChosenEngine)}
            filter={mode === "image" ? (m) => m.supportsImage : undefined}
          />

          <div className="space-y-1">
            <p className="text-sm font-medium" id="video-duration-label">
              Length
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="video-duration-label">
              {durations.map((d) => (
                <Chip key={d} active={duration === d} onClick={() => change(setDuration)(d)} className="px-2.5 text-xs">
                  {d}s
                </Chip>
              ))}
            </div>
          </div>

          <label className={`flex items-center gap-2 text-sm ${canSound ? "cursor-pointer" : "opacity-50"}`}>
            <input
              type="checkbox"
              checked={canSound && sound}
              disabled={!canSound}
              onChange={(e) => change(setSound)(e.target.checked)}
              className="h-4 w-4 accent-[#7C3AED]"
            />
            Generate sound <span className="text-muted-foreground">(costs more)</span>
          </label>

          {quote ? (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between" role="status">
              <p className="text-sm">
                {quote.usd !== null ? (
                  <>
                    Estimated cost <strong>{money(quote.usd)}</strong>
                    {quote.listPrice && <span className="text-muted-foreground"> (list price, before discounts)</span>}
                  </>
                ) : (
                  <span>{quote.note ?? "Price unavailable for this model."}</span>
                )}
              </p>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setQuote(null)} disabled={busy === "submit"}>
                  Cancel
                </Button>
                <Button size="sm" style={{ backgroundColor: "#7C3AED" }} onClick={generate} disabled={busy === "submit"}>
                  {busy === "submit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />}
                  {quote.usd !== null ? `Generate for ${money(quote.usd)}` : "Generate anyway"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="border-border"
              onClick={getQuote}
              disabled={busy !== null || !engine.model || (mode === "text" && !prompts.text.trim())}
            >
              {busy === "quote" && <Loader2 className="w-4 h-4 animate-spin" />}
              Check price
            </Button>
          )}
        </div>
      )}

      {videos.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onDelete={() => remove(video)} />
          ))}
        </ul>
      )}
    </section>
  )
}

function VideoCard({ video, onDelete }: { video: Video; onDelete: () => void }) {
  const running = video.status === "pending" || video.status === "saving"
  const cost = video.costUsd ?? video.estimatedCostUsd

  return (
    <li className="rounded-xl border border-border bg-card overflow-hidden">
      {video.status === "completed" && video.videoPath ? (
        <video
          src={video.videoPath}
          controls
          loop
          playsInline
          preload="metadata"
          className="w-full aspect-video bg-black"
        />
      ) : (
        <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-2 p-4 text-center" role={running ? "status" : "alert"}>
          {running ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm">{video.status === "saving" ? "Downloading…" : "Generating… usually a few minutes"}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Video failed</p>
              {video.error && <p className="text-xs text-muted-foreground">{video.error}</p>}
            </>
          )}
        </div>
      )}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0 text-xs text-muted-foreground space-y-0.5">
          <p className="text-sm text-foreground">
            {video.mode === "image" ? "Animated portrait" : "Text to video"} · {video.durationSeconds}s
            {video.sound ? " · sound" : ""}
          </p>
          <p className="truncate">
            {video.provider}: {video.model}
            {cost !== null && ` · ${video.costUsd === null ? "≈" : ""}$${cost.toFixed(2)}`}
          </p>
          <LocalTime value={video.createdAt} className="block" />
          <p className="line-clamp-2" title={video.prompt}>
            {video.prompt}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete video"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </li>
  )
}
