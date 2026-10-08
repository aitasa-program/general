import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  NotaPersonal,
  crearNotaPersonal,
  editarNotaPersonal,
  eliminarNotaPersonal,
  errorNotes,
  llistarNotesPersonals,
  obtenirFotoNotaUrl,
} from '../services/notesPersonals';
import BotoTornar from '../components/BotoTornar';

function llegirComABase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lectura del fitxer fallida'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

export default function NotesPersonals() {
  const [notes, setNotes] = useState<NotaPersonal[]>([]);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');

  const [text, setText] = useState('');
  const [foto, setFoto] = useState<{ nom: string; base64: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [desant, setDesant] = useState(false);

  const [editantId, setEditantId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function carregar() {
    setCarregant(true);
    try {
      const llista = await llistarNotesPersonals();
      setNotes(llista);
      const entrades = await Promise.all(
        llista.filter((n) => n.teFoto).map(async (n) => [n.id, await obtenirFotoNotaUrl(n.id)] as const)
      );
      setFotos(Object.fromEntries(entrades.filter((e): e is [string, string] => !!e[1])));
    } catch (e) {
      setError(errorNotes(e));
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleTriarFoto(fitxers: FileList | null) {
    const file = fitxers?.[0];
    if (!file) return;
    setError('');
    if (file.size > 6 * 1024 * 1024) {
      setError('La foto ha de pesar com a màxim 6 MB');
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    try {
      setFoto({ nom: file.name, base64: await llegirComABase64(file) });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCrear(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() && !foto) return;
    setError('');
    setDesant(true);
    try {
      await crearNotaPersonal({ text: text.trim(), ...(foto ? { fotoBase64: foto.base64, fotoNomFitxer: foto.nom } : {}) });
      setText('');
      setFoto(null);
      if (fileInput.current) fileInput.current.value = '';
      await carregar();
    } catch (e) {
      setError(errorNotes(e));
    } finally {
      setDesant(false);
    }
  }

  function obrirEdicio(n: NotaPersonal) {
    setEditantId(editantId === n.id ? null : n.id);
    setEditText(n.text);
  }

  async function handleGuardarEdicio(id: string) {
    setBusyId(id);
    setError('');
    try {
      await editarNotaPersonal(id, { text: editText });
      setEditantId(null);
      await carregar();
    } catch (e) {
      setError(errorNotes(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleEliminar(id: string) {
    setBusyId(id);
    setError('');
    try {
      await eliminarNotaPersonal(id);
      await carregar();
    } catch (e) {
      setError(errorNotes(e));
    } finally {
      setBusyId(null);
    }
  }

  if (carregant) return <p className="page text-muted">Carregant les teves notes...</p>;

  return (
    <div className="page">
      <BotoTornar />
      <h1>Les meves notes</h1>
      <p className="text-muted" style={{ fontSize: 13 }}>
        Espai personal teu: escriu notes i adjunta fotos del que vulguis. Ningú més (ni els encarregats) pot veure
        el que hi guardis.
      </p>

      {error && <p className="text-error">{error}</p>}

      <form onSubmit={handleCrear} className="card" style={{ marginBottom: 20, width: '100%' }}>
        <label htmlFor="nota-text">Nova nota</label>
        <textarea id="nota-text" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={5000} style={{ width: '100%' }} disabled={desant} />
        <label htmlFor="nota-foto" style={{ marginTop: 8, display: 'block' }}>Foto (opcional)</label>
        <input ref={fileInput} id="nota-foto" type="file" accept=".png,.jpg,.jpeg" disabled={desant} onChange={(e) => handleTriarFoto(e.target.files)} />
        {foto && <p className="text-muted" style={{ fontSize: 12 }}>Foto seleccionada: {foto.nom}</p>}
        <button type="submit" disabled={desant || (!text.trim() && !foto)} style={{ marginTop: 10 }}>
          {desant ? 'Desant…' : 'Afegir nota'}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-muted">Encara no has guardat cap nota.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.map((n) => (
            <div key={n.id} className="card" style={{ width: '100%' }}>
              {fotos[n.id] && <img src={fotos[n.id]} alt="" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 6, marginBottom: 8 }} />}
              {editantId === n.id ? (
                <>
                  <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} maxLength={5000} style={{ width: '100%' }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button disabled={busyId === n.id} onClick={() => handleGuardarEdicio(n.id)}>Desar</button>
                    <button disabled={busyId === n.id} onClick={() => setEditantId(null)}>Cancel·lar</button>
                  </div>
                </>
              ) : (
                <>
                  {n.text && <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{n.text}</p>}
                  <p className="text-muted" style={{ fontSize: 12 }}>{new Date(n.actualitzatEl).toLocaleString('ca-ES')}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button disabled={busyId === n.id} onClick={() => obrirEdicio(n)} style={{ fontSize: 12 }}>Editar</button>
                    <button disabled={busyId === n.id} onClick={() => handleEliminar(n.id)} style={{ fontSize: 12, color: 'var(--c-error)' }}>Eliminar</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
