CREATE TABLE "FotoProducte" (
  "id" TEXT NOT NULL,
  "producteId" TEXT NOT NULL,
  "nom" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "dades" BYTEA NOT NULL,
  "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FotoProducte_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FotoProducte_producteId_idx" ON "FotoProducte"("producteId");
ALTER TABLE "FotoProducte" ADD CONSTRAINT "FotoProducte_producteId_fkey"
  FOREIGN KEY ("producteId") REFERENCES "Producte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
