ALTER TABLE "ChecklistItem"
ADD COLUMN "completatPerId" TEXT,
ADD COLUMN "completatPerNom" TEXT,
ADD COLUMN "completatEl" TIMESTAMP(3);

ALTER TABLE "ChecklistItem"
ADD CONSTRAINT "ChecklistItem_completatPerId_fkey"
FOREIGN KEY ("completatPerId") REFERENCES "Usuari"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
