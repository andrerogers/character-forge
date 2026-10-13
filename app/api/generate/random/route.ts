import { NextResponse } from "next/server"
import { generateRandomConcept } from "@/lib/anthropic"
import { errorMessage, jsonError } from "@/lib/http"

export async function POST() {
  try {
    return NextResponse.json(await generateRandomConcept())
  } catch (err) {
    console.error("Random concept failed:", err)
    return jsonError(`Random concept failed: ${errorMessage(err)}`, 502)
  }
}
