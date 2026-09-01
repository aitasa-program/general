import { api } from './api';

export interface ChecklistItem {
  id: string;
  text: string;
  marcat: boolean;
  ordre: number;
}

export interface Checklist {
  id: string;
  nom: string;
  frequencia: 'DIARIA' | 'SETMANAL' | 'PUNTUAL';
  data: string;
  assignatAId: string;
  assignatA: { id: string; nom: string };
  items: ChecklistItem[];
}

export async function llistarChecklists(): Promise<Checklist[]> {
  const { data } = await api.get('/checklists');
  return data;
}

export async function crearChecklist(dades: {
  nom: string;
  assignatAId: string;
  frequencia: 'DIARIA' | 'SETMANAL' | 'PUNTUAL';
  items: string[];
}): Promise<Checklist> {
  const { data } = await api.post('/checklists', dades);
  return data;
}

export async function marcarItem(itemId: string, marcat: boolean): Promise<ChecklistItem> {
  const { data } = await api.patch(`/checklists/items/${itemId}`, { marcat });
  return data;
}
