import { api } from './api';

export type TipusCamp = 'text' | 'numero' | 'seleccio';

export interface CampFormulari {
  nom: string;
  tipus: TipusCamp;
  opcions?: string[];
}

export interface Formulari {
  id: string;
  nom: string;
  camps: CampFormulari[];
  creatEl: string;
}

export interface RespostaFormulari {
  id: string;
  formulariId: string;
  usuariId: string;
  usuari: { id: string; nom: string };
  valors: Record<string, string>;
  dataEl: string;
}

export async function llistarFormularis(): Promise<Formulari[]> {
  const { data } = await api.get('/formularis');
  return data;
}

export async function crearFormulari(nom: string, camps: CampFormulari[]): Promise<Formulari> {
  const { data } = await api.post('/formularis', { nom, camps });
  return data;
}

export async function enviarResposta(formulariId: string, valors: Record<string, string>): Promise<RespostaFormulari> {
  const { data } = await api.post(`/formularis/${formulariId}/respostes`, { valors });
  return data;
}

export async function llistarRespostes(formulariId: string): Promise<RespostaFormulari[]> {
  const { data } = await api.get(`/formularis/${formulariId}/respostes`);
  return data;
}
