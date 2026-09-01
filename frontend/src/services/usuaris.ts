import { api } from './api';

export interface Usuari {
  id: string;
  nom: string;
  usuari: string;
  rol: 'TREBALLADOR' | 'ENCARREGAT';
  actiu: boolean;
}

export async function llistarUsuaris(): Promise<Usuari[]> {
  const { data } = await api.get('/usuaris');
  return data;
}

export async function crearUsuari(dades: {
  nom: string;
  usuari: string;
  contrasenya: string;
  rol: 'TREBALLADOR' | 'ENCARREGAT';
}): Promise<Usuari> {
  const { data } = await api.post('/usuaris', dades);
  return data;
}

export async function editarUsuari(
  id: string,
  dades: { nom?: string; usuari?: string; rol?: string }
): Promise<Usuari> {
  const { data } = await api.patch(`/usuaris/${id}`, dades);
  return data;
}

export async function canviarEstatActiu(id: string, actiu: boolean): Promise<Usuari> {
  const { data } = await api.patch(`/usuaris/${id}/actiu`, { actiu });
  return data;
}

export async function restablirContrasenya(id: string, novaContrasenya: string): Promise<void> {
  await api.patch(`/usuaris/${id}/contrasenya`, { novaContrasenya });
}

export async function eliminarUsuari(id: string): Promise<void> {
  await api.delete(`/usuaris/${id}`);
}
