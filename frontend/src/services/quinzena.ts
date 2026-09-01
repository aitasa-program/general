import { api } from './api';

export interface QuinzenaActual {
  setmanaInici: string;
  usuari: { id: string; nom: string } | null;
}

export interface Quinzena {
  id: string;
  setmanaInici: string;
  usuari: { id: string; nom: string };
}

export async function obtenirQuinzenaActual(): Promise<QuinzenaActual> {
  const { data } = await api.get('/quinzena/actual');
  return data;
}

export async function llistarQuinzenes(): Promise<Quinzena[]> {
  const { data } = await api.get('/quinzena');
  return data;
}

export async function assignarQuinzena(data: string, usuariId: string): Promise<Quinzena> {
  const { data: resposta } = await api.post('/quinzena', { data, usuariId });
  return resposta;
}

export async function eliminarQuinzena(id: string) {
  await api.delete(`/quinzena/${id}`);
}
