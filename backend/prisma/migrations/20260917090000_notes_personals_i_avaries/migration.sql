-- CreateTable
CREATE TABLE "NotaPersonal" (
    "id" TEXT NOT NULL,
    "usuariId" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "fotoDades" BYTEA,
    "fotoMime" TEXT,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualitzatEl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotaPersonal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotaPersonal_usuariId_idx" ON "NotaPersonal"("usuariId");

-- AddForeignKey
ALTER TABLE "NotaPersonal" ADD CONSTRAINT "NotaPersonal_usuariId_fkey" FOREIGN KEY ("usuariId") REFERENCES "Usuari"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "RegistreAvaria" (
    "id" TEXT NOT NULL,
    "usuariId" TEXT,
    "usuariNom" TEXT NOT NULL,
    "problema" TEXT NOT NULL,
    "solucio" TEXT,
    "fotoDades" BYTEA,
    "fotoMime" TEXT,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistreAvaria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RegistreAvaria" ADD CONSTRAINT "RegistreAvaria_usuariId_fkey" FOREIGN KEY ("usuariId") REFERENCES "Usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
