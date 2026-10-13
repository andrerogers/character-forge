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

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}
