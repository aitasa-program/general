-- Allow alternating pH and maintenance visits; preserve immutable saved records.
UPDATE "PlantillaControl"
SET "camps" = (
  SELECT jsonb_agg(
    CASE WHEN camp->>'nom' IN ('pH', 'Estat del manteniment')
      THEN jsonb_set(camp, '{obligatori}', 'false'::jsonb)
      ELSE camp
    END ORDER BY posicio
  )
  FROM jsonb_array_elements("camps") WITH ORDINALITY AS camps(camp, posicio)
), "versio" = "versio" + 1
WHERE "id" = '34fbb38f-48ec-4b30-8524-d236f5c2d162';
