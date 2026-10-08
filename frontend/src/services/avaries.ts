import { api } from './api';

export interface Avaria {
  id: string;
  problema: string;
  solucio: string | null;
  teFoto: boolean;
  usuariNom: string;
  creatEl: string;
}

export interface EstatIaAvaries {
  iaConfigurada: boolean;
}

export async function obtenirEstatAvaries(): Promise<EstatIaAvaries> {
  const { data } = await api.get('/avaries/estat');
  return data;
}

export async function llistarAvaries(): Promise<Avaria[]> {
  const { data } = await api.get('/avaries');
  return data;
}

export async function crearAvaria(dades: { problema: string; solucio?: string; fotoBase64?: string; fotoNomFitxer?: string }): Promise<Avaria> {
  const { data } = await api.post('/avaries', dades);
  return data;
}

export async function afegirSolucioAvaria(id: string, solucio: string): Promise<Avaria> {
  const { data } = await api.patch(`/avaries/${id}`, { solucio });
  return data;
}

export async function obtenirFotoAvariaUrl(id: string): Promise<string | null> {
  try {
    const { data } = await api.get(`/avaries/${id}/foto`, { responseType: 'blob' });
    return URL.createObjectURL(data);
  } catch {
    return null;
  }
}

export async function demanarDiagnostic(dades: { descripcio: string; fotoBase64: string; fotoNomFitxer: string }): Promise<{ suggeriment: string; casosConsultats: number }> {
  const { data } = await api.post('/avaries/diagnosticar', dades);
  return data;
}

export function errorAvaries(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "No s'ha pogut completar l'operació.";
}
