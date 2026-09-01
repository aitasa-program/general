import { api } from './api';

export interface Tasca {
  id: string;
  titol: string;
  descripcio?: string;
  estat: 'PENDENT' | 'EN_CURS' | 'FETA';
  prioritat: 'BAIXA' | 'MITJANA' | 'ALTA';
  repeticio: 'UNIC' | 'DIARIA' | 'SETMANAL';
  dataLimit?: string;
  assignatsA: { id: string; nom: string }[];
  assignatAlReten: boolean;
  creatPer: { id: string; nom: string };
}

export async function llistarTasques(): Promise<Tasca[]> {
  const { data } = await api.get('/tasques');
  return data;
}

export async function crearTasca(dades: {
  titol: string;
  descripcio?: string;
  assignatsAIds: string[];
  assignatAlReten?: boolean;
  dataLimit?: string;
  prioritat: 'BAIXA' | 'MITJANA' | 'ALTA';
  repeticio?: 'UNIC' | 'DIARIA' | 'SETMANAL';
}): Promise<Tasca> {
  const { data } = await api.post('/tasques', dades);
  return data;
}

export async function canviarEstatTasca(id: string, estat: string): Promise<Tasca> {
  const { data } = await api.patch(`/tasques/${id}/estat`, { estat });
  return data;
}
