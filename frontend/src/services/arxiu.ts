import { api } from './api';

export interface CampControl {
  nom: string; tipus: 'text' | 'numero' | 'seleccio' | 'data' | 'multilinia'; obligatori: boolean; nomesEncarregat: boolean; opcions?: string[];
}
// Personalització del PDF pròpia d'aquest formulari (logo, color, peu de pàgina i informació
// addicional com números de sèrie). Si es deixa en blanc, es fa servir el valor per defecte.
export interface PdfPersonalitzatInput {
  pdfLogoBase64?: string; pdfLogoNomFitxer?: string; pdfTreureLogo?: boolean;
  pdfColorPrimari?: string; pdfPeuText?: string; pdfInfoAddicional?: string;
}
export interface PdfPersonalitzatPublic {
  tePdfLogo: boolean; pdfColorPrimari: string; pdfPeuText: string; pdfInfoAddicional: string;
}
export interface PlantillaControl extends PdfPersonalitzatPublic { id: string; nom: string; camps: CampControl[]; versio: number; activa: boolean }
export interface RegistreControl {
  id: string; plantillaId: string; nom: string; versio: number; dia: string;
  autorId: string | null; autorNom: string; creatEl: string; sha256: string;
  rectificaId: string | null; rectificacio: { id: string } | null; motiu: string | null;
  camps: CampControl[]; valors: Record<string, string>;
}
export interface Pagina<T> { items: T[]; total: number; pagina: number }
export interface Carpeta { id: string; nom: string; _count: { documents: number } }
export interface DocumentArxiu { id: string; nom: string; nomFitxer: string; mida: number; sha256: string; autorNom: string; creatEl: string }
export const plantillesControl = async (): Promise<PlantillaControl[]> => (await api.get('/controls/plantilles')).data;
export const crearPlantilla = async (data: { nom: string; camps: CampControl[] } & PdfPersonalitzatInput) => (await api.post('/controls/plantilles', data)).data;
export const editarPlantilla = async (id: string, data: { nom: string; camps: CampControl[]; activa: boolean; versio: number } & PdfPersonalitzatInput) => (await api.patch(`/controls/plantilles/${id}`, data)).data;
export const registresControl = async (params: Record<string, string | number>): Promise<Pagina<RegistreControl>> => (await api.get('/controls/registres', { params })).data;
export const obtenirControl = async (id: string): Promise<RegistreControl> => (await api.get(`/controls/registres/${id}`)).data;
export const desarControl = async (data: { id: string; plantillaId: string; versio: number; dia: string; valors: Record<string, string>; rectificaId?: string; motiu?: string }): Promise<RegistreControl> => (await api.post('/controls/registres', data)).data;
export const carpetes = async (): Promise<Carpeta[]> => (await api.get('/documentacio/carpetes')).data;
export const crearCarpeta = async (nom: string) => (await api.post('/documentacio/carpetes', { nom })).data;
export const documents = async (carpetaId: string, pagina: number): Promise<Pagina<DocumentArxiu>> => (await api.get('/documentacio/documents', { params: { carpetaId, pagina } })).data;
export const pujarDocument = async (data: { id: string; carpetaId: string; nom: string; nomFitxer: string; base64: string }) => (await api.post('/documentacio/documents', data)).data;
export function errorArxiu(e: unknown) {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'No s’ha pogut completar l’operació. Torna-ho a provar.';
}
export async function descarregarArxiu(url: string, nom: string) {
  const { data } = await api.get(url, { responseType: 'blob' });
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(data);
  link.href = objectUrl; link.download = nom;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
}
export function diaLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
