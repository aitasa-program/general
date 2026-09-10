-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN     "assignatAQuinzenaB" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tasca" ADD COLUMN     "assignatAQuinzenaB" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "QuinzenaB" (
    "id" TEXT NOT NULL,
    "setmanaInici" TIMESTAMP(3) NOT NULL,
    "usuariId" TEXT NOT NULL,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuinzenaB_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuinzenaB_setmanaInici_key" ON "QuinzenaB"("setmanaInici");

-- AddForeignKey
ALTER TABLE "QuinzenaB" ADD CONSTRAINT "QuinzenaB_usuariId_fkey" FOREIGN KEY ("usuariId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
