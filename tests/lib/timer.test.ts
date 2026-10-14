import { describe, it, expect } from "vitest"
import { formatTime, timerTone, parseCustomMinutes, DURATION_PRESETS } from "@/lib/timer"

describe("formatTime", () => {
  it("formats seconds as MM:SS", () => {
    expect(formatTime(0)).toBe("00:00")
    expect(formatTime(59)).toBe("00:59")
    expect(formatTime(61)).toBe("01:01")
    expect(formatTime(600)).toBe("10:00")
    expect(formatTime(3600)).toBe("60:00")
  })

  it("rounds partial seconds up and clamps negatives", () => {
    expect(formatTime(29.2)).toBe("00:30")
    expect(formatTime(-5)).toBe("00:00")
  })
})

describe("timerTone", () => {
  it("is normal above 30 seconds", () => {
    expect(timerTone(31)).toBe("normal")
    expect(timerTone(300)).toBe("normal")
  })

  it("is warning within the last 30 seconds", () => {
    expect(timerTone(30)).toBe("warning")
    expect(timerTone(0.5)).toBe("warning")
  })

  it("is expired at zero", () => {
    expect(timerTone(0)).toBe("expired")
    expect(timerTone(-1)).toBe("expired")
  })
})

describe("parseCustomMinutes", () => {
  it("accepts whole minutes from 1 to 60", () => {
    expect(parseCustomMinutes("1")).toBe(1)
    expect(parseCustomMinutes(" 45 ")).toBe(45)
    expect(parseCustomMinutes("60")).toBe(60)
  })

  it("rejects out-of-range, fractional and non-numeric values", () => {
    expect(parseCustomMinutes("0")).toBeNull()
    expect(parseCustomMinutes("61")).toBeNull()
    expect(parseCustomMinutes("2.5")).toBeNull()
    expect(parseCustomMinutes("abc")).toBeNull()
    expect(parseCustomMinutes("")).toBeNull()
  })
})

describe("DURATION_PRESETS", () => {
  it("offers 1, 2, 5 and 10 minutes", () => {
    expect(DURATION_PRESETS).toEqual([1, 2, 5, 10])
  })
})
