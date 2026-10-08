-- Mostra recurrent cada dimecres de EPN i EPS, durant tot l'any. Com que intervalDies=7,
-- cada vegada que es marqui com a feta es crearà automàticament la de la setmana següent
-- (mateix mecanisme que fan servir les tasques i checklists recurrents).
INSERT INTO "Mostra" (id, grup, titol, data, notes, "intervalDies", feta, clau, "creatEl")
VALUES
(gen_random_uuid(), 'EPN', 'Mostra setmanal', '2026-10-14', '', 7, false, 'c1d86c618e3fe812574edfcb5a397f8c65cee8750078de318ca5f07c2338191c', now()),
(gen_random_uuid(), 'EPS', 'Mostra setmanal', '2026-10-14', '', 7, false, 'da07c636df6a1820af8711ca23018d4852768658bf6be8baea3b418c78796a72', now())
ON CONFLICT (clau) DO NOTHING;
