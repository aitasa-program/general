-- CreateTable
CREATE TABLE "ModelSetmanal" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "titol" TEXT NOT NULL,
    "instruccions" TEXT NOT NULL,
    "llocs" JSONB NOT NULL,
    "grups" JSONB NOT NULL,
    "organoleptics" JSONB NOT NULL,
    "notaOrg" TEXT NOT NULL,
    "notaAnomalies" TEXT NOT NULL,
    "bespoke" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creatEl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelSetmanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigPdf" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "logoDades" BYTEA,
    "logoMime" TEXT,
    "colorPrimari" TEXT NOT NULL DEFAULT '#0066D6',
    "peuText" TEXT,
    "actualitzatPerId" TEXT,
    "actualitzatEl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigPdf_pkey" PRIMARY KEY ("id")
);

-- Seed: els 4 formularis de "Controls setmanals" ja existents (bespoke, amb el
-- mateix contingut exacte que tenien fins ara com a codi fix), perquè els fulls
-- i PDFs ja guardats (FullControlSetmanal.tipus) segueixin funcionant igual.
INSERT INTO "ModelSetmanal" ("id","nom","titol","instruccions","llocs","grups","organoleptics","notaOrg","notaAnomalies","bespoke","activa")
VALUES ('xarxa-clorada', 'Xarxa Clorada', 'XARXA CLORADA', 'S’anotaran els valors que indiquin els diferents analitzadors a la següent taula, i es comprovaran amb l’equip portàtil com a mínim dos cops per setmana, anotant també el seu valor. El valor de clor residual a la xarxa es mantindrà entre 0,3 i 0,95 mg/l, sense superar mai 1 mg/l.', '["Sortida Dipòsit","Repsol Tanques","BASF PTP","CLARIANT"]'::jsonb, '[{"nom":"Sortida Dipòsit","camps":[{"key":"diposit_hora","label":"Hora","tipus":"hora"},{"key":"diposit_auto","label":"Auto (mg/l)","tipus":"numero"},{"key":"diposit_manual","label":"Manual (mg/l)","tipus":"numero"}]},{"nom":"Repsol Tanques","camps":[{"key":"repsol_hora","label":"Hora","tipus":"hora"},{"key":"repsol_auto","label":"Auto (mg/l)","tipus":"numero"},{"key":"repsol_manual","label":"Manual (mg/l)","tipus":"numero"}]},{"nom":"BASF PTP","camps":[{"key":"basf_hora","label":"Hora","tipus":"hora"},{"key":"basf_auto","label":"Auto (mg/l)","tipus":"numero"},{"key":"basf_manual","label":"Manual (mg/l)","tipus":"numero"}]},{"nom":"CLARIANT","camps":[{"key":"clariant_hora","label":"Hora","tipus":"hora"},{"key":"clariant_auto","label":"Auto (mg/l)","tipus":"numero"},{"key":"clariant_manual","label":"Manual (mg/l)","tipus":"numero"}]}]'::jsonb, '[{"key":"color","label":"Color","tipus":"seleccio","opcions":["Incolor","Colora"]},{"key":"olor","label":"Olor","tipus":"seleccio","opcions":["Inolor","Olora"]},{"key":"sabor","label":"Sabor","tipus":"seleccio","opcions":["Insípida","Sabora"]},{"key":"terbolesa_auto","label":"Terbolesa Auto (UNF)","tipus":"numero"},{"key":"terbolesa_manual","label":"Terbolesa Manual (UNF)","tipus":"numero"},{"key":"ph_auto","label":"pH Auto","tipus":"numero"},{"key":"ph_manual","label":"pH Manual","tipus":"numero"},{"key":"observacions","label":"Observacions","tipus":"text"}]'::jsonb, 'Cal fer exàmens organolèptics mínim 2 cops per setmana. Color: incolora, lleuger color o molt acolorida. Olor: inodora, lleuger olor o forta olor. Sabor: insípida, lleuger sabor o fort sabor. Terbolesa: s’ha de realitzar amb kit. pH: s’ha de realitzar amb kit, 4,5–10.', 'Si la difèrencia entre l’analitzador automàtic i el portàtil (manual) és superior a 0,1 ppm, ajustar l’equip.', true, true);

INSERT INTO "ModelSetmanal" ("id","nom","titol","instruccions","llocs","grups","organoleptics","notaOrg","notaAnomalies","bespoke","activa")
VALUES ('clor-tc8', 'Clor TC8', 'Sortida TC · TC-8 A', 'S’anotaran els valors i es comprovaran amb l’analitzador portàtil com a mínim dos cops a la setmana. El valor de clor residual a la sortida de la TC-8 ha de ser, com a màxim, de 0,2 mg/l. Si se supera aquest límit, caldrà avisar immediatament la persona responsable.', '["TC-8 A"]'::jsonb, '[{"nom":"TC-8 A","camps":[{"key":"hora","label":"Hora","tipus":"hora"},{"key":"valor","label":"Valor (mg/l)","tipus":"numero"},{"key":"observacions","label":"Observacions","tipus":"text"}]}]'::jsonb, '[{"key":"color","label":"Color","tipus":"seleccio","opcions":["Incolor","Colora"]},{"key":"terbolesa","label":"Terbolesa","tipus":"text"},{"key":"ph","label":"pH","tipus":"numero"},{"key":"observacions","label":"Observacions","tipus":"text"}]'::jsonb, 'Cal fer exàmens organolèptics mínim 2 cops per setmana. Color: incolora, lleuger color o molt acolorida. Terbolesa: neta, lleugerament tèrbola o molt tèrbola. pH: s’ha de realitzar amb kit, 4,5–9,5.', '', true, true);

INSERT INTO "ModelSetmanal" ("id","nom","titol","instruccions","llocs","grups","organoleptics","notaOrg","notaAnomalies","bespoke","activa")
VALUES ('dupont', 'Dupont', 'XARXA CLORADA · DUPONT', 'S’anotaran els valors que indiquin els diferents analitzadors a la següent taula, i es comprovaran amb l’equip portàtil com a mínim dos cops per setmana, anotant també el seu valor. El valor de clor residual a la xarxa es mantindrà entre 0,3 i 0,95 mg/l, sense superar mai 1 mg/l.', '["Dupont"]'::jsonb, '[{"nom":"Dupont","camps":[{"key":"dupont_hora","label":"Hora","tipus":"hora"},{"key":"dupont_auto","label":"Auto (mg/l)","tipus":"numero"},{"key":"dupont_manual","label":"Manual (mg/l)","tipus":"numero"},{"key":"polsos","label":"Pulsos/hora","tipus":"numero"}]}]'::jsonb, '[{"key":"color","label":"Color","tipus":"seleccio","opcions":["Incolor","Colora"]},{"key":"olor","label":"Olor","tipus":"seleccio","opcions":["Inolor","Olora"]},{"key":"sabor","label":"Sabor","tipus":"seleccio","opcions":["Insípida","Sabora"]},{"key":"terbolesa","label":"Terbolesa (UNF)","tipus":"numero"},{"key":"ph","label":"pH","tipus":"numero"},{"key":"observacions","label":"Observacions","tipus":"text"}]'::jsonb, 'Cal fer exàmens organolèptics mínim 2 cops per setmana. Color: incolora, lleuger color o molt acolorida. Olor: inodora, lleuger olor o forta olor. Sabor: insípida, lleuger sabor o fort sabor. Terbolesa: s’ha de realitzar amb kit. pH: s’ha de realitzar amb kit, 4,5–10.', 'Si la difèrencia entre l’analitzador automàtic i el portàtil (manual) és superior a 0,1 ppm, ajustar l’equip.', true, true);

INSERT INTO "ModelSetmanal" ("id","nom","titol","instruccions","llocs","grups","organoleptics","notaOrg","notaAnomalies","bespoke","activa")
VALUES ('repsol-deslastres', 'Repsol Deslastres', 'REPSOL DESLASTRES · DESLASTRES I PORTA 80', 'S’anotaran els valors que indiquin els diferents analitzadors a la següent taula, i es comprovaran amb l’equip portàtil com a mínim dos cops per setmana, anotant també el seu valor. El valor de clor residual a la xarxa es mantindrà entre 0,3 i 0,95 mg/l, sense superar mai 1 mg/l.', '["Deslastres","Porta 80"]'::jsonb, '[{"nom":"Deslastres","camps":[{"key":"deslastres_hora","label":"Hora","tipus":"hora"},{"key":"deslastres_auto","label":"Auto (mg/l)","tipus":"numero"},{"key":"deslastres_manual","label":"Manual (mg/l)","tipus":"numero"},{"key":"deslastres_polsos","label":"Pulsos/hora","tipus":"numero"}]},{"nom":"Porta 80","camps":[{"key":"porta80_hora","label":"Hora","tipus":"hora"},{"key":"porta80_auto","label":"Auto (mg/l)","tipus":"numero"},{"key":"porta80_manual","label":"Manual (mg/l)","tipus":"numero"},{"key":"porta80_polsos","label":"Pulsos/hora","tipus":"numero"}]}]'::jsonb, '[{"key":"color","label":"Color","tipus":"seleccio","opcions":["Incolor","Colora"]},{"key":"olor","label":"Olor","tipus":"seleccio","opcions":["Inolor","Olora"]},{"key":"sabor","label":"Sabor","tipus":"seleccio","opcions":["Insípida","Sabora"]},{"key":"terbolesa","label":"Terbolesa (UNF)","tipus":"numero"},{"key":"ph","label":"pH","tipus":"numero"},{"key":"observacions","label":"Observacions","tipus":"text"}]'::jsonb, 'Cal fer exàmens organolèptics mínim 2 cops per setmana. Color: incolora, lleuger color o molt acolorida. Olor: inodora, lleuger olor o forta olor. Sabor: insípida, lleuger sabor o fort sabor. Terbolesa: s’ha de realitzar amb kit. pH: s’ha de realitzar amb kit, 4,5–10.', 'Si la difèrencia entre l’analitzador automàtic i el portàtil (manual) és superior a 0,1 ppm, ajustar l’equip.', true, true);


-- Seed: configuració de PDF per defecte (mateix color blau que es feia servir fins ara).
INSERT INTO "ConfigPdf" ("id", "colorPrimari", "actualitzatEl") VALUES ('default', '#0066D6', CURRENT_TIMESTAMP);
