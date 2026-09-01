-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN     "assignatAQuinzena" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tasca" ADD COLUMN     "assignatAQuinzena" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Quinzena" (
    "id" TEXT NOT NULL,
    "setmanaInici" TIMESTAMP(3) NOT NULL,
    "usuariId" TEXT NOT NULL,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quinzena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quinzena_setmanaInici_key" ON "Quinzena"("setmanaInici");

-- AddForeignKey
ALTER TABLE "Quinzena" ADD CONSTRAINT "Quinzena_usuariId_fkey" FOREIGN KEY ("usuariId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
