import { prisma } from '../prisma';
import { inicioSetmana } from './setmana.util';

export { inicioSetmana as inicioSetmanaQuinzenaB };

export async function usuariIdDeLaQuinzenaBActual(): Promise<string | null> {
  const inici = inicioSetmana(new Date());
  const quinzenaB = await prisma.quinzenaB.findUnique({ where: { setmanaInici: inici } });
  return quinzenaB?.usuariId || null;
}

export async function esUsuariLaQuinzenaBActual(usuariId: string): Promise<boolean> {
  const quinzenaBId = await usuariIdDeLaQuinzenaBActual();
  return quinzenaBId === usuariId;
}
