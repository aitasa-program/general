import { api } from './api';

export interface ZonaComptador {
  id: string;
  nom: string;
}

export interface Comptador {
  id: string;
  nom: string;
  zonaId: string;
  zona: ZonaComptador;
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

export async function crearComptador(nom: string, zonaId: string): Promise<Comptador> {
  const { data } = await api.post('/comptadors', { nom, zonaId });
  return data;
}

export async function eliminarComptador(id: string) {
  await api.delete(`/comptadors/${id}`);
}
