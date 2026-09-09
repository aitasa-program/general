-- Editable template for individual visits to the huts. Existing records are unchanged.
INSERT INTO "PlantillaControl" ("id", "nom", "camps", "versio", "activa")
VALUES (
  '34fbb38f-48ec-4b30-8524-d236f5c2d162',
  'Control de pH i manteniment de les casetes',
  $template$[
    {"nom":"Caseta","tipus":"seleccio","obligatori":true,"opcions":["TCU","TC2","TC3-V1","TC3-V2","TC4","TC5","TC6","TC7","TC8 A","TC8 R","TC9","CR2","CR3","CR4"]},
    {"nom":"pH","tipus":"numero","obligatori":true},
    {"nom":"Estat del manteniment","tipus":"seleccio","obligatori":true,"opcions":["Correcte","Requereix manteniment","Manteniment realitzat","Pendent de revisió"]},
    {"nom":"Comprovacions i treballs realitzats","tipus":"multilinia","obligatori":true},
    {"nom":"Incidències i observacions","tipus":"multilinia","obligatori":false}
  ]$template$::jsonb,
  1,
  true
)
ON CONFLICT ("id") DO NOTHING;
