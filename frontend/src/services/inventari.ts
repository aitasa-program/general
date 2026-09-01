import { api } from './api';

export interface Producte {
  id: string;
  nom: string;
  codi: string;
  tipus: string | null;
  quantitat: number;
  ubicacio: string | null;
  estanteria: number | null;
  stockMinim: number;
}

export interface MovimentInventari {
  id: string;
  producteId: string;
  producte: Producte;
  tipus: 'ENTRADA' | 'SORTIDA';
  quantitat: number;
  usuariRegistraId: string;
  usuariRegistra: { id: string; nom: string };
  estat: 'PENDENT' | 'CONFIRMAT' | 'REBUTJAT';
  dataRegistre: string;
}

export async function llistarProductes(): Promise<Producte[]> {
  const { data } = await api.get('/inventari/productes');
  return data;
}

export async function crearProducte(dades: {
  nom: string;
  tipus: string;
  quantitat: number;
  ubicacio: string;
  estanteria: number | '';
  stockMinim: number;
}): Promise<Producte> {
  const { data } = await api.post('/inventari/productes', dades);
  return data;
}

export async function registrarMoviment(dades: {
  producteId: string;
  tipus: 'ENTRADA' | 'SORTIDA';
  quantitat: number;
}) {
  const { data } = await api.post('/inventari/moviments', dades);
  return data;
}

export async function llistarMovimentsPendents(): Promise<MovimentInventari[]> {
  const { data } = await api.get('/inventari/moviments/pendents');
  return data;
}

export async function confirmarMoviment(id: string, aprovat: boolean) {
  const { data } = await api.patch(`/inventari/moviments/${id}/confirmar`, { aprovat });
  return data;
}
