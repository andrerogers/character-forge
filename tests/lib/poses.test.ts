import { describe, it, expect } from "vitest"
import { POSES, poseDirective } from "@/lib/poses"

describe("poses", () => {
  it("lists the five pose options", () => {
    expect(POSES).toEqual(["Front View", "3/4 View", "Profile", "Action", "Sitting"])
  })

  it("returns a prompt directive for known poses", () => {
    for (const pose of POSES) {
      expect(poseDirective(pose)).toMatch(/\S/)
    }
    expect(poseDirective("Profile")).toMatch(/profile|side/i)
  })

  it("returns null for unknown or missing poses", () => {
    expect(poseDirective(undefined)).toBeNull()
    expect(poseDirective("Upside Down")).toBeNull()
  })
})
