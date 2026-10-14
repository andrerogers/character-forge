export const DURATION_PRESETS = [1, 2, 5, 10]
export const CUSTOM_MIN_MINUTES = 1
export const CUSTOM_MAX_MINUTES = 60
export const WARNING_SECONDS = 30

export type TimerTone = "normal" | "warning" | "expired"

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds))
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
}

export function timerTone(remainingSeconds: number): TimerTone {
  if (remainingSeconds <= 0) return "expired"
  if (remainingSeconds <= WARNING_SECONDS) return "warning"
  return "normal"
}

export function parseCustomMinutes(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const minutes = Number(trimmed)
  if (minutes < CUSTOM_MIN_MINUTES || minutes > CUSTOM_MAX_MINUTES) return null
  return minutes
}
