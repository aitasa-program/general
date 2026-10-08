-- Aquesta migració havia fallat en producció perquè va topar amb un "TC" ja existent
-- (un seguiment mensual "Mostreig Mensual <mes>" fet abans d'aquesta sessió, que
-- coincidia de data amb 3 de les mostres que es van afegir a 20260920090000_pla_mostres_2026).
-- Aquí es corregeix: s'elimina la fila duplicada que vam afegir nosaltres per a cada
-- data que ja existia, i es renombren totes les mostres de TC restants a "Mostres TC".

-- Duplicats introduïts per 20260920090000_pla_mostres_2026 (mateixa data que un
-- "Mostreig Mensual" ja existent): 13/10, 17/11 i 14/12.
DELETE FROM "Mostra" WHERE id IN (
  '64d4f3a7-2627-44be-b280-505a6a61f258',
  'f0c9240e-4860-4b92-a396-1f59f05443f5',
  '93eb984b-d87c-4ff1-83b2-9e93c076acc5'
);

-- Renombra la resta de mostres de TC (les 7 "Mostreig Mensual <mes>" originals i les
-- 3 que vam afegir sense duplicar: 14/10, 18/11 i 15/12).
UPDATE "Mostra" SET titol = 'Mostres TC', clau = 'a87b210b71941794bd7b19bfea1eacd64bf1403f048584e6ee6403e3a694f8b0' WHERE id = '87648daa-a027-4e80-893a-b2bdc2fc1a39';
UPDATE "Mostra" SET titol = 'Mostres TC', clau = 'a5e813c287841dce264db8b9bc50d043dd89fa60e54fcdab0bcffe3a3a273bfc' WHERE id = 'd8e6e88f-0af1-443d-b1ad-499cd51cd269';
UPDATE "Mostra" SET titol = 'Mostres TC', clau = '954e87965f421263a5ba670e26611e05bfb4296ced01e058244e8ca609cecf6c' WHERE id = 'ccaf4f23-0553-45f5-bf9c-49feb5594697';
UPDATE "Mostra" SET titol = 'Mostres TC', clau = 'd9c190b627f4aed9950e0ad52538d7883b0f05685a45e503009933f79d3020de' WHERE id = '3dcca446-ad4e-4c12-9348-8fde931e8158';
UPDATE "Mostra" SET titol = 'Mostres TC', clau = '2e77d6ae1c07243b19e46cad50eeef55e86378077f820498febd8c548f99b977' WHERE id = '4b428a2b-683e-4bc8-b2e7-560f7d7bd11e';
UPDATE "Mostra" SET titol = 'Mostres TC', clau = '98255bdb6183a7132db8a9df75095e34b4195b5c0ad3f020a02977b9165e4461' WHERE id = '0e54c496-1068-4e82-b099-301635b840a1';
UPDATE "Mostra" SET titol = 'Mostres TC', clau = '0d52d74072c06ea642b8d0db174cf72a15496aaf793ae827b887a4d364779539' WHERE id = '977fc5ce-f0e1-4378-882f-3daa41646309';
UPDATE "Mostra" SET titol = 'Mostres TC', clau = '04b72a7d663af9a95adc614c9c6a757061a5e76f3ee7af95d680f041de7f9cc2' WHERE id = '63c25468-b336-4239-b529-a198522bda8c';
UPDATE "Mostra" SET titol = 'Mostres TC', clau = '5eb27f9b8e082a26b9ffbaa0c044dff4e2238772a9aef2e700c38bf82c929650' WHERE id = '3eeeedf0-fbab-40bf-b903-81f4ab8f5a20';
UPDATE "Mostra" SET titol = 'Mostres TC', clau = '762167e18f8893c3b69d6ddad8698382367384160b41328ed64cf3e6e48ca2df' WHERE id = '5c6f421e-5f57-4702-aef8-c5357c63e2a8';
