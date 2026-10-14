// Error from an upstream media API. `status` lets lib/http.ts summarise it.
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = "ProviderError"
  }
}

async function detail(res: Response): Promise<string> {
  const text = await res.text().catch(() => "")
  try {
    const body = JSON.parse(text)
    const msg = body?.error?.message ?? body?.error ?? body?.detail ?? body?.message
    if (msg) return typeof msg === "string" ? msg : JSON.stringify(msg)
  } catch {
    // not JSON
  }
  return text.slice(0, 300) || res.statusText
}

export async function requestJson<T = Record<string, unknown>>(
  provider: string,
  url: string,
  init: RequestInit
): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new ProviderError(`${provider} ${res.status}: ${await detail(res)}`, res.status)
  }
  return (await res.json()) as T
}

export async function requestBytes(provider: string, url: string, init?: RequestInit): Promise<Buffer> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new ProviderError(`${provider} download ${res.status}: ${await detail(res)}`, res.status)
  }
  return Buffer.from(await res.arrayBuffer())
}

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new ProviderError(`${name} is not set in .env.local`)
  return value
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const dataUrl = (buffer: Buffer, mime = "image/png") =>
  `data:${mime};base64,${buffer.toString("base64")}`

export function decodeDataUrl(url: string): Buffer | null {
  const match = /^data:[^;,]+;base64,([\s\S]*)$/.exec(url)
  return match ? Buffer.from(match[1], "base64") : null
}
