-- CreateEnum
CREATE TYPE "TipusRegistreReten" AS ENUM ('EXTRA_NORMAL', 'EXTRA_NOCTURNA', 'EXTRA_FESTIU', 'TRUCADA');

-- CreateTable
CREATE TABLE "Fitxatge" (
    "id" TEXT NOT NULL,
    "usuariId" TEXT NOT NULL,
    "entrada" TIMESTAMP(3) NOT NULL,
    "sortida" TIMESTAMP(3),
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fitxatge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistreReten" (
    "id" TEXT NOT NULL,
    "usuariId" TEXT NOT NULL,
    "tipus" "TipusRegistreReten" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "quantitat" DOUBLE PRECISION,
    "notes" TEXT,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistreReten_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Fitxatge" ADD CONSTRAINT "Fitxatge_usuariId_fkey" FOREIGN KEY ("usuariId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistreReten" ADD CONSTRAINT "RegistreReten_usuariId_fkey" FOREIGN KEY ("usuariId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
