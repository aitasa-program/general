-- CreateTable
CREATE TABLE "ChecklistHistoric" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT,
    "nom" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "assignatAlReten" BOOLEAN NOT NULL DEFAULT false,
    "assignatAQuinzena" BOOLEAN NOT NULL DEFAULT false,
    "assignatAQuinzenaB" BOOLEAN NOT NULL DEFAULT false,
    "responsableId" TEXT,
    "responsableNom" TEXT,
    "items" JSONB NOT NULL,
    "arxivatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistHistoric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistHistoric_data_idx" ON "ChecklistHistoric"("data");

-- CreateIndex
CREATE INDEX "ChecklistHistoric_responsableId_idx" ON "ChecklistHistoric"("responsableId");

-- AddForeignKey
ALTER TABLE "ChecklistHistoric" ADD CONSTRAINT "ChecklistHistoric_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistHistoric" ADD CONSTRAINT "ChecklistHistoric_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
