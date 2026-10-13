import { describe, it, expect } from "vitest"
import { defaultProportionSystem, isProportionSystem } from "@/lib/proportions"

describe("defaultProportionSystem", () => {
  it("uses manga proportions for Manga style", () => {
    expect(defaultProportionSystem("Manga")).toBe("manga")
  })

  it("uses realistic proportions for other styles", () => {
    expect(defaultProportionSystem("Comic")).toBe("realistic")
    expect(defaultProportionSystem("Sketch")).toBe("realistic")
    expect(defaultProportionSystem("Freeform")).toBe("realistic")
  })

  it("uses chibi proportions when the character is described as chibi", () => {
    expect(defaultProportionSystem("Manga", "a tiny chibi witch")).toBe("chibi")
  })
})

describe("isProportionSystem", () => {
  it("accepts only the three systems", () => {
    expect(isProportionSystem("realistic")).toBe(true)
    expect(isProportionSystem("manga")).toBe(true)
    expect(isProportionSystem("chibi")).toBe(true)
    expect(isProportionSystem("heroic")).toBe(false)
    expect(isProportionSystem(undefined)).toBe(false)
  })
})
