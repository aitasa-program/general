import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { readFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '../prisma';
import { DadesSetmanals, ModelSetmanal, diesSetmana } from './setmanals.models';

const logo = readFileSync(join(__dirname, '../../assets/logo.png'));
const dataCurta = (s: string) => s.split('-').reverse().join('/');

function hexARgb(hex: string): [number, number, number] {
  const net = hex.replace('#', '');
  const n = parseInt(net.length === 3 ? net.split('').map(c => c + c).join('') : net, 16);
  if (Number.isNaN(n)) return [0, 102, 214];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function generarSetmanalPdf(model: ModelSetmanal, setmana: string, dades: DadesSetmanals, meta: { id: string; versio: number; creatEl: Date; autorNom: string; motiu?: string }): Promise<Buffer> {
  // Cada control setmanal pot tenir el seu propi logo/color/peu de pàgina; si no en té,
  // es fa servir el de "ConfigPdf" (compartit per defecte).
  const config = await prisma.configPdf.findUnique({ where: { id: 'default' } });
  const logoPropi = model.pdfLogoDades ? { dades: model.pdfLogoDades, mime: model.pdfLogoMime } : null;
  const logoGlobal = config?.logoDades ? { dades: config.logoDades, mime: config.logoMime } : null;
  const colorPrimari = hexARgb(model.pdfColorPrimari || config?.colorPrimari || '#0066D6');
  const peuText = model.pdfPeuText ?? config?.peuText;
  function logoBespoke(): { dades: string; format: string } {
    const triat = logoPropi || logoGlobal;
    if (triat) return { dades: Buffer.from(triat.dades).toString('base64'), format: (triat.mime || '').includes('png') ? 'PNG' : 'JPEG' };
    return { dades: logo.toString('base64'), format: 'PNG' };
  }
  const pdf = new jsPDF();
  pdf.setCreationDate(meta.creatEl);
  pdf.setProperties({ title: `${model.nom} · ${setmana}`, author: meta.autorNom, subject: 'Registre setmanal de control AITASA' });

  // Els 4 formularis originals mantenen l'estructura del full en paper (caixes,
  // codi P-07.12-R02...), però el logo, el color i el peu de pàgina es poden
  // personalitzar des de "Configuració del PDF", igual que els controls nous.
  function capcaleraBespoke() {
    pdf.setDrawColor(...colorPrimari); pdf.setLineWidth(.2); pdf.setTextColor(0);
    pdf.rect(8, 8, 194, 20); pdf.line(63, 8, 63, 28); pdf.line(165, 8, 165, 28); pdf.line(63, 18, 165, 18);
    try { const l = logoBespoke(); pdf.addImage(l.dades, l.format, 12, 11, 46, 15); } catch { /* logo no vàlid, s'ignora */ }
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...colorPrimari);
    pdf.text('REGISTRO', 114, 14, { align: 'center' }); pdf.text('REGISTRO DE DATOS OPERARIOS', 114, 24, { align: 'center' });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(0);
    pdf.text('P-07.12-R02', 167, 13); pdf.line(165, 15, 202, 15);
    pdf.text('Fecha: 26/01/2023', 167, 20); pdf.line(165, 22, 202, 22); pdf.text('Revisión: 10', 167, 26);
    pdf.setFontSize(7); pdf.text(`${model.nom} · Setmana ${dataCurta(setmana)}`, 8, 33);
  }
  function capcaleraGenerica() {
    pdf.setDrawColor(...colorPrimari); pdf.setLineWidth(.4); pdf.line(8, 20, 202, 20);
    const triat = logoPropi || logoGlobal;
    if (triat) {
      try {
        const format = (triat.mime || '').includes('png') ? 'PNG' : 'JPEG';
        pdf.addImage(Buffer.from(triat.dades).toString('base64'), format, 12, 8, 30, 12);
      } catch { /* logo no vàlid, s'ignora */ }
    }
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(...colorPrimari);
    pdf.text(model.titol || model.nom, triat ? 46 : 8, 15);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(0);
    pdf.text(`Setmana ${dataCurta(setmana)}`, 202, 15, { align: 'right' });
  }
  const yInicial = model.bespoke ? 37 : 26;
  let y = yInicial;
  function taula(options: UserOptions) {
    if (y > 260) { pdf.addPage(); y = yInicial; }
    autoTable(pdf, { startY: y, margin: { left: 8, right: 8, top: yInicial, bottom: 20 }, theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.3, lineColor: [55,55,55], lineWidth: .18, textColor: [0,0,0], overflow: 'linebreak', valign: 'middle' },
      headStyles: { fillColor: colorPrimari, textColor: [255,255,255], fontStyle: 'bold', halign: 'center' },
      didDrawPage: model.bespoke ? capcaleraBespoke : capcaleraGenerica, ...options });
    y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
  }
  const dates = diesSetmana(setmana);
  taula({ body: [['OPERARI: ' + (dades.operaris?.join(', ') || meta.autorNom), `SETMANA: ${dataCurta(setmana)} – ${dataCurta(dates[6])}`]], columnStyles: { 0: { cellWidth: 132 } } });
  taula({ head: [[model.titol]], body: [[model.instruccions]] });
  if (model.pdfInfoAddicional) taula({ head: [['Informació addicional']], body: [[model.pdfInfoAddicional]] });

  if (model.id === 'xarxa-clorada') {
    taula({ head: [[{ content: 'Clorador / Data', rowSpan: 2 }, ...model.grups.map(g => ({ content: g.nom, colSpan: 2 }))], ['Auto', 'Manual', 'Auto', 'Manual', 'Auto', 'Manual', 'Auto', 'Manual']],
      body: dades.lectures.map(r => [dataCurta(r.dia), ...['diposit','repsol','basf','clariant'].flatMap(k => [`hora: ${r.valors[k+'_hora'] || ''}\n${r.valors[k+'_auto'] || ''}`, r.valors[k+'_manual'] || ''])]),
      columnStyles: { 0: { cellWidth: 26 } }, bodyStyles: { minCellHeight: 8 }, });
  } else if (model.id === 'repsol-deslastres') {
    taula({ head: [[{ content: 'Clorador / Data', rowSpan: 2 }, ...model.grups.map(g => ({ content: g.nom, colSpan: 3 }))], ['Auto', 'Manual', 'Pulsos/hora', 'Auto', 'Manual', 'Pulsos/hora']],
      body: dades.lectures.map(r => [dataCurta(r.dia), ...['deslastres','porta80'].flatMap(k => ['hora: '+(r.valors[k+'_hora'] || '')+'\n'+(r.valors[k+'_auto'] || ''), r.valors[k+'_manual'] || '', r.valors[k+'_polsos'] || ''])]),
      columnStyles: { 0: { cellWidth: 26 } }, bodyStyles: { minCellHeight: 8 } });
  } else if (model.id === 'dupont') {
    taula({ head: [[{ content: 'Clorador / Data', rowSpan: 2 }, { content: 'Dupont', colSpan: 3 }], ['Auto', 'Manual', 'Pulsos/hora']],
      body: dades.lectures.map(r => [dataCurta(r.dia), `hora: ${r.valors.dupont_hora || ''}\n${r.valors.dupont_auto || ''}`, r.valors.dupont_manual || '', r.valors.polsos || '']), bodyStyles: { minCellHeight: 8 } });
  } else if (model.id === 'clor-tc8') {
    taula({ head: [[{ content: 'Fecha', rowSpan: 2 }, { content: 'TC-8 A', colSpan: 2 }, { content: 'Observaciones', rowSpan: 2 }], ['Hora', 'Valor']],
      body: dades.lectures.map(r => [dataCurta(r.dia), r.valors.hora || '', r.valors.valor || '', r.valors.observacions || '']),
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 } }, bodyStyles: { minCellHeight: 8 } });
  } else {
    // Disseny genèric per als controls setmanals creats des de l'editor (sense maquetació pròpia).
    const totsCamps = model.grups.flatMap(g => g.camps.map(c => ({ ...c, grupNom: g.nom })));
    taula({
      head: [['Data', ...totsCamps.map(c => `${c.grupNom} · ${c.label}`)]],
      body: dades.lectures.map(r => [dataCurta(r.dia), ...totsCamps.map(c => r.valors[c.key] || '')]),
      columnStyles: { 0: { cellWidth: 26 } }, bodyStyles: { minCellHeight: 8 },
    });
  }
  if (model.organoleptics.length) {
    taula({ head: [['Organolèptics']], body: [[model.notaOrg]] });
    const org = [...dades.organoleptics].sort((a,b) => a.dia.localeCompare(b.dia));
    const marks = (v: string | undefined, a: string, b: string) => [v === a ? 'X' : '', v === b ? 'X' : ''];
    const primerLloc = model.llocs[0];
    if (model.id === 'clor-tc8') {
      const body = org.map(r => [dataCurta(r.dia), r.lloc, ...marks(r.valors.color,'Incolor','Colora'), r.valors.terbolesa || '', r.valors.ph || '', r.valors.observacions || '']);
      while (body.length < 9) body.push(Array(7).fill(''));
      taula({ head: [[{ content:'Data', rowSpan:2 }, { content:'Lloc', rowSpan:2 }, { content:'Color', colSpan:2 }, { content:'Terbolesa', rowSpan:2 }, { content:'pH*', rowSpan:2 }, { content:'Observacions', rowSpan:2 }], ['Incolor','Colora']], body,
        columnStyles: { 0:{cellWidth:19},1:{cellWidth:24},2:{cellWidth:16},3:{cellWidth:16},4:{cellWidth:29},5:{cellWidth:16} }, bodyStyles: { minCellHeight:6.2 } });
    } else {
      const autoPerLloc = model.organoleptics.some(c => c.key.endsWith('_auto'));
      const body = org.map(r => [dataCurta(r.dia), r.lloc, ...marks(r.valors.color,'Incolor','Colora'), ...marks(r.valors.olor,'Inolor','Olora'), ...marks(r.valors.sabor,'Insípida','Sabora'),
        autoPerLloc ? `${r.lloc === primerLloc || r.valors.terbolesa_auto ? 'Auto: '+(r.valors.terbolesa_auto || '')+'\n' : ''}Manual: ${r.valors.terbolesa_manual || ''}` : r.valors.terbolesa || '',
        autoPerLloc ? `${r.lloc === primerLloc || r.valors.ph_auto ? 'Auto: '+(r.valors.ph_auto || '')+'\n' : ''}Manual: ${r.valors.ph_manual || ''}` : r.valors.ph || '', r.valors.observacions || '']);
      while(body.length < 9) body.push(Array(11).fill(''));
      taula({ head: [[{content:'Data',rowSpan:2},{content:'Lloc',rowSpan:2},{content:'Color',colSpan:2},{content:'Olor',colSpan:2},{content:'Sabor',colSpan:2},'Terbolesa*','pH*',{content:'Observacions',rowSpan:2}], ['Incolor','Colora','Inolor','Olora','Insípida','Sabora','Màxim 4 UNF','6,5–9,5']], body,
        columnStyles: { 0:{cellWidth:17},1:{cellWidth:20},2:{cellWidth:9},3:{cellWidth:9},4:{cellWidth:9},5:{cellWidth:9},6:{cellWidth:9},7:{cellWidth:9},8:{cellWidth:25},9:{cellWidth:25} }, bodyStyles: { minCellHeight:6.2 } });
    }
  }
  taula({ head: [[model.notaAnomalies ? 'Reajust / Anomalies' : 'Anomalies']], body: [[model.notaAnomalies], [dades.anomalies || ' ']], bodyStyles: { minCellHeight: 6 } });
  taula({ head: [['Observacions']], body: [[dades.observacions || ' ']], bodyStyles: { minCellHeight: 10 } });
  if (meta.motiu) taula({ head: [['Motiu de la correcció']], body: [[meta.motiu]] });
  for(let i=1;i<=pdf.getNumberOfPages();i++) {
    pdf.setPage(i); pdf.setFont('helvetica','normal'); pdf.setFontSize(6); pdf.setTextColor(75);
    pdf.text(`Versió guardada ${meta.versio} · ${meta.creatEl.toLocaleString('ca-ES',{timeZone:'Europe/Madrid'})} · ${meta.autorNom}`,8,282);
    pdf.text(`ID: ${meta.id}`,8,287); pdf.text(`${i} / ${pdf.getNumberOfPages()}`,202,287,{align:'right'});
    if (peuText) { pdf.text(peuText, 105, 292, { align: 'center' }); }
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
