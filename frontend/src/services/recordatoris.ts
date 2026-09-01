import { api } from './api';

export interface Recordatori {
  id: string;
  text: string;
  dataHora: string;
  repeticio: 'UNIC' | 'DIARI' | 'SETMANAL';
}

export async function llistarRecordatoris(): Promise<Recordatori[]> {
  const { data } = await api.get('/recordatoris');
  return data;
}

export async function crearRecordatori(dades: {
  text: string;
  dataHora: string;
  repeticio: 'UNIC' | 'DIARI' | 'SETMANAL';
}): Promise<Recordatori> {
  const { data } = await api.post('/recordatoris', dades);
  return data;
}

export async function eliminarRecordatori(id: string): Promise<void> {
  await api.delete(`/recordatoris/${id}`);
}
