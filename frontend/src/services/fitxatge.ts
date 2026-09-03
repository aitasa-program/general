import { api } from './api';

export interface Fitxatge {
  id: string;
  usuariId: string;
  usuari: { id: string; nom: string };
  entrada: string;
  sortida: string;
  lloc: string;
  descripcio: string | null;
  creatEl: string;
}

export async function llistarFitxatges(): Promise<Fitxatge[]> {
  const { data } = await api.get('/fitxatge');
  return data;
}

export async function crearFitxatge(dades: {
  entrada: string;
  sortida: string;
  lloc: string;
  descripcio?: string;
}): Promise<Fitxatge> {
  const { data } = await api.post('/fitxatge', dades);
  return data;
}

export async function editarFitxatge(
  id: string,
  dades: Partial<{ entrada: string; sortida: string; lloc: string; descripcio: string }>
): Promise<Fitxatge> {
  const { data } = await api.patch(`/fitxatge/${id}`, dades);
  return data;
}

export async function eliminarFitxatge(id: string) {
  await api.delete(`/fitxatge/${id}`);
}
