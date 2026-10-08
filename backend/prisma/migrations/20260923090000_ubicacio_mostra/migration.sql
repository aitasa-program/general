-- AlterTable
ALTER TABLE "Mostra" ADD COLUMN     "ubicacio" TEXT NOT NULL DEFAULT '';

-- Trasllada la ubicació que ja teníem escrita al principi de les notes de XR-ZN
-- (afegida a la migració 20260921090000_ubicacio_xrzn) al nou camp dedicat.
UPDATE "Mostra"
SET ubicacio = 'Dipòsit de la Pobla',
    notes = trim(substring(notes from length('Ubicació: Dipòsit de la Pobla. ') + 1))
WHERE grup = 'XR-ZN' AND notes LIKE 'Ubicació: Dipòsit de la Pobla. %';
