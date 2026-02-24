import Link from "next/link"
import { Button } from "@/components/ui/button"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <svg
          className="w-12 h-12 text-primary/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No characters yet
      </h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Forge your first character using AI — give it a concept, pick a style,
        and watch it come to life.
      </p>
      <Button asChild style={{ backgroundColor: "#7C3AED" }}>
        <Link href="/characters/new">Create Your First Character</Link>
      </Button>
    </div>
  )
}
