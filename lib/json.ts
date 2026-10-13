// Claude is told to return bare JSON, but occasionally wraps it in a code
// fence or a sentence of prose. Pull out the outermost JSON value.
export function parseModelJson<T = unknown>(text: string): T {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")

  try {
    return JSON.parse(trimmed) as T
  } catch {
    const start = trimmed.search(/[[{]/)
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"))
    if (start === -1 || end <= start) {
      throw new Error("Model response did not contain JSON")
    }
    return JSON.parse(trimmed.slice(start, end + 1)) as T
  }
}
