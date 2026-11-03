-- Converteix "Comptadors" en un checklist de lectura: tipus d'aigua i estat de lectura,
-- que només un encarregat pot canviar.
ALTER TABLE "Comptador" ADD COLUMN "tipusAigua" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Comptador" ADD COLUMN "llegit" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Comptador" ADD COLUMN "llegitEl" TIMESTAMP(3);
