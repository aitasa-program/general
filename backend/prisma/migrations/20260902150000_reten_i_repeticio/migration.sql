-- CreateEnum
CREATE TYPE "RepeticioTasca" AS ENUM ('UNIC', 'DIARIA', 'SETMANAL');

-- DropForeignKey
ALTER TABLE "Checklist" DROP CONSTRAINT "Checklist_assignatAId_fkey";

-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN     "assignatAlReten" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "assignatAId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tasca" ADD COLUMN     "assignatAlReten" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repeticio" "RepeticioTasca" NOT NULL DEFAULT 'UNIC';

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_assignatAId_fkey" FOREIGN KEY ("assignatAId") REFERENCES "Usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
