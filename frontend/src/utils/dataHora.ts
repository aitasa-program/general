// Combina una data (YYYY-MM-DD) i una hora opcional (HH:MM) en un ISO string.
// Si no s'indica hora, es fa servir el migdia com a marcador neutre (sense hora concreta).
export function combinarDataHora(data: string, hora: string): string {
  return new Date(`${data}T${hora || '12:00'}:00`).toISOString();
}

export function aDataInput(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function aHoraInput(iso: string): string {
  const d = new Date(iso);
  if (d.getHours() === 12 && d.getMinutes() === 0) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Sufix " HH:MM" per mostrar al costat d'una data, només si s'ha indicat una hora concreta
// (el migdia es considera "sense hora" perquè és el valor per defecte quan no se n'indica cap).
export function sufixHora(iso: string): string {
  const d = new Date(iso);
  if (d.getHours() === 12 && d.getMinutes() === 0) return '';
  return ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
