-- DropForeignKey
ALTER TABLE "Fitxatge" DROP CONSTRAINT "Fitxatge_franjaHorariaId_fkey";

-- AlterTable
ALTER TABLE "Fitxatge" ALTER COLUMN "franjaHorariaId" DROP NOT NULL,
ALTER COLUMN "hores" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Fitxatge" ADD CONSTRAINT "Fitxatge_franjaHorariaId_fkey" FOREIGN KEY ("franjaHorariaId") REFERENCES "FranjaHoraria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
