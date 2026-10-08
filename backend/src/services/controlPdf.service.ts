import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { prisma } from '../prisma';
import { CampControl } from './control.validation';

function hexARgb(hex: string): [number, number, number] {
  const net = hex.replace('#', '');
  const n = parseInt(net.length === 3 ? net.split('').map(c => c + c).join('') : net, 16);
  if (Number.isNaN(n)) return [0, 102, 214];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function generarControlPdf(r: {
  id: string; nom: string; versio: number; dia: string; creatEl: Date;
  autorNom: string; camps: CampControl[]; valors: Record<string, string>;
  rectificaId?: string; motiu?: string;
  pdfLogoDades?: Buffer | Uint8Array | null; pdfLogoMime?: string | null;
  pdfColorPrimari?: string | null; pdfPeuText?: string | null; pdfInfoAddicional?: string | null;
}): Promise<Buffer> {
  // Cada formulari pot tenir el seu propi logo/color/peu de pàgina; si no en té, es fa
  // servir el de "ConfigPdf" (compartit per defecte).
  const config = await prisma.configPdf.findUnique({ where: { id: 'default' } });
  const logoDades = r.pdfLogoDades || config?.logoDades;
  const logoMime = r.pdfLogoDades ? r.pdfLogoMime : config?.logoMime;
  const colorPrimari = r.pdfColorPrimari || config?.colorPrimari || '#0066D6';
  const peuText = r.pdfPeuText ?? config?.peuText;
  const color = hexARgb(colorPrimari);
  const pdf = new jsPDF();
  pdf.setCreationDate(r.creatEl);
  pdf.setProperties({ title: r.nom, author: r.autorNom, subject: 'AITASA · Registre de control' });
  let startY = 34;
  if (logoDades) {
    try {
      const format = (logoMime || '').includes('png') ? 'PNG' : 'JPEG';
      pdf.addImage(Buffer.from(logoDades).toString('base64'), format, 14, 10, 40, 14);
      startY = 32;
    } catch { /* logo no vàlid, s'ignora */ }
  } else {
    pdf.setTextColor(...color);
    pdf.setFontSize(20);
    pdf.text('AITASA', 14, 18);
  }
  pdf.setTextColor(...color);
  pdf.setFontSize(12);
  pdf.text('Registre de control', 14, 27);
  const data = r.dia.split('-').reverse().join('/');
  const desat = r.creatEl.toLocaleString('ca-ES', { timeZone: 'Europe/Madrid', hour12: false });
  autoTable(pdf, {
    startY, margin: { bottom: 23 }, theme: 'grid',
    head: [['Dades del registre', '']],
    body: [
      ['Formulari', `${r.nom} (versió ${r.versio})`], ['Dia del control', data],
      ['Registrat per', r.autorNom], ['Desat el (Europe/Madrid)', desat], ['Identificador', r.id],
      ...(r.pdfInfoAddicional ? [['Informació addicional', r.pdfInfoAddicional]] : []),
      ...(r.rectificaId ? [['Rectifica el registre', r.rectificaId], ['Motiu de la rectificació', r.motiu || '']] : []),
    ], styles: { fontSize: 9, overflow: 'linebreak' }, headStyles: { fillColor: color }, columnStyles: { 0: { cellWidth: 55 } },
  });
  const end = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(pdf, {
    startY: end + 9, margin: { bottom: 23 }, theme: 'grid',
    head: [['Control', 'Valor registrat']], body: r.camps.map(c => [c.nom, r.valors[c.nom] || '—']),
    styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: color }, columnStyles: { 0: { cellWidth: 60 } },
  });
  for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
    pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(82, 103, 131);
    pdf.text(`AITASA · ${r.id}`, 14, 281);
    pdf.text(`Pàgina ${i} de ${pdf.getNumberOfPages()}`, 195, 287, { align: 'right' });
    if (peuText) pdf.text(peuText, 105, 287, { align: 'center' });
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
