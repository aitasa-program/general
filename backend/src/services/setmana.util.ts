// El reté i la quinzena canvien cada dilluns a les 8:00. Donada una data,
// retorna el dilluns a les 8:00 que marca l'inici de la setmana a la qual pertany.
export function inicioSetmana(data: Date): Date {
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
