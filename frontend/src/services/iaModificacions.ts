import { api } from './api';

export interface FitxerProposat {
  path: string;
  contingut: string;
}

export interface AdjuntIA {
  nom: string;
  mime: string;
}

export interface PropostaIA {
  id: string;
  prompt: string;
  adjunts: AdjuntIA[];
  resum: string;
  missatgeCommit: string;
  fitxers: FitxerProposat[];
  estat: 'PENDENT' | 'APLICADA' | 'REBUTJADA' | 'ERROR';
  error: string | null;
  commitSha: string | null;
  creatPer: { id: string; nom: string };
  aplicatPer: { id: string; nom: string } | null;
  creatEl: string;
  resoltEl: string | null;
}

export interface EstatIA {
  iaConfigurada: boolean;
  repoConfigurat: boolean;
  branca: string;
}

export async function obtenirEstatIA(): Promise<EstatIA> {
  const { data } = await api.get('/ia-modificacions/estat');
  return data;
}

export async function llistarPropostesIA(): Promise<PropostaIA[]> {
  const { data } = await api.get('/ia-modificacions');
  return data;
}

export async function demanarCanviIA(prompt: string, adjunts: { nom: string; base64: string }[]): Promise<PropostaIA> {
  const { data } = await api.post('/ia-modificacions', { prompt, adjunts });
  return data;
}

export async function aplicarPropostaIA(id: string): Promise<PropostaIA> {
  const { data } = await api.post(`/ia-modificacions/${id}/aplicar`);
  return data;
}

export async function rebutjarPropostaIA(id: string): Promise<PropostaIA> {
  const { data } = await api.post(`/ia-modificacions/${id}/rebutjar`);
  return data;
}

export function errorIA(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error || "No s'ha pogut completar l'operació. Torna-ho a provar.";
}
