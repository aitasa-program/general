-- AlterTable
ALTER TABLE "PlantillaControl" ADD COLUMN     "pdfLogoDades" BYTEA,
ADD COLUMN     "pdfLogoMime" TEXT,
ADD COLUMN     "pdfColorPrimari" TEXT,
ADD COLUMN     "pdfPeuText" TEXT,
ADD COLUMN     "pdfInfoAddicional" TEXT;

-- AlterTable
ALTER TABLE "ModelSetmanal" ADD COLUMN     "pdfLogoDades" BYTEA,
ADD COLUMN     "pdfLogoMime" TEXT,
ADD COLUMN     "pdfColorPrimari" TEXT,
ADD COLUMN     "pdfPeuText" TEXT,
ADD COLUMN     "pdfInfoAddicional" TEXT;
