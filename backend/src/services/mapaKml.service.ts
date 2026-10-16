import { DOMParser, Element } from '@xmldom/xmldom';

export interface PuntKml { nom: string; descripcio?: string; lat: number; lon: number }
export interface CapaKml { id: string; nom: string; color: string; punts: PuntKml[] }

const PALETA_FALLBACK = ['#1976d2', '#d32f2f', '#097138', '#9c27b0', '#e59429', '#3949ab', '#00838f', '#c2185b', '#7b8c42', '#6d4c41'];

function slug(s: string): string {
  const net = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return net || 'capa';
}
function nomLocal(node: { nodeType: number; tagName?: string }): string {
  if (node.nodeType !== 1 || !node.tagName) return '';
  const t = node.tagName;
  return t.includes(':') ? t.slice(t.indexOf(':') + 1) : t;
}
function fills(parent: Element): Element[] {
  const out: Element[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const n = parent.childNodes[i] as unknown as Element & { nodeType: number };
    if (n.nodeType === 1) out.push(n as Element);
  }
  return out;
}
function primerFill(parent: Element, tag: string): Element | null {
  return fills(parent).find(e => nomLocal(e) === tag) || null;
}
function text(el: Element | null): string {
  return el?.textContent?.trim() || '';
}
function attr(el: Element, name: string): string | null {
  return el.getAttribute(name) ?? null;
}

// Extreu el color (hex) de cada id d'estil "_normal" definit a gx:CascadingStyle (Google Earth)
// o a Style/StyleMap clàssics, per poder acolorir cada capa com la tenia l'usuari al mapa.
function colorsPerEstil(doc: Element): Map<string, string> {
  const colors = new Map<string, string>();
  const tots: Element[] = [];
  (function recorre(el: Element) { for (const f of fills(el)) { tots.push(f); recorre(f); } })(doc);
  for (const el of tots) {
    const local = nomLocal(el);
    if (local !== 'CascadingStyle' && local !== 'Style') continue;
    const id = attr(el, 'kml:id') || attr(el, 'id');
    if (!id) continue;
    const iconStyle = (function cerca(e: Element): Element | null {
      for (const f of fills(e)) { if (nomLocal(f) === 'IconStyle') return f; const r = cerca(f); if (r) return r; }
      return null;
    })(el);
    const href = iconStyle && (function cerca(e: Element): Element | null {
      for (const f of fills(e)) { if (nomLocal(f) === 'href') return f; const r = cerca(f); if (r) return r; }
      return null;
    })(iconStyle);
    const url = text(href);
    const m = url.match(/color=([0-9a-fA-F]{6})/);
    if (m) colors.set(id, '#' + m[1]);
  }
  return colors;
}

export function parseKml(xml: string): CapaKml[] {
  const doc = new DOMParser({ errorHandler: () => {} }).parseFromString(xml, 'text/xml');
  const arrel = doc.documentElement as unknown as Element;
  if (!arrel) throw new Error('El fitxer no és un KML vàlid');
  const colorsEstil = colorsPerEstil(arrel);

  // id d'estil "normal" -> color, a partir dels StyleMap (Pair "normal" -> styleUrl)
  const colorPerStyleMap = new Map<string, string>();
  (function recorre(el: Element) {
    for (const f of fills(el)) {
      if (nomLocal(f) === 'StyleMap') {
        const id = attr(f, 'id');
        if (id) {
          for (const pair of fills(f)) {
            if (nomLocal(pair) !== 'Pair') continue;
            const key = text(primerFill(pair, 'key'));
            if (key !== 'normal') continue;
            const url = text(primerFill(pair, 'styleUrl')).replace(/^#/, '');
            const color = colorsEstil.get(url);
            if (color) colorPerStyleMap.set(id, color);
          }
        }
      }
      recorre(f);
    }
  })(arrel);

  const capes: CapaKml[] = [];
  const usats = new Set<string>();

  function walk(el: Element, carpeta: CapaKml | null) {
    for (const fill of fills(el)) {
      const local = nomLocal(fill);
      if (local === 'Folder') {
        const nom = text(primerFill(fill, 'name')) || 'Capa';
        let id = slug(nom);
        while (usats.has(id)) id = id + '-2';
        usats.add(id);
        const nova: CapaKml = { id, nom, color: '', punts: [] };
        capes.push(nova);
        walk(fill, nova);
        continue;
      }
      if (local === 'Placemark' && carpeta) {
        const nom = text(primerFill(fill, 'name'));
        const descCru = text(primerFill(fill, 'description'));
        const punt = primerFill(fill, 'Point');
        const coords = punt && text(primerFill(punt, 'coordinates'));
        if (coords) {
          const [lonS, latS] = coords.split(',');
          const lon = Number(lonS), lat = Number(latS);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            const descripcio = netejaDescripcio(descCru);
            carpeta.punts.push({ nom: nom || 'Sense nom', lat, lon, ...(descripcio ? { descripcio } : {}) });
          }
        }
        const styleUrl = text(primerFill(fill, 'styleUrl')).replace(/^#/, '');
        if (styleUrl && !carpeta.color) {
          const color = colorPerStyleMap.get(styleUrl) || colorsEstil.get(styleUrl);
          if (color) carpeta.color = color;
        }
        continue;
      }
      walk(fill, carpeta);
    }
  }
  walk(arrel, null);

  let seguentColor = 0;
  for (const c of capes) if (!c.color) c.color = PALETA_FALLBACK[seguentColor++ % PALETA_FALLBACK.length];
  return capes.filter(c => c.punts.length > 0);
}

function netejaDescripcio(raw: string): string {
  if (!raw) return '';
  const m = raw.match(/descripci[óo]<\/b>:\s*([\s\S]*?)<\/div>/i);
  let val = m ? m[1] : raw;
  val = val.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();
  if (!val || val.toLowerCase() === 'empty') return '';
  return val.slice(0, 2000);
}
