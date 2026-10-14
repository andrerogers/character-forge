"use client"

import { cn } from "@/lib/utils"

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

// Toggleable pill. Active = purple-filled, inactive = outlined. A real button,
// so it's reachable with Tab and toggled with Enter/Space.
export function Chip({ active = false, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-transparent text-foreground hover:border-primary/60 hover:text-primary",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
