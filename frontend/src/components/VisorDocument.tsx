import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { DocumentArxiu, errorArxiu } from '../services/arxiu';
import './VisorDocument.css';

export const teVistaPrevia = (d: DocumentArxiu) => /\.(jpe?g|png|pdf)$/i.test(d.nomFitxer);

export default function VisorDocument({ document: doc, tancar }: { document: DocumentArxiu; tancar: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(100);
  const pdf = /\.pdf$/i.test(doc.nomFitxer);
  useEffect(() => {
    const element = dialog.current!;
    const overflow = window.document.body.style.overflow;
    element.showModal(); window.document.body.style.overflow = 'hidden';
    const controller = new AbortController();
    let objectUrl = '';
    api.get(`/documentacio/documents/${doc.id}/fitxer`, { responseType: 'blob', signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([data], { type: pdf ? 'application/pdf' : /\.png$/i.test(doc.nomFitxer) ? 'image/png' : 'image/jpeg' }));
      setUrl(objectUrl);
    }).catch(e => { if (!controller.signal.aborted) setError(errorArxiu(e)); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); window.document.body.style.overflow = overflow; };
  }, [doc.id, doc.nomFitxer, pdf]);
  return <dialog ref={dialog} className="document-viewer" aria-labelledby="viewer-title" onCancel={tancar} onClose={tancar}>
    <header className="document-viewer-header"><h2 id="viewer-title">{doc.nom}</h2><button autoFocus onClick={tancar}>Tancar</button></header>
    {!pdf && <div className="document-viewer-tools"><button disabled={zoom <= 100 || !url} aria-label="Reduir imatge" onClick={() => setZoom(z => Math.max(100, z - 50))}>−</button><output aria-live="polite">{zoom}%</output><button disabled={zoom >= 500 || !url} aria-label="Ampliar imatge" onClick={() => setZoom(z => Math.min(500, z + 50))}>+</button><button disabled={!url} onClick={() => setZoom(100)}>Ajustar</button><span>Amplia i desplaça la imatge per consultar el mapa.</span></div>}
    <div className="document-viewer-content">
      {error ? <p role="alert">{error}</p> : !url ? <p role="status">Carregant document…</p> : pdf ? <iframe title={doc.nom} src={url} /> : <img src={url} alt={doc.nom} draggable={false} style={{ width: `${zoom}%` }} onError={() => setError('No s’ha pogut mostrar la imatge.')} />}
    </div>
  </dialog>;
}
