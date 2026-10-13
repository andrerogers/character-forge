import { describe, it, expect } from "vitest"
import { parseModelJson } from "@/lib/json"

describe("parseModelJson", () => {
  it("parses plain JSON", () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 })
  })

  it("strips markdown code fences", () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  it("ignores prose around the JSON object", () => {
    expect(parseModelJson('Here you go:\n{"a":[1,2]}\nEnjoy!')).toEqual({ a: [1, 2] })
  })

  it("parses top-level arrays", () => {
    expect(parseModelJson('[{"x":1}]')).toEqual([{ x: 1 }])
  })

  it("throws on unparseable text", () => {
    expect(() => parseModelJson("no json here")).toThrow()
  })
})
