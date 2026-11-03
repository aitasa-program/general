import { api } from './api';

export interface ZonaComptador {
  id: string;
  nom: string;
}

export interface Comptador {
  id: string;
  nom: string;
  tipusAigua: string;
  zonaId: string;
  zona: ZonaComptador;
  llegit: boolean;
  llegitEl: string | null;
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

export async function crearComptador(nom: string, zonaId: string, tipusAigua: string): Promise<Comptador> {
  const { data } = await api.post('/comptadors', { nom, zonaId, tipusAigua });
  return data;
}

export async function editarComptador(id: string, nom: string, zonaId: string, tipusAigua: string): Promise<Comptador> {
  const { data } = await api.patch(`/comptadors/${id}`, { nom, zonaId, tipusAigua });
  return data;
}

export async function marcarLlegitComptador(id: string, llegit: boolean): Promise<Comptador> {
  const { data } = await api.patch(`/comptadors/${id}/estat`, { llegit });
  return data;
}

export async function eliminarComptador(id: string) {
  await api.delete(`/comptadors/${id}`);
}
