CREATE TABLE "FullControlSetmanal" (
  "id" TEXT NOT NULL, "tipus" TEXT NOT NULL, "setmana" TEXT NOT NULL, "versio" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "FullControlSetmanal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FullControlSetmanal_tipus_setmana_key" ON "FullControlSetmanal"("tipus", "setmana");
CREATE TABLE "RevisioControlSetmanal" (
  "id" TEXT NOT NULL, "fullId" TEXT NOT NULL, "versio" INTEGER NOT NULL, "dades" JSONB NOT NULL,
  "autorId" TEXT NOT NULL, "autorNom" TEXT NOT NULL, "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "motiu" TEXT, "pdf" BYTEA NOT NULL, "sha256" TEXT NOT NULL, "peticioHash" TEXT NOT NULL,
  CONSTRAINT "RevisioControlSetmanal_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RevisioControlSetmanal_fullId_fkey" FOREIGN KEY ("fullId") REFERENCES "FullControlSetmanal"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RevisioControlSetmanal_fullId_versio_key" ON "RevisioControlSetmanal"("fullId", "versio");
