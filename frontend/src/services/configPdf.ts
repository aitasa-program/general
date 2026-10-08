import { api } from './api';

export interface ConfigPdf {
  colorPrimari: string;
  peuText: string;
  teLogo: boolean;
}

export async function obtenirConfigPdf(): Promise<ConfigPdf> {
  const { data } = await api.get('/config-pdf');
  return data;
}

export async function desarConfigPdf(dades: {
  colorPrimari?: string;
  peuText?: string;
  logoBase64?: string;
  logoNomFitxer?: string;
  treureLogo?: boolean;
}): Promise<ConfigPdf> {
  const { data } = await api.patch('/config-pdf', dades);
  return data;
}

export async function obtenirLogoPdfUrl(): Promise<string | null> {
  try {
    const { data } = await api.get('/config-pdf/logo', { responseType: 'blob' });
    return URL.createObjectURL(data);
  } catch {
    return null;
  }
}
