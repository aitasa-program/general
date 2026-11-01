ALTER TABLE "PuntMapa"
ADD COLUMN "tipusAigua" "TipusAigua";

ALTER TABLE "ChecklistItem"
ADD COLUMN "mapaPuntId" TEXT;

CREATE INDEX "ChecklistItem_mapaPuntId_idx"
ON "ChecklistItem"("mapaPuntId");

ALTER TABLE "ChecklistItem"
ADD CONSTRAINT "ChecklistItem_mapaPuntId_fkey"
FOREIGN KEY ("mapaPuntId") REFERENCES "PuntMapa"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
