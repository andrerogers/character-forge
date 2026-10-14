import { NextResponse } from "next/server"

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

// Returns the parsed body, or null if it isn't valid JSON.
export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

// Short, user-facing description of an upstream failure. SDK errors carry an
// HTTP status and often a raw JSON body as the message, which isn't useful in
// the UI (the full error is still logged server-side).
export function errorMessage(err: unknown) {
  const status = (err as { status?: unknown })?.status
  if (typeof status === "number") {
    if (status === 429) return "the AI service is rate limiting requests; wait a moment and retry"
    if (status === 401 || status === 403) return "the API key was rejected; check .env.local"
    return `the AI service returned an error (${status})`
  }
  const message = err instanceof Error ? err.message : String(err)
  return message.length > 200 ? `${message.slice(0, 200)}…` : message
}
