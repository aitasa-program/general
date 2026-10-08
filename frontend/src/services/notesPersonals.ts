import { api } from './api';

export interface NotaPersonal {
  id: string;
  text: string;
  teFoto: boolean;
  creatEl: string;
  actualitzatEl: string;
}

export async function llistarNotesPersonals(): Promise<NotaPersonal[]> {
  const { data } = await api.get('/notes-personals');
  return data;
}

export async function crearNotaPersonal(dades: { text: string; fotoBase64?: string; fotoNomFitxer?: string }): Promise<NotaPersonal> {
  const { data } = await api.post('/notes-personals', dades);
  return data;
}

export async function editarNotaPersonal(
  id: string,
  dades: Partial<{ text: string; fotoBase64: string; fotoNomFitxer: string; treureFoto: boolean }>
): Promise<NotaPersonal> {
  const { data } = await api.patch(`/notes-personals/${id}`, dades);
  return data;
}

export async function eliminarNotaPersonal(id: string) {
  await api.delete(`/notes-personals/${id}`);
}

export async function obtenirFotoNotaUrl(id: string): Promise<string | null> {
  try {
    const { data } = await api.get(`/notes-personals/${id}/foto`, { responseType: 'blob' });
    return URL.createObjectURL(data);
  } catch {
    return null;
  }
}

export function errorNotes(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "No s'ha pogut completar l'operació.";
}
