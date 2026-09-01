import { api } from './api';

export interface QuinzenaBActual {
  setmanaInici: string;
  usuari: { id: string; nom: string } | null;
}

export interface QuinzenaB {
  id: string;
  setmanaInici: string;
  usuari: { id: string; nom: string };
}

export async function obtenirQuinzenaBActual(): Promise<QuinzenaBActual> {
  const { data } = await api.get('/quinzena-b/actual');
  return data;
}

export async function llistarQuinzenesB(): Promise<QuinzenaB[]> {
  const { data } = await api.get('/quinzena-b');
  return data;
}

export async function assignarQuinzenaB(data: string, usuariId: string): Promise<QuinzenaB> {
  const { data: resposta } = await api.post('/quinzena-b', { data, usuariId });
  return resposta;
}

export async function eliminarQuinzenaB(id: string) {
  await api.delete(`/quinzena-b/${id}`);
}
