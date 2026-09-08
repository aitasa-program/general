CREATE TABLE "PlantillaControl" (
  "id" TEXT NOT NULL, "nom" TEXT NOT NULL, "camps" JSONB NOT NULL,
  "versio" INTEGER NOT NULL DEFAULT 1, "activa" BOOLEAN NOT NULL DEFAULT true,
  "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlantillaControl_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RegistreControl" (
  "id" TEXT NOT NULL, "plantillaId" TEXT NOT NULL, "nom" TEXT NOT NULL,
  "versio" INTEGER NOT NULL, "camps" JSONB NOT NULL, "valors" JSONB NOT NULL,
  "dia" TEXT NOT NULL, "autorId" TEXT, "autorNom" TEXT NOT NULL,
  "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pdf" BYTEA NOT NULL, "sha256" TEXT NOT NULL, "empremtaSollicitud" TEXT NOT NULL,
  "rectificaId" TEXT, "motiu" TEXT,
  CONSTRAINT "RegistreControl_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RegistreControl_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RegistreControl_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RegistreControl_rectificaId_fkey" FOREIGN KEY ("rectificaId") REFERENCES "RegistreControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RegistreControl_rectificaId_key" ON "RegistreControl"("rectificaId");
CREATE INDEX "RegistreControl_dia_creatEl_idx" ON "RegistreControl"("dia", "creatEl");
CREATE INDEX "RegistreControl_plantillaId_dia_idx" ON "RegistreControl"("plantillaId", "dia");
CREATE TABLE "CarpetaDocument" (
  "id" TEXT NOT NULL, "nom" TEXT NOT NULL, "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarpetaDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CarpetaDocument_nom_key" ON "CarpetaDocument"("nom");
INSERT INTO "CarpetaDocument" ("id", "nom") VALUES ('pams', 'PAM,s');
CREATE TABLE "DocumentArxiu" (
  "id" TEXT NOT NULL, "carpetaId" TEXT NOT NULL, "nom" TEXT NOT NULL,
  "nomFitxer" TEXT NOT NULL, "mime" TEXT NOT NULL, "mida" INTEGER NOT NULL,
  "contingut" BYTEA NOT NULL, "sha256" TEXT NOT NULL, "autorId" TEXT,
  "autorNom" TEXT NOT NULL, "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentArxiu_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DocumentArxiu_carpetaId_fkey" FOREIGN KEY ("carpetaId") REFERENCES "CarpetaDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DocumentArxiu_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "DocumentArxiu_carpetaId_creatEl_idx" ON "DocumentArxiu"("carpetaId", "creatEl");
