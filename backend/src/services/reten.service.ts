import { prisma } from '../prisma';

// El reté canvia cada dilluns a les 8:00. Donada una data, retorna el dilluns
// a les 8:00 que marca l'inici de la setmana de reté a la qual pertany.
export function inicioSetmanaReten(data: Date): Date {
  const d = new Date(data);
  const diaSetmana = d.getDay(); // 0=diumenge, 1=dilluns, ..., 6=dissabte
  const diesDesDeDilluns = (diaSetmana + 6) % 7;
  const dilluns = new Date(d);
  dilluns.setHours(0, 0, 0, 0);
  dilluns.setDate(d.getDate() - diesDesDeDilluns);
  dilluns.setHours(8, 0, 0, 0);
  if (dilluns.getTime() > d.getTime()) {
    dilluns.setDate(dilluns.getDate() - 7);
  }
  return dilluns;
}

export async function usuariIdDelRetenActual(): Promise<string | null> {
  const inici = inicioSetmanaReten(new Date());
  const reten = await prisma.reten.findUnique({ where: { setmanaInici: inici } });
  return reten?.usuariId || null;
}

export async function esUsuariElRetenActual(usuariId: string): Promise<boolean> {
  const retenId = await usuariIdDelRetenActual();
  return retenId === usuariId;
}
