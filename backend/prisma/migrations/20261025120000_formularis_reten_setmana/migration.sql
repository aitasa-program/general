ALTER TABLE "Formulari"
ADD COLUMN "retenObligatoriDesDe" TIMESTAMP(3);

UPDATE "Formulari"
SET "retenObligatoriDesDe" = date_trunc('week', CURRENT_TIMESTAMP) + INTERVAL '8 hours';

ALTER TABLE "Formulari"
ALTER COLUMN "retenObligatoriDesDe" SET NOT NULL;

ALTER TABLE "RespostaFormulari"
ADD COLUMN "setmanaReten" TIMESTAMP(3);

UPDATE "RespostaFormulari" AS resposta
SET "setmanaReten" = reten."setmanaInici"
FROM "Reten" AS reten
WHERE resposta."usuariId" = reten."usuariId"
  AND resposta."dataEl" >= reten."setmanaInici"
  AND resposta."dataEl" < reten."setmanaInici" + INTERVAL '7 days';

CREATE INDEX "RespostaFormulari_formulariId_setmanaReten_idx"
ON "RespostaFormulari"("formulariId", "setmanaReten");
