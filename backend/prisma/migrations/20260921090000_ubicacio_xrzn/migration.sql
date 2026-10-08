-- Afegeix la ubicació (Dipòsit de la Pobla) a les notes de les mostres de XR-ZN.
UPDATE "Mostra"
SET notes = 'Ubicació: Dipòsit de la Pobla. ' || notes
WHERE grup = 'XR-ZN' AND notes NOT LIKE 'Ubicació:%';
