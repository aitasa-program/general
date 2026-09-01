import { prisma } from '../prisma';
import { inicioSetmana } from './setmana.util';

export { inicioSetmana as inicioSetmanaQuinzena };

export async function usuariIdDeLaQuinzenaActual(): Promise<string | null> {
  const inici = inicioSetmana(new Date());
  const quinzena = await prisma.quinzena.findUnique({ where: { setmanaInici: inici } });
  return quinzena?.usuariId || null;
}

export async function esUsuariLaQuinzenaActual(usuariId: string): Promise<boolean> {
  const quinzenaId = await usuariIdDeLaQuinzenaActual();
  return quinzenaId === usuariId;
}
