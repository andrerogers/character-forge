import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { ExerciseMode } from "@/components/exercise/exercise-mode"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}

export default async function ExercisePage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { from } = await searchParams
  const character = await prisma.character.findUnique({
    where: { id },
    select: { id: true, name: true, imagePath: true },
  })
  if (!character) notFound()

  return (
    <ExerciseMode
      name={character.name}
      imagePath={character.imagePath}
      backHref={from === "gallery" ? "/" : `/characters/${id}`}
    />
  )
}
