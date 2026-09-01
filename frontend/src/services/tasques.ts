import { api } from './api';

export interface Tasca {
  id: string;
  titol: string;
  descripcio?: string;
  estat: 'PENDENT' | 'EN_CURS' | 'FETA';
  prioritat: 'BAIXA' | 'MITJANA' | 'ALTA';
  dataLimit?: string;
  assignatAId: string;
  assignatA: { id: string; nom: string };
  creatPer: { id: string; nom: string };
}

export async function llistarTasques(): Promise<Tasca[]> {
  const { data } = await api.get('/tasques');
  return data;
}

export async function crearTasca(dades: {
  titol: string;
  descripcio?: string;
  assignatAId: string;
  dataLimit?: string;
  prioritat: 'BAIXA' | 'MITJANA' | 'ALTA';
}): Promise<Tasca> {
  const { data } = await api.post('/tasques', dades);
  return data;
}

export async function canviarEstatTasca(id: string, estat: string): Promise<Tasca> {
  const { data } = await api.patch(`/tasques/${id}/estat`, { estat });
  return data;
}
