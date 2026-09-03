-- AlterTable
ALTER TABLE "Fitxatge" DROP COLUMN "entrada",
DROP COLUMN "lloc",
DROP COLUMN "sortida",
ADD COLUMN     "data" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "franjaHorariaId" TEXT NOT NULL,
ADD COLUMN     "hores" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "llocTreballId" TEXT NOT NULL,
ALTER COLUMN "descripcio" SET NOT NULL;

-- CreateTable
CREATE TABLE "LlocTreball" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlocTreball_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FranjaHoraria" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "hores" DOUBLE PRECISION NOT NULL,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FranjaHoraria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LlocTreball_nom_key" ON "LlocTreball"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "FranjaHoraria_nom_key" ON "FranjaHoraria"("nom");

-- AddForeignKey
ALTER TABLE "Fitxatge" ADD CONSTRAINT "Fitxatge_llocTreballId_fkey" FOREIGN KEY ("llocTreballId") REFERENCES "LlocTreball"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fitxatge" ADD CONSTRAINT "Fitxatge_franjaHorariaId_fkey" FOREIGN KEY ("franjaHorariaId") REFERENCES "FranjaHoraria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
