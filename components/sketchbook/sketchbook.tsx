"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ImagePlus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { del, messageOf, postForm } from "@/lib/api-client"
import { LocalTime } from "@/components/local-time"
import { Sketch } from "@/types/character"

interface SketchbookProps {
  characterId: string
  characterName: string
  initialSketches: Sketch[]
}

export function Sketchbook({ characterId, characterName, initialSketches }: SketchbookProps) {
  const [sketches, setSketches] = useState(initialSketches)
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null)
  const [note, setNote] = useState("")
  const [uploading, setUploading] = useState(false)
  const [viewing, setViewing] = useState<Sketch | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const chooseFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file")
      return
    }
    setPending({ file, preview: URL.createObjectURL(file) })
    setNote("")
  }

  const closeUpload = () => {
    if (pending) URL.revokeObjectURL(pending.preview)
    setPending(null)
    if (fileInput.current) fileInput.current.value = ""
  }

  const upload = async () => {
    if (!pending) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", pending.file)
      if (note.trim()) form.append("note", note.trim())
      const sketch = await postForm<Sketch>(`/api/characters/${characterId}/sketches`, form)
      setSketches((prev) => [sketch, ...prev])
      toast.success("Sketch added")
      closeUpload()
    } catch (err) {
      toast.error("Upload failed", { description: messageOf(err) })
    } finally {
      setUploading(false)
    }
  }

  const remove = async (sketch: Sketch) => {
    if (!window.confirm("Delete this sketch?")) return
    try {
      await del(`/api/sketches/${sketch.id}`)
      setSketches((prev) => prev.filter((s) => s.id !== sketch.id))
      if (viewing?.id === sketch.id) setViewing(null)
    } catch (err) {
      toast.error("Could not delete sketch", { description: messageOf(err) })
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="sketches-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="sketches-heading" className="text-lg font-semibold">
            My Sketches
          </h2>
          <p className="text-sm text-muted-foreground">
            Your attempts at drawing {characterName}, newest first.
          </p>
        </div>
        <Button variant="outline" className="border-border" onClick={() => fileInput.current?.click()}>
          <ImagePlus className="w-4 h-4" />
          Upload Sketch
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => chooseFile(e.target.files?.[0])}
        />
      </div>

      {sketches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No sketches yet. Upload a photo or scan of your drawing to track your progress.
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sketches.map((sketch) => (
            <li key={sketch.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                type="button"
                className="relative block w-full aspect-square bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() => setViewing(sketch)}
                aria-label={sketch.note ? `View sketch: ${sketch.note}` : "View sketch"}
              >
                <Image
                  src={sketch.imagePath}
                  alt={sketch.note ?? "Sketch"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </button>
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <LocalTime className="block text-xs text-muted-foreground" value={sketch.createdAt} />
                  {sketch.note && <p className="text-sm mt-1 break-words">{sketch.note}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(sketch)}
                  aria-label="Delete sketch"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!pending} onOpenChange={(open) => !open && !uploading && closeUpload()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a sketch</DialogTitle>
            <DialogDescription>
              Large images are resized to 2048px on the longest side.
            </DialogDescription>
          </DialogHeader>
          {pending && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pending.preview}
              alt="Selected sketch"
              className="max-h-64 w-full object-contain rounded-lg bg-muted"
            />
          )}
          <div className="space-y-1">
            <label htmlFor="sketch-note" className="text-sm font-medium">
              Note <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="sketch-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 5-minute gesture, hands still stiff"
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeUpload} disabled={uploading}>
              Cancel
            </Button>
            <Button style={{ backgroundColor: "#7C3AED" }} onClick={upload} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-[calc(100%-2rem)] h-[calc(100dvh-2rem)] p-2 bg-black text-white border-none grid-rows-[1fr_auto]">
          <DialogTitle className="sr-only">Sketch</DialogTitle>
          {viewing && (
            <>
              <div className="relative min-h-0">
                <Image src={viewing.imagePath} alt={viewing.note ?? "Sketch"} fill className="object-contain" sizes="100vw" />
              </div>
              <p className="text-center text-sm text-white/80 pb-1">
                <LocalTime value={viewing.createdAt} />
                {viewing.note ? ` — ${viewing.note}` : ""}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
