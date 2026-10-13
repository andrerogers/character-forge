import type { ProportionSystem } from "@/types/character"

export const PROPORTION_SYSTEMS: Record<ProportionSystem, string> = {
  realistic: "realistic 7.5-heads-tall proportions",
  manga: "manga 8–9-heads-tall elongated proportions",
  chibi: "chibi 2–3-heads-tall super-deformed proportions",
}

export function isProportionSystem(value: unknown): value is ProportionSystem {
  return typeof value === "string" && value in PROPORTION_SYSTEMS
}

export function defaultProportionSystem(style: string, description = ""): ProportionSystem {
  if (/chibi|super.deformed/i.test(description)) return "chibi"
  return style === "Manga" ? "manga" : "realistic"
}

export function overlayPromptFor(system: ProportionSystem): string {
  return `Anatomy proportion overlay diagram of this character standing in a neutral front pose, using ${PROPORTION_SYSTEMS[system]}. Draw horizontal head-height guide lines across the figure, numbered head units down the side, and label the key landmarks (chin, chest, navel, crotch, knees, feet).`
}
