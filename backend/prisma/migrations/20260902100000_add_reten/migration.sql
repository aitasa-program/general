-- CreateTable
CREATE TABLE "Reten" (
    "id" TEXT NOT NULL,
    "setmanaInici" TIMESTAMP(3) NOT NULL,
    "usuariId" TEXT NOT NULL,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reten_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reten_setmanaInici_key" ON "Reten"("setmanaInici");

-- AddForeignKey
ALTER TABLE "Reten" ADD CONSTRAINT "Reten_usuariId_fkey" FOREIGN KEY ("usuariId") REFERENCES "Usuari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
