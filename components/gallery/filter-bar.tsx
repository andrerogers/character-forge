"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const STYLES = ["Comic", "Manga", "Sketch", "Freeform"]

export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeStyle = searchParams.get("style") ?? ""
  const query = searchParams.get("q") ?? ""

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      router.push(`/?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={activeStyle === "" ? "default" : "secondary"}
          className="cursor-pointer px-3 py-1 text-sm"
          style={activeStyle === "" ? { backgroundColor: "#7C3AED" } : {}}
          onClick={() => updateParams({ style: "" })}
        >
          All
        </Badge>
        {STYLES.map((style) => (
          <Badge
            key={style}
            variant={activeStyle === style ? "default" : "secondary"}
            className="cursor-pointer px-3 py-1 text-sm"
            style={activeStyle === style ? { backgroundColor: "#7C3AED" } : {}}
            onClick={() =>
              updateParams({ style: activeStyle === style ? "" : style })
            }
          >
            {style}
          </Badge>
        ))}
      </div>
      <Input
        placeholder="Search characters..."
        defaultValue={query}
        className="sm:w-56 bg-card border-border"
        onChange={(e) => {
          const timer = setTimeout(
            () => updateParams({ q: e.target.value }),
            300
          )
          return () => clearTimeout(timer)
        }}
      />
    </div>
  )
}
