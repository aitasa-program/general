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
  assignatAQuinzena: boolean;
  assignatAQuinzenaB: boolean;
  retenResolt: { id: string; nom: string } | null;
  quinzenaResolt: { id: string; nom: string } | null;
  quinzenaBResolt: { id: string; nom: string } | null;
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
  assignatAQuinzena?: boolean;
  assignatAQuinzenaB?: boolean;
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

export async function editarTasca(
  id: string,
  dades: Partial<{
    titol: string;
    descripcio: string;
    assignatsAIds: string[];
    assignatAlReten: boolean;
    assignatAQuinzena: boolean;
    assignatAQuinzenaB: boolean;
    dataLimit: string;
    prioritat: 'BAIXA' | 'MITJANA' | 'ALTA';
    repeticio: 'UNIC' | 'DIARIA' | 'SETMANAL';
  }>
): Promise<Tasca> {
  const { data } = await api.patch(`/tasques/${id}`, dades);
  return data;
}

export async function eliminarTasca(id: string) {
  await api.delete(`/tasques/${id}`);
}
