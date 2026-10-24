import { prisma } from '../prisma';
import { inicioSetmana } from './setmana.util';

// Aquests grups no s'assignen automàticament a qui estigui de retén: els gestionen els
// encarregats directament (assignació manual des de l'editor de la mostra).
export const SENSE_RETEN_AUTOMATIC = new Set(['EPN', 'EPS']);

export async function ambResponsable<T extends { grup: string; data: string; usuariAssignat: { id: string; nom: string } | null }>(mostres: T[]) {
  const retens = await prisma.reten.findMany({ select: { setmanaInici: true, usuari: { select: { id: true, nom: true } } } });
  const perSetmana = new Map(retens.map(r => [r.setmanaInici.toISOString().slice(0, 10), r.usuari]));
  return mostres.map(m => {
    let responsable = m.usuariAssignat;
    if (!responsable && !SENSE_RETEN_AUTOMATIC.has(m.grup)) {
      const setmana = inicioSetmana(new Date(m.data + 'T12:00:00Z')).toISOString().slice(0, 10);
      responsable = perSetmana.get(setmana) || null;
    }
    return { ...m, responsable };
  });
}
