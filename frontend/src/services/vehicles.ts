import { api } from './api';

export interface Vehicle {
  id: string;
  matricula: string;
  marca: string | null;
  model: string | null;
  propietat: 'PROPI' | 'RENTING';
  empresaRenting: string | null;
  proximaItv: string | null;
  proximaRevisio: string | null;
  notes: string | null;
  creatEl: string;
}

export async function llistarVehicles(): Promise<Vehicle[]> {
  const { data } = await api.get('/vehicles');
  return data;
}

export async function crearVehicle(dades: {
  matricula: string;
  marca?: string;
  model?: string;
  propietat: 'PROPI' | 'RENTING';
  empresaRenting?: string;
  proximaItv?: string;
  proximaRevisio?: string;
  notes?: string;
}): Promise<Vehicle> {
  const { data } = await api.post('/vehicles', dades);
  return data;
}

export async function editarVehicle(
  id: string,
  dades: Partial<{
    matricula: string;
    marca: string;
    model: string;
    propietat: 'PROPI' | 'RENTING';
    empresaRenting: string;
    proximaItv: string;
    proximaRevisio: string;
    notes: string;
  }>
): Promise<Vehicle> {
  const { data } = await api.patch(`/vehicles/${id}`, dades);
  return data;
}

export async function eliminarVehicle(id: string) {
  await api.delete(`/vehicles/${id}`);
}
