"use client"

import { Button } from "@/components/ui/button"

export function DeleteCharacterButton({
  name,
  action,
}: {
  name: string
  action: () => Promise<void>
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Delete ${name}? Its drawing guide and sketches will be deleted too.`)) {
          e.preventDefault()
        }
      }}
    >
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        Delete
      </Button>
    </form>
  )
}
