-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Sketch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "characterId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "Sketch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingGuide" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "characterId" TEXT NOT NULL,
    "proportionSystem" TEXT,
    "overlayImagePath" TEXT,

    CONSTRAINT "DrawingGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingStep" (
    "id" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,

    CONSTRAINT "DrawingStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sketch_characterId_idx" ON "Sketch"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingGuide_characterId_key" ON "DrawingGuide"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingStep_guideId_stepNumber_key" ON "DrawingStep"("guideId", "stepNumber");

-- AddForeignKey
ALTER TABLE "Sketch" ADD CONSTRAINT "Sketch_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingGuide" ADD CONSTRAINT "DrawingGuide_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingStep" ADD CONSTRAINT "DrawingStep_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "DrawingGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
