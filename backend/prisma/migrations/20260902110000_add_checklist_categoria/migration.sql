-- CreateEnum
CREATE TYPE "CategoriaChecklist" AS ENUM ('GENERAL', 'COMPTADOR');

-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN     "categoria" "CategoriaChecklist" NOT NULL DEFAULT 'GENERAL';
