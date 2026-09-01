-- AlterTable
ALTER TABLE "Checklist" DROP COLUMN "categoria";

-- DropEnum
DROP TYPE "CategoriaChecklist";

-- CreateTable
CREATE TABLE "ZonaComptador" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZonaComptador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comptador" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "zonaId" TEXT NOT NULL,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comptador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZonaComptador_nom_key" ON "ZonaComptador"("nom");

-- AddForeignKey
ALTER TABLE "Comptador" ADD CONSTRAINT "Comptador_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "ZonaComptador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
