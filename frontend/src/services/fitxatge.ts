import { api } from './api';

export interface LlocTreball {
  id: string;
  nom: string;
}

export interface FranjaHoraria {
  id: string;
  nom: string;
  hores: number;
}

export interface CampFitxatge {
  id: string;
  nom: string;
  tipus: 'text' | 'numero' | 'seleccio' | 'data' | 'hora';
  opcions?: string[];
  ordre: number;
  activa: boolean;
}

export interface Fitxatge {
  id: string;
  usuariId: string;
  usuari: { id: string; nom: string };
  data: string;
  llocTreballId: string;
  llocTreball: LlocTreball;
  franjaHorariaId: string | null;
  franjaHoraria: FranjaHoraria | null;
  hores: number | null;
  descripcio: string;
  camps: Record<string, string> | null;
  creatEl: string;
}

export async function llistarLlocsTreball(): Promise<LlocTreball[]> {
  const { data } = await api.get('/fitxatge/llocs');
  return data;
}

export async function crearLlocTreball(nom: string): Promise<LlocTreball> {
  const { data } = await api.post('/fitxatge/llocs', { nom });
  return data;
}

export async function editarLlocTreball(id: string, nom: string): Promise<LlocTreball> {
  const { data } = await api.patch(`/fitxatge/llocs/${id}`, { nom });
  return data;
}

export async function eliminarLlocTreball(id: string) {
  await api.delete(`/fitxatge/llocs/${id}`);
}

export async function llistarFranges(): Promise<FranjaHoraria[]> {
  const { data } = await api.get('/fitxatge/franges');
  return data;
}

export async function crearFranja(nom: string, hores: number): Promise<FranjaHoraria> {
  const { data } = await api.post('/fitxatge/franges', { nom, hores });
  return data;
}

export async function editarFranja(id: string, nom: string, hores: number): Promise<FranjaHoraria> {
  const { data } = await api.patch(`/fitxatge/franges/${id}`, { nom, hores });
  return data;
}

export async function eliminarFranja(id: string) {
  await api.delete(`/fitxatge/franges/${id}`);
}

export async function llistarFitxatges(): Promise<Fitxatge[]> {
  const { data } = await api.get('/fitxatge');
  return data;
}

export async function crearFitxatge(dades: {
  data: string;
  llocTreballId: string;
  franjaHorariaId?: string;
  descripcio: string;
  camps?: Record<string, string>;
}): Promise<Fitxatge> {
  const { data } = await api.post('/fitxatge', dades);
  return data;
}

export async function editarFitxatge(
  id: string,
  dades: Partial<{ data: string; llocTreballId: string; franjaHorariaId: string | null; descripcio: string; camps: Record<string, string> }>
): Promise<Fitxatge> {
  const { data } = await api.patch(`/fitxatge/${id}`, dades);
  return data;
}

export async function eliminarFitxatge(id: string) {
  await api.delete(`/fitxatge/${id}`);
}

export async function llistarCampsFitxatge(): Promise<CampFitxatge[]> {
  const { data } = await api.get('/fitxatge/camps');
  return data;
}

export async function crearCampFitxatge(dades: { nom: string; tipus: CampFitxatge['tipus']; opcions?: string[] }): Promise<CampFitxatge> {
  const { data } = await api.post('/fitxatge/camps', dades);
  return data;
}

export async function editarCampFitxatge(
  id: string,
  dades: Partial<{ nom: string; tipus: CampFitxatge['tipus']; opcions: string[]; activa: boolean }>
): Promise<CampFitxatge> {
  const { data } = await api.patch(`/fitxatge/camps/${id}`, dades);
  return data;
}

export async function eliminarCampFitxatge(id: string) {
  await api.delete(`/fitxatge/camps/${id}`);
}
