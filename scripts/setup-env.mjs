// Creates .env.local from .env.example on first run, then checks the keys
// the app needs. Warns rather than fails, so `npm run dev` still starts.
import { copyFileSync, existsSync, readFileSync } from "node:fs"

const ENV = ".env.local"

if (!existsSync(ENV)) {
  copyFileSync(".env.example", ENV)
  console.log(`Created ${ENV} from .env.example. Add your API keys to it.`)
}

const values = Object.fromEntries(
  readFileSync(ENV, "utf8")
    .split(/\r?\n/)
    .map((line) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line))
    .filter(Boolean)
    .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, "")])
)
const has = (key) => !!values[key] && !values[key].endsWith("...")

const problems = []
if (!has("ANTHROPIC_API_KEY")) problems.push("ANTHROPIC_API_KEY is empty: character profiles and guides need it.")
if (!["GEMINI_API_KEY", "OPENROUTER_API_KEY", "HIGGSFIELD_API_KEY"].some(has)) {
  problems.push("No image provider key: set GEMINI_API_KEY, OPENROUTER_API_KEY or HIGGSFIELD_API_KEY.")
}
if (!has("DATABASE_URL")) problems.push("DATABASE_URL is empty.")

if (problems.length) {
  console.warn(`\n⚠ ${ENV} needs attention:\n${problems.map((p) => `  - ${p}`).join("\n")}\n`)
}
