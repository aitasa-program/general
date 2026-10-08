-- AlterTable
ALTER TABLE "Fitxatge" ADD COLUMN "camps" JSONB;

-- CreateTable
CREATE TABLE "CampFitxatge" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "tipus" TEXT NOT NULL DEFAULT 'text',
    "opcions" JSONB,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampFitxatge_pkey" PRIMARY KEY ("id")
);
