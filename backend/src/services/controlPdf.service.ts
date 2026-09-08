import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CampControl } from './control.validation';

export function generarControlPdf(r: {
  id: string; nom: string; versio: number; dia: string; creatEl: Date;
  autorNom: string; camps: CampControl[]; valors: Record<string, string>;
  rectificaId?: string; motiu?: string;
}): Buffer {
  const pdf = new jsPDF();
  pdf.setCreationDate(r.creatEl);
  pdf.setProperties({ title: r.nom, author: r.autorNom, subject: 'AITASA · Registre de control' });
  pdf.setTextColor(16, 37, 68);
  pdf.setFontSize(20);
  pdf.text('AITASA', 14, 18);
  pdf.setFontSize(12);
  pdf.text('Registre de control', 14, 27);
  const data = r.dia.split('-').reverse().join('/');
  const desat = r.creatEl.toLocaleString('ca-ES', { timeZone: 'Europe/Madrid', hour12: false });
  autoTable(pdf, {
    startY: 34, margin: { bottom: 23 }, theme: 'grid',
    head: [['Dades del registre', '']],
    body: [
      ['Formulari', `${r.nom} (versió ${r.versio})`], ['Dia del control', data],
      ['Registrat per', r.autorNom], ['Desat el (Europe/Madrid)', desat], ['Identificador', r.id],
      ...(r.rectificaId ? [['Rectifica el registre', r.rectificaId], ['Motiu de la rectificació', r.motiu || '']] : []),
    ], styles: { fontSize: 9, overflow: 'linebreak' }, headStyles: { fillColor: [0, 102, 214] }, columnStyles: { 0: { cellWidth: 55 } },
  });
  const end = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(pdf, {
    startY: end + 9, margin: { bottom: 23 }, theme: 'grid',
    head: [['Control', 'Valor registrat']], body: r.camps.map(c => [c.nom, r.valors[c.nom] || '—']),
    styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 102, 214] }, columnStyles: { 0: { cellWidth: 60 } },
  });
  for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
    pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(82, 103, 131);
    pdf.text(`AITASA · ${r.id}`, 14, 281);
    pdf.text(`Pàgina ${i} de ${pdf.getNumberOfPages()}`, 195, 287, { align: 'right' });
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
