import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportarPdf(
  titol: string,
  columnes: string[],
  files: (string | number)[][],
  nomFitxer: string
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(titol, 14, 15);
  autoTable(doc, {
    head: [columnes],
    body: files,
    startY: 22,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 64, 175] },
  });
  doc.save(nomFitxer);
}

// Un PDF amb una pàgina nova per treballador (ordenats alfabèticament),
// i dins de cada pàgina les files ordenades per data.
export function exportarPdfPerTreballador<T>(
  titol: string,
  columnes: string[],
  items: T[],
  getTreballador: (item: T) => string,
  getData: (item: T) => string,
  getFila: (item: T) => (string | number)[],
  nomFitxer: string
) {
  const doc = new jsPDF();
  const grups = new Map<string, T[]>();
  for (const item of items) {
    const nom = getTreballador(item);
    if (!grups.has(nom)) grups.set(nom, []);
    grups.get(nom)!.push(item);
  }
  const noms = [...grups.keys()].sort((a, b) => a.localeCompare(b));

  noms.forEach((nom, i) => {
    if (i > 0) doc.addPage();
    const files = grups
      .get(nom)!
      .slice()
      .sort((a, b) => new Date(getData(a)).getTime() - new Date(getData(b)).getTime());
    doc.setFontSize(14);
    doc.text(`${titol} — ${nom}`, 14, 15);
    autoTable(doc, {
      head: [columnes],
      body: files.map(getFila),
      startY: 22,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] },
    });
  });

  doc.save(nomFitxer);
}
