import { api } from './api';

export type TipusRegistreReten = 'EXTRA_NORMAL' | 'EXTRA_NOCTURNA' | 'EXTRA_FESTIU' | 'TRUCADA';

export interface RegistreReten {
  id: string;
  usuariId: string;
  usuari: { id: string; nom: string };
  tipus: TipusRegistreReten;
  data: string;
  horaInici: string;
  horaFi: string;
  quantitat: number;
  notes: string | null;
  creatEl: string;
}

export async function llistarRegistresReten(): Promise<RegistreReten[]> {
  const { data } = await api.get('/registre-reten');
  return data;
}

export async function crearRegistreReten(dades: {
  tipus: TipusRegistreReten;
  data: string;
  horaInici: string;
  horaFi: string;
  notes?: string;
}): Promise<RegistreReten> {
  const { data } = await api.post('/registre-reten', dades);
  return data;
}

export async function editarRegistreReten(
  id: string,
  dades: Partial<{ tipus: TipusRegistreReten; data: string; horaInici: string; horaFi: string; notes: string }>
): Promise<RegistreReten> {
  const { data } = await api.patch(`/registre-reten/${id}`, dades);
  return data;
}

export async function eliminarRegistreReten(id: string) {
  await api.delete(`/registre-reten/${id}`);
}
