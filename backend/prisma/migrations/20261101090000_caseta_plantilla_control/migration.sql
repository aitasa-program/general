-- Identifica la caseta/punt de control d'un formulari de "Registres de control",
-- perquè es puguin diferenciar dues plantilles amb el mateix nom a l'arxiu.
ALTER TABLE "PlantillaControl" ADD COLUMN "caseta" TEXT;
ALTER TABLE "RegistreControl" ADD COLUMN "caseta" TEXT;
