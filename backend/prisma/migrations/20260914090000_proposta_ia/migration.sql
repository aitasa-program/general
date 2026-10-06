-- CreateEnum
CREATE TYPE "EstatPropostaIA" AS ENUM ('PENDENT', 'APLICADA', 'REBUTJADA', 'ERROR');

-- CreateTable
CREATE TABLE "PropostaIA" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "resum" TEXT NOT NULL,
    "fitxers" JSONB NOT NULL,
    "missatgeCommit" TEXT NOT NULL,
    "estat" "EstatPropostaIA" NOT NULL DEFAULT 'PENDENT',
    "error" TEXT,
    "commitSha" TEXT,
    "creatPerId" TEXT NOT NULL,
    "aplicatPerId" TEXT,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resoltEl" TIMESTAMP(3),

    CONSTRAINT "PropostaIA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropostaIA_estat_idx" ON "PropostaIA"("estat");

-- AddForeignKey
ALTER TABLE "PropostaIA" ADD CONSTRAINT "PropostaIA_creatPerId_fkey" FOREIGN KEY ("creatPerId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropostaIA" ADD CONSTRAINT "PropostaIA_aplicatPerId_fkey" FOREIGN KEY ("aplicatPerId") REFERENCES "Usuari"("id") ON DELETE SET NULL ON UPDATE CASCADE;
