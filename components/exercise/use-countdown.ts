"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Wall-clock countdown: remaining time is derived from an end timestamp so it
// doesn't drift when the tab is throttled.
export function useCountdown(durationSeconds: number) {
  const [remaining, setRemaining] = useState(durationSeconds)
  const [paused, setPaused] = useState(false)
  const endAt = useRef(Date.now() + durationSeconds * 1000)
  const expired = remaining <= 0

  useEffect(() => {
    if (paused || expired) return
    const tick = () => setRemaining(Math.max(0, (endAt.current - Date.now()) / 1000))
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [paused, expired])

  const pause = useCallback(() => {
    setRemaining(Math.max(0, (endAt.current - Date.now()) / 1000))
    setPaused(true)
  }, [])

  const resume = useCallback(() => {
    setRemaining((r) => {
      endAt.current = Date.now() + r * 1000
      return r
    })
    setPaused(false)
  }, [])

  const restart = useCallback(() => {
    endAt.current = Date.now() + durationSeconds * 1000
    setRemaining(durationSeconds)
    setPaused(false)
  }, [durationSeconds])

  return { remaining, paused, expired, pause, resume, restart }
}
