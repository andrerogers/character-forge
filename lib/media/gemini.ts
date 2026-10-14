// Gemini image generation, called directly with GEMINI_API_KEY.
import { GoogleGenAI } from "@google/genai"
import type { ImageRequest } from "./types"

let client: GoogleGenAI | null = null
const gemini = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }))

export async function generateImage(model: string, { prompt, reference }: ImageRequest): Promise<Buffer> {
  const contents = reference
    ? [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/png", data: reference.toString("base64") } },
          ],
        },
      ]
    : prompt

  const response = await gemini().models.generateContent({ model, contents })

  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) throw new Error("No content in Gemini response")

  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64")
    }
  }

  throw new Error("No image data in Gemini response")
}
