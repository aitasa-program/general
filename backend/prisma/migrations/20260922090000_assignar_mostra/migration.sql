-- AlterTable
ALTER TABLE "Mostra" ADD COLUMN     "usuariAssignatId" TEXT;

-- AddForeignKey
ALTER TABLE "Mostra" ADD CONSTRAINT "Mostra_usuariAssignatId_fkey" FOREIGN KEY ("usuariAssignatId") REFERENCES "Usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
