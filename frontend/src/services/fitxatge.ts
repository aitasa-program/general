import { api } from './api';

export interface Fitxatge {
  id: string;
  usuariId: string;
  usuari: { id: string; nom: string };
  entrada: string;
  sortida: string | null;
  creatEl: string;
}

export async function obtenirFitxatgeActual(): Promise<Fitxatge | null> {
  const { data } = await api.get('/fitxatge/actual');
  return data;
}

export async function llistarFitxatges(): Promise<Fitxatge[]> {
  const { data } = await api.get('/fitxatge');
  return data;
}

export async function fitxarEntrada(): Promise<Fitxatge> {
  const { data } = await api.post('/fitxatge/entrada');
  return data;
}

export async function fitxarSortida(): Promise<Fitxatge> {
  const { data } = await api.post('/fitxatge/sortida');
  return data;
}

export async function editarFitxatge(
  id: string,
  dades: Partial<{ entrada: string; sortida: string | null }>
): Promise<Fitxatge> {
  const { data } = await api.patch(`/fitxatge/${id}`, dades);
  return data;
}

export async function eliminarFitxatge(id: string) {
  await api.delete(`/fitxatge/${id}`);
}
