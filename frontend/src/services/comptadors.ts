import { api } from './api';

export type TipusAigua = 'XARXA_INDUSTRIAL' | 'XARXA_REGENERADA' | 'XARXA_CLORADA' | 'TRACTAMENT_CONJUNT';

export const TIPUS_AIGUA: { value: TipusAigua; label: string }[] = [
  { value: 'XARXA_INDUSTRIAL', label: 'Xarxa industrial' },
  { value: 'XARXA_REGENERADA', label: 'Xarxa regenerada' },
  { value: 'XARXA_CLORADA', label: 'Xarxa clorada' },
  { value: 'TRACTAMENT_CONJUNT', label: 'Tractament conjunt' },
];

export interface ZonaComptador {
  id: string;
  nom: string;
}

export interface Comptador {
  id: string;
  nom: string;
  zonaId: string;
  zona: ZonaComptador;
  tipusAigua: TipusAigua | null;
}

export async function llistarZones(): Promise<ZonaComptador[]> {
  const { data } = await api.get('/comptadors/zones');
  return data;
}

export async function crearZona(nom: string): Promise<ZonaComptador> {
  const { data } = await api.post('/comptadors/zones', { nom });
  return data;
}

export async function llistarComptadors(): Promise<Comptador[]> {
  const { data } = await api.get('/comptadors');
  return data;
}

export async function crearComptador(nom: string, zonaId: string, tipusAigua?: TipusAigua): Promise<Comptador> {
  const { data } = await api.post('/comptadors', { nom, zonaId, tipusAigua });
  return data;
}

export async function actualitzarTipusComptador(id: string, tipusAigua: TipusAigua | null): Promise<Comptador> {
  const { data } = await api.patch(`/comptadors/${id}`, { tipusAigua });
  return data;
}

export async function sincronitzarChecklistComptadors(): Promise<{ missatge: string; totals: Record<string, number> }> {
  const { data } = await api.post('/checklists/comptadors/sincronitzar');
  return data;
}

export async function eliminarComptador(id: string) {
  await api.delete(`/comptadors/${id}`);
}
