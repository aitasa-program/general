-- CreateEnum
CREATE TYPE "PropietatVehicle" AS ENUM ('PROPI', 'RENTING');

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "marca" TEXT,
    "model" TEXT,
    "propietat" "PropietatVehicle" NOT NULL,
    "empresaRenting" TEXT,
    "proximaItv" TIMESTAMP(3),
    "proximaRevisio" TIMESTAMP(3),
    "notes" TEXT,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_matricula_key" ON "Vehicle"("matricula");
