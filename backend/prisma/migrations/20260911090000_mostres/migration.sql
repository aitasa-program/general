CREATE TABLE "Mostra" ("id" TEXT NOT NULL, "grup" TEXT NOT NULL, "titol" TEXT NOT NULL, "data" TEXT NOT NULL, "notes" TEXT NOT NULL DEFAULT '', "intervalDies" INTEGER NOT NULL DEFAULT 0, "feta" BOOLEAN NOT NULL DEFAULT false, "clau" TEXT NOT NULL, "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Mostra_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Mostra_clau_key" ON "Mostra"("clau");
CREATE INDEX "Mostra_data_grup_idx" ON "Mostra"("data", "grup");
