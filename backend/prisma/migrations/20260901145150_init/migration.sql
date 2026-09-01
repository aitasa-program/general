-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('TREBALLADOR', 'ENCARREGAT');

-- CreateEnum
CREATE TYPE "EstatTasca" AS ENUM ('PENDENT', 'EN_CURS', 'FETA');

-- CreateEnum
CREATE TYPE "Prioritat" AS ENUM ('BAIXA', 'MITJANA', 'ALTA');

-- CreateEnum
CREATE TYPE "FrequenciaChecklist" AS ENUM ('DIARIA', 'SETMANAL', 'PUNTUAL');

-- CreateEnum
CREATE TYPE "Repeticio" AS ENUM ('UNIC', 'DIARI', 'SETMANAL');

-- CreateEnum
CREATE TYPE "TipusMoviment" AS ENUM ('ENTRADA', 'SORTIDA');

-- CreateEnum
CREATE TYPE "EstatMoviment" AS ENUM ('PENDENT', 'CONFIRMAT', 'REBUTJAT');

-- CreateTable
CREATE TABLE "Usuari" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "usuari" TEXT NOT NULL,
    "contrasenya" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "actiu" BOOLEAN NOT NULL DEFAULT true,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tasca" (
    "id" TEXT NOT NULL,
    "titol" TEXT NOT NULL,
    "descripcio" TEXT,
    "assignatAId" TEXT NOT NULL,
    "creatPerId" TEXT NOT NULL,
    "estat" "EstatTasca" NOT NULL DEFAULT 'PENDENT',
    "dataLimit" TIMESTAMP(3),
    "prioritat" "Prioritat" NOT NULL DEFAULT 'MITJANA',
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tasca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "assignatAId" TEXT NOT NULL,
    "frequencia" "FrequenciaChecklist" NOT NULL DEFAULT 'PUNTUAL',
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "marcat" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recordatori" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "usuariId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "repeticio" "Repeticio" NOT NULL DEFAULT 'UNIC',
    "enviat" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Recordatori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscripcioPush" (
    "id" TEXT NOT NULL,
    "usuariId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscripcioPush_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formulari" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "camps" JSONB NOT NULL,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Formulari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespostaFormulari" (
    "id" TEXT NOT NULL,
    "formulariId" TEXT NOT NULL,
    "usuariId" TEXT NOT NULL,
    "valors" JSONB NOT NULL,
    "dataEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespostaFormulari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producte" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "codi" TEXT NOT NULL,
    "quantitat" INTEGER NOT NULL DEFAULT 0,
    "ubicacio" TEXT,
    "stockMinim" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Producte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentInventari" (
    "id" TEXT NOT NULL,
    "producteId" TEXT NOT NULL,
    "tipus" "TipusMoviment" NOT NULL,
    "quantitat" INTEGER NOT NULL,
    "usuariRegistraId" TEXT NOT NULL,
    "estat" "EstatMoviment" NOT NULL DEFAULT 'PENDENT',
    "confirmatPerId" TEXT,
    "dataRegistre" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConfirmacio" TIMESTAMP(3),

    CONSTRAINT "MovimentInventari_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuari_usuari_key" ON "Usuari"("usuari");

-- CreateIndex
CREATE UNIQUE INDEX "SubscripcioPush_endpoint_key" ON "SubscripcioPush"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Producte_codi_key" ON "Producte"("codi");

-- AddForeignKey
ALTER TABLE "Tasca" ADD CONSTRAINT "Tasca_assignatAId_fkey" FOREIGN KEY ("assignatAId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tasca" ADD CONSTRAINT "Tasca_creatPerId_fkey" FOREIGN KEY ("creatPerId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_assignatAId_fkey" FOREIGN KEY ("assignatAId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recordatori" ADD CONSTRAINT "Recordatori_usuariId_fkey" FOREIGN KEY ("usuariId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscripcioPush" ADD CONSTRAINT "SubscripcioPush_usuariId_fkey" FOREIGN KEY ("usuariId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaFormulari" ADD CONSTRAINT "RespostaFormulari_formulariId_fkey" FOREIGN KEY ("formulariId") REFERENCES "Formulari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespostaFormulari" ADD CONSTRAINT "RespostaFormulari_usuariId_fkey" FOREIGN KEY ("usuariId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentInventari" ADD CONSTRAINT "MovimentInventari_producteId_fkey" FOREIGN KEY ("producteId") REFERENCES "Producte"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentInventari" ADD CONSTRAINT "MovimentInventari_usuariRegistraId_fkey" FOREIGN KEY ("usuariRegistraId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentInventari" ADD CONSTRAINT "MovimentInventari_confirmatPerId_fkey" FOREIGN KEY ("confirmatPerId") REFERENCES "Usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
