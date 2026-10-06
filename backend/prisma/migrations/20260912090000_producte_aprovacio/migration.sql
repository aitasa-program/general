-- AlterTable
ALTER TABLE "Producte" ADD COLUMN "estat" "EstatMoviment" NOT NULL DEFAULT 'CONFIRMAT';
ALTER TABLE "Producte" ADD COLUMN "creatPerId" TEXT;
ALTER TABLE "Producte" ADD COLUMN "confirmatPerId" TEXT;
ALTER TABLE "Producte" ADD COLUMN "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Producte" ADD COLUMN "dataConfirmacio" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Producte" ADD CONSTRAINT "Producte_creatPerId_fkey" FOREIGN KEY ("creatPerId") REFERENCES "Usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Producte" ADD CONSTRAINT "Producte_confirmatPerId_fkey" FOREIGN KEY ("confirmatPerId") REFERENCES "Usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
