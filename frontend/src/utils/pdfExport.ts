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
