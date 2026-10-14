"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

// Formats in the viewer's locale and time zone. Rendered only on the client
// so server-rendered HTML can't disagree with the browser.
export function LocalTime({ value, className }: { value: Date | string; className?: string }) {
  const date = new Date(value)
  const text = useSyncExternalStore(
    subscribe,
    () => date.toLocaleString(),
    () => ""
  )
  return (
    <time className={className} dateTime={date.toISOString()}>
      {text}
    </time>
  )
}
