import { api } from './api';

export interface RegistreManteniment {
  id: string;
  usuariId: string;
  usuari: { id: string; nom: string };
  notes: string;
  dataFet: string;
}

export interface EquipManteniment {
  id: string;
  ordre: number;
  reg: string;
  zona: string;
  part: string;
  intern: boolean;
  extern: boolean;
  periodicitatText: string;
  periodicitatDies: number | null;
  mesExecucio: number | null;
  properaData: string | null;
  notes: string;
  actiu: boolean;
  ultimFet: RegistreManteniment | null;
}

export async function llistarManteniment(): Promise<EquipManteniment[]> {
  const { data } = await api.get('/manteniment');
  return data;
}

export async function crearEquipManteniment(dades: {
  zona: string; part: string; reg?: string; intern?: boolean; extern?: boolean;
  periodicitatText: string; periodicitatDies?: number | null; mesExecucio?: number | null;
  properaData?: string | null; notes?: string;
}): Promise<EquipManteniment> {
  const { data } = await api.post('/manteniment', dades);
  return data;
}

export async function editarEquipManteniment(id: string, dades: Partial<{
  zona: string; part: string; reg: string; intern: boolean; extern: boolean;
  periodicitatText: string; periodicitatDies: number | null; mesExecucio: number | null;
  properaData: string | null; notes: string; actiu: boolean;
}>): Promise<EquipManteniment> {
  const { data } = await api.patch(`/manteniment/${id}`, dades);
  return data;
}

export async function eliminarEquipManteniment(id: string) {
  await api.delete(`/manteniment/${id}`);
}

export async function marcarFetManteniment(id: string, notes?: string): Promise<{ registre: RegistreManteniment; properaData: string | null }> {
  const { data } = await api.post(`/manteniment/${id}/fet`, { notes: notes || '' });
  return data;
}

export type EstatManteniment = 'sense' | 'vençut' | 'aviat' | 'aldia';
export function estatManteniment(e: EquipManteniment): EstatManteniment {
  if (!e.properaData) return 'sense';
  const avui = new Date(); avui.setHours(0, 0, 0, 0);
  const dies = Math.floor((new Date(e.properaData).getTime() - avui.getTime()) / (1000 * 60 * 60 * 24));
  if (dies < 0) return 'vençut';
  if (dies <= 15) return 'aviat';
  return 'aldia';
}
