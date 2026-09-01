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
  assignatAId: string | null;
  assignatA: { id: string; nom: string } | null;
  assignatAlReten: boolean;
  items: ChecklistItem[];
}

export async function llistarChecklists(): Promise<Checklist[]> {
  const { data } = await api.get('/checklists');
  return data;
}

export async function crearChecklist(dades: {
  nom: string;
  assignatAId?: string;
  assignatAlReten?: boolean;
  frequencia: 'DIARIA' | 'SETMANAL' | 'PUNTUAL';
  items: string[];
  data?: string;
}): Promise<Checklist> {
  const { data } = await api.post('/checklists', dades);
  return data;
}

export async function editarChecklist(
  id: string,
  dades: Partial<{
    nom: string;
    assignatAId: string | null;
    assignatAlReten: boolean;
    frequencia: 'DIARIA' | 'SETMANAL' | 'PUNTUAL';
    data: string;
  }>
): Promise<Checklist> {
  const { data } = await api.patch(`/checklists/${id}`, dades);
  return data;
}

export async function eliminarChecklist(id: string) {
  await api.delete(`/checklists/${id}`);
}

export async function marcarItem(itemId: string, marcat: boolean): Promise<ChecklistItem> {
  const { data } = await api.patch(`/checklists/items/${itemId}`, { marcat });
  return data;
}

export async function editarTextItem(itemId: string, text: string): Promise<ChecklistItem> {
  const { data } = await api.patch(`/checklists/items/${itemId}`, { text });
  return data;
}

export async function afegirItem(checklistId: string, text: string): Promise<ChecklistItem> {
  const { data } = await api.post(`/checklists/${checklistId}/items`, { text });
  return data;
}

export async function eliminarItem(itemId: string) {
  await api.delete(`/checklists/items/${itemId}`);
}
