"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Pause, Play, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Chip } from "@/components/chip"
import { cn } from "@/lib/utils"
import {
  CUSTOM_MAX_MINUTES,
  CUSTOM_MIN_MINUTES,
  DURATION_PRESETS,
  formatTime,
  parseCustomMinutes,
  timerTone,
} from "@/lib/timer"
import { useCountdown } from "./use-countdown"

interface ExerciseModeProps {
  name: string
  imagePath: string | null
  backHref: string
}

export function ExerciseMode({ name, imagePath, backHref }: ExerciseModeProps) {
  const [duration, setDuration] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const start = (minutes: number) => {
    setDuration(minutes * 60)
    // Must be called from the click handler (user gesture). Not every browser
    // supports it (e.g. iPhone Safari); the session still fills the viewport.
    containerRef.current?.requestFullscreen?.().catch(() => {})
  }

  const end = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    setDuration(null)
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      {duration === null ? (
        <DurationPicker name={name} imagePath={imagePath} backHref={backHref} onStart={start} />
      ) : (
        <ExerciseSession
          key={duration}
          name={name}
          imagePath={imagePath}
          durationSeconds={duration}
          onExit={end}
        />
      )}
    </div>
  )
}

function DurationPicker({
  name,
  imagePath,
  backHref,
  onStart,
}: {
  name: string
  imagePath: string | null
  backHref: string
  onStart: (minutes: number) => void
}) {
  const [selected, setSelected] = useState<number | "custom">(2)
  const [custom, setCustom] = useState("15")
  const customMinutes = parseCustomMinutes(custom)
  const minutes = selected === "custom" ? customMinutes : selected

  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-6">
      <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Drawing Exercise</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Draw {name} against the clock. The portrait goes fullscreen.
        </p>
      </div>

      {imagePath && (
        <div className="relative aspect-[3/4] w-40 rounded-xl overflow-hidden border border-border">
          <Image src={imagePath} alt={name} fill className="object-cover" sizes="160px" />
        </div>
      )}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (minutes) onStart(minutes)
        }}
      >
        <div className="space-y-2">
          <p className="text-sm font-medium" id="duration-label">
            Duration
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="duration-label">
            {DURATION_PRESETS.map((m) => (
              <Chip key={m} active={selected === m} onClick={() => setSelected(m)}>
                {m} min
              </Chip>
            ))}
            <Chip active={selected === "custom"} onClick={() => setSelected("custom")}>
              Custom
            </Chip>
          </div>
        </div>

        {selected === "custom" && (
          <div className="space-y-1">
            <label htmlFor="custom-minutes" className="text-sm font-medium">
              Minutes ({CUSTOM_MIN_MINUTES}–{CUSTOM_MAX_MINUTES})
            </label>
            <Input
              id="custom-minutes"
              type="number"
              inputMode="numeric"
              min={CUSTOM_MIN_MINUTES}
              max={CUSTOM_MAX_MINUTES}
              step={1}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-invalid={customMinutes === null}
              className="w-32 bg-card border-border"
              autoFocus
            />
            {customMinutes === null && (
              <p className="text-xs text-destructive">
                Enter a whole number from {CUSTOM_MIN_MINUTES} to {CUSTOM_MAX_MINUTES}.
              </p>
            )}
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          style={{ backgroundColor: "#7C3AED" }}
          disabled={!imagePath || !minutes}
        >
          Start {minutes ? `${minutes}-minute` : ""} exercise
        </Button>
        {!imagePath && (
          <p className="text-xs text-muted-foreground">
            This character has no portrait to draw from.
          </p>
        )}
      </form>
    </div>
  )
}

const CONTROLS_HIDE_MS = 3000

function ExerciseSession({
  name,
  imagePath,
  durationSeconds,
  onExit,
}: {
  name: string
  imagePath: string | null
  durationSeconds: number
  onExit: () => void
}) {
  const { remaining, paused, expired, pause, resume, restart } = useCountdown(durationSeconds)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [timesUpDismissed, setTimesUpDismissed] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const tone = timerTone(remaining)
  // Keep controls up while paused so Resume is always reachable.
  const barVisible = controlsVisible || paused

  const showControls = useCallback(() => {
    setControlsVisible(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS)
  }, [])

  const handleRestart = useCallback(() => {
    setTimesUpDismissed(false)
    restart()
  }, [restart])

  useEffect(() => {
    showControls()
    return () => clearTimeout(hideTimer.current)
  }, [showControls])

  // ESC: browsers exit fullscreen themselves (and swallow the key), so also
  // end the session when fullscreen is left. Without fullscreen support the
  // keydown arrives normally.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) onExit()
    }
    const onKey = (e: KeyboardEvent) => {
      showControls()
      if (e.key === "Escape") onExit()
      else if (e.key === " " && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        if (!expired) (paused ? resume : pause)()
      } else if (e.key === "r" || e.key === "R") handleRestart()
    }
    document.addEventListener("fullscreenchange", onFullscreenChange)
    window.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange)
      window.removeEventListener("keydown", onKey)
    }
  }, [onExit, showControls, paused, expired, pause, resume, handleRestart])

  return (
    <div
      className={cn("fixed inset-0 z-50 bg-black select-none", !barVisible && "cursor-none")}
      onMouseMove={showControls}
      onTouchStart={showControls}
    >
      {imagePath && (
        <Image src={imagePath} alt={name} fill className="object-contain" sizes="100vw" priority />
      )}
      <div className="absolute inset-0 bg-black/15" />

      <div
        className={cn(
          "absolute top-4 left-1/2 -translate-x-1/2 font-mono font-bold tabular-nums text-5xl sm:text-6xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] transition-colors",
          tone === "normal" && "text-white",
          tone === "warning" && "text-amber-400",
          tone === "expired" && "text-red-500 animate-pulse"
        )}
        role="timer"
        aria-live="off"
      >
        {formatTime(remaining)}
      </div>
      {paused && (
        <p className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 text-sm text-white/80 uppercase tracking-widest">
          Paused
        </p>
      )}

      {expired && !timesUpDismissed && (
        <div className="absolute inset-0 flex items-center justify-center p-4" role="alertdialog" aria-label="Time's up">
          <div className="rounded-2xl bg-black/75 backdrop-blur-sm px-8 py-6 text-center text-white space-y-4 shadow-xl">
            <p className="text-3xl font-bold">Time&apos;s up!</p>
            <p className="text-sm text-white/70">Put the pencil down and compare with the reference.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={() => setTimesUpDismissed(true)} autoFocus>
                Dismiss
              </Button>
              <Button variant="outline" className="bg-transparent text-white border-white/40" onClick={handleRestart}>
                Go again
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "absolute bottom-0 inset-x-0 flex justify-center gap-2 p-4 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300",
          barVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onFocus={showControls}
      >
        <Button
          variant="secondary"
          onClick={paused ? resume : pause}
          disabled={expired}
          aria-label={paused ? "Resume" : "Pause"}
        >
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="secondary" onClick={handleRestart}>
          <RotateCcw className="w-4 h-4" />
          Restart
        </Button>
        <Button variant="secondary" onClick={onExit}>
          <X className="w-4 h-4" />
          Exit
        </Button>
      </div>
    </div>
  )
}
