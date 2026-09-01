-- CreateTable
CREATE TABLE "_TasquesAssignades" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_TasquesAssignades_AB_unique" ON "_TasquesAssignades"("A", "B");

-- CreateIndex
CREATE INDEX "_TasquesAssignades_B_index" ON "_TasquesAssignades"("B");

-- AddForeignKey
ALTER TABLE "_TasquesAssignades" ADD CONSTRAINT "_TasquesAssignades_A_fkey" FOREIGN KEY ("A") REFERENCES "Tasca"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TasquesAssignades" ADD CONSTRAINT "_TasquesAssignades_B_fkey" FOREIGN KEY ("B") REFERENCES "Usuari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single-assignee data into the new join table before dropping the column
INSERT INTO "_TasquesAssignades" ("A", "B")
SELECT "id", "assignatAId" FROM "Tasca" WHERE "assignatAId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "Tasca" DROP CONSTRAINT "Tasca_assignatAId_fkey";

-- AlterTable
ALTER TABLE "Tasca" DROP COLUMN "assignatAId";
