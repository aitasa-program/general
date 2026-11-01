ALTER TABLE "ChecklistItem"
ADD COLUMN "origenComptadorKey" TEXT;

CREATE UNIQUE INDEX "ChecklistItem_origenComptadorKey_key"
ON "ChecklistItem"("origenComptadorKey");
