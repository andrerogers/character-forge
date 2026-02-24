-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tagline" TEXT,
    "style" TEXT NOT NULL,
    "age" TEXT,
    "personality" TEXT[],
    "backstory" TEXT,
    "colorPalette" TEXT[],
    "imagePath" TEXT,
    "concept" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);
