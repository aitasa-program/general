-- AlterTable
ALTER TABLE "Fitxatge" ADD COLUMN     "descripcio" TEXT,
ADD COLUMN     "lloc" TEXT NOT NULL,
ALTER COLUMN "sortida" SET NOT NULL;

-- AlterTable
ALTER TABLE "RegistreReten" ADD COLUMN     "horaFi" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "horaInici" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "quantitat" SET NOT NULL;
