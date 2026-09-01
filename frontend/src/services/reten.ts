import { api } from './api';

export interface RetenActual {
  setmanaInici: string;
  usuari: { id: string; nom: string } | null;
}

export interface Reten {
  id: string;
  setmanaInici: string;
  usuari: { id: string; nom: string };
}

export async function obtenirRetenActual(): Promise<RetenActual> {
  const { data } = await api.get('/reten/actual');
  return data;
}

export async function llistarRetens(): Promise<Reten[]> {
  const { data } = await api.get('/reten');
  return data;
}

export async function assignarReten(data: string, usuariId: string): Promise<Reten> {
  const { data: resposta } = await api.post('/reten', { data, usuariId });
  return resposta;
}

export async function eliminarReten(id: string) {
  await api.delete(`/reten/${id}`);
}
