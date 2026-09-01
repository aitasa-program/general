-- AlterTable
ALTER TABLE "Producte" DROP COLUMN "tipus",
ADD COLUMN     "tipusId" TEXT;

-- CreateTable
CREATE TABLE "TipusProducte" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipusProducte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipusProducte_nom_key" ON "TipusProducte"("nom");

-- AddForeignKey
ALTER TABLE "Producte" ADD CONSTRAINT "Producte_tipusId_fkey" FOREIGN KEY ("tipusId") REFERENCES "TipusProducte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

