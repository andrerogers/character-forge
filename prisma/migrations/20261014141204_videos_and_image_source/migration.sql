-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "imageSource" TEXT;

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "characterId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "sound" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "jobId" TEXT,
    "videoPath" TEXT,
    "error" TEXT,
    "estimatedCostUsd" DOUBLE PRECISION,
    "costUsd" DOUBLE PRECISION,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_characterId_idx" ON "Video"("characterId");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
