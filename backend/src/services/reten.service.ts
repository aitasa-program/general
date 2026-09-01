import { prisma } from '../prisma';
import { inicioSetmana } from './setmana.util';

export { inicioSetmana as inicioSetmanaReten };

export async function usuariIdDelRetenActual(): Promise<string | null> {
  const inici = inicioSetmana(new Date());
  const reten = await prisma.reten.findUnique({ where: { setmanaInici: inici } });
  return reten?.usuariId || null;
}

export async function esUsuariElRetenActual(usuariId: string): Promise<boolean> {
  const retenId = await usuariIdDelRetenActual();
  return retenId === usuariId;
}
