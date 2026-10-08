-- Elimina el formulari (control setmanal) de "Xarxa Industrial" existent, creat des de
-- l'editor (mai afecta els 4 formularis originals, que tenen bespoke = true).
DELETE FROM "ModelSetmanal" WHERE nom ILIKE '%industrial%' AND bespoke = false;

-- Crea'l de nou amb l'estructura demanada: CAT, Torre, 3M, Sortida 1 i Sortida 2, cadascun
-- amb clor manual, clor automàtic, diferència i si cal calibrar. Sense organolèptics.
INSERT INTO "ModelSetmanal" (id, nom, titol, instruccions, llocs, grups, organoleptics, "notaOrg", "notaAnomalies", bespoke, activa, "creatEl")
VALUES (
  gen_random_uuid(),
  'Xarxa Industrial',
  'XARXA INDUSTRIAL',
  '',
  '["CAT","Torre","3M","Sortida 1","Sortida 2"]'::jsonb,
  '[{"nom":"CAT","camps":[{"key":"manual","label":"Clor Manual (mg/l)","tipus":"numero"},{"key":"auto","label":"Clor Automàtic (mg/l)","tipus":"numero"},{"key":"diferencia","label":"Diferència (mg/l)","tipus":"numero"},{"key":"calibrar","label":"Cal calibrar?","tipus":"seleccio","opcions":["Sí","No"]}]},{"nom":"Torre","camps":[{"key":"manual","label":"Clor Manual (mg/l)","tipus":"numero"},{"key":"auto","label":"Clor Automàtic (mg/l)","tipus":"numero"},{"key":"diferencia","label":"Diferència (mg/l)","tipus":"numero"},{"key":"calibrar","label":"Cal calibrar?","tipus":"seleccio","opcions":["Sí","No"]}]},{"nom":"3M","camps":[{"key":"manual","label":"Clor Manual (mg/l)","tipus":"numero"},{"key":"auto","label":"Clor Automàtic (mg/l)","tipus":"numero"},{"key":"diferencia","label":"Diferència (mg/l)","tipus":"numero"},{"key":"calibrar","label":"Cal calibrar?","tipus":"seleccio","opcions":["Sí","No"]}]},{"nom":"Sortida 1","camps":[{"key":"manual","label":"Clor Manual (mg/l)","tipus":"numero"},{"key":"auto","label":"Clor Automàtic (mg/l)","tipus":"numero"},{"key":"diferencia","label":"Diferència (mg/l)","tipus":"numero"},{"key":"calibrar","label":"Cal calibrar?","tipus":"seleccio","opcions":["Sí","No"]}]},{"nom":"Sortida 2","camps":[{"key":"manual","label":"Clor Manual (mg/l)","tipus":"numero"},{"key":"auto","label":"Clor Automàtic (mg/l)","tipus":"numero"},{"key":"diferencia","label":"Diferència (mg/l)","tipus":"numero"},{"key":"calibrar","label":"Cal calibrar?","tipus":"seleccio","opcions":["Sí","No"]}]}]'::jsonb,
  '[]'::jsonb,
  '',
  '',
  false,
  true,
  now()
);
