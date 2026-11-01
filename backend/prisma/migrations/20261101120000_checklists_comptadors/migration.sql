CREATE TYPE "TipusAigua" AS ENUM (
  'XARXA_INDUSTRIAL',
  'XARXA_REGENERADA',
  'XARXA_CLORADA',
  'TRACTAMENT_CONJUNT'
);

ALTER TABLE "Comptador"
ADD COLUMN "tipusAigua" "TipusAigua";

ALTER TABLE "Checklist"
ADD COLUMN "origenComptadors" TEXT;

CREATE UNIQUE INDEX "Checklist_origenComptadors_key"
ON "Checklist"("origenComptadors");

ALTER TABLE "ChecklistItem"
ADD COLUMN "comptadorId" TEXT;

CREATE UNIQUE INDEX "ChecklistItem_comptadorId_key"
ON "ChecklistItem"("comptadorId");

ALTER TABLE "ChecklistItem"
ADD CONSTRAINT "ChecklistItem_comptadorId_fkey"
FOREIGN KEY ("comptadorId") REFERENCES "Comptador"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
