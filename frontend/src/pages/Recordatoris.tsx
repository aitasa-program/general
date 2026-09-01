import { useEffect, useState } from 'react';
import {
  Recordatori,
  llistarRecordatoris,
  crearRecordatori,
  eliminarRecordatori,
} from '../services/recordatoris';
import { estatNotificacions, activarNotificacions, enviarNotificacioProva } from '../services/push';
import BotoTornar from '../components/BotoTornar';

const etiquetaRepeticio: Record<string, string> = {
  UNIC: 'Únic',
  DIARI: 'Diari',
  SETMANAL: 'Setmanal',
};

export default function Recordatoris() {
  const [recordatoris, setRecordatoris] = useState<Recordatori[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [permis, setPermis] = useState<string>('default');

  const [text, setText] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [repeticio, setRepeticio] = useState<'UNIC' | 'DIARI' | 'SETMANAL'>('UNIC');

  async function carregar() {
    setCarregant(true);
    try {
      const dades = await llistarRecordatoris();
      setRecordatoris(dades.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()));
    } catch {
      setError('No s\'han pogut carregar els recordatoris');
    } finally {
      setCarregant(false);
    }
  }

  async function actualitzarEstatNotis() {
    const e = await estatNotificacions();
    setPermis(e);
  }

  useEffect(() => {
    carregar();
    actualitzarEstatNotis();
  }, []);

  async function handleActivarNotis() {
    const ok = await activarNotificacions();
    await actualitzarEstatNotis();
    if (ok) {
      try {
        await enviarNotificacioProva();
      } catch {
        // si la notificació de prova falla, no cal bloquejar la resta
      }
    } else {
      setError('No s\'han pogut activar les notificacions en aquest navegador');
    }
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await crearRecordatori({ text, dataHora, repeticio });
      setText('');
      setDataHora('');
      setRepeticio('UNIC');
      carregar();
    } catch {
      setError('No s\'ha pogut crear el recordatori');
    }
  }

  async function handleEliminar(id: string) {
    setRecordatoris((prev) => prev.filter((r) => r.id !== id));
    try {
      await eliminarRecordatori(id);
    } catch {
      setError('No s\'ha pogut eliminar el recordatori');
      carregar();
    }
  }

  if (carregant) return <p className="page text-muted">Carregant recordatoris...</p>;

  return (
    <div className="page">
      <BotoTornar />
      <h1>Recordatoris</h1>

      <div className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
        <p style={{ margin: '0 0 8px', fontWeight: 'bold' }}>
          Notificacions: {permis === 'granted' ? 'Activades' : permis === 'denied' ? 'Bloquejades pel navegador' : 'No activades'}
        </p>
        <p className="text-muted" style={{ fontSize: 13, margin: '0 0 10px' }}>
          Activa-les per rebre avisos al mòbil o ordinador encara que no tinguis la web oberta.
        </p>
        {permis !== 'granted' && <button onClick={handleActivarNotis}>Activar notificacions</button>}
      </div>

      {error && <p className="text-error">{error}</p>}

      <form onSubmit={handleCrear} className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Missatge</label>
          <input value={text} onChange={(e) => setText(e.target.value)} required style={{ width: '100%', padding: 6 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Data i hora</label>
          <input
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
            required
            style={{ width: '100%', padding: 6 }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Repetició</label>
          <select value={repeticio} onChange={(e) => setRepeticio(e.target.value as any)} style={{ width: '100%', padding: 6 }}>
            <option value="UNIC">Únic</option>
            <option value="DIARI">Diari</option>
            <option value="SETMANAL">Setmanal</option>
          </select>
        </div>
        <button type="submit">Crear recordatori</button>
      </form>

      {recordatoris.length === 0 && <p className="text-muted">No tens recordatoris programats.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recordatoris.map((r) => (
          <div
            key={r.id}
            className="card"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 10,
              maxWidth: 420,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 14 }}>{r.text}</p>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                {new Date(r.dataHora).toLocaleString('ca-ES')} · {etiquetaRepeticio[r.repeticio]}
              </p>
            </div>
            <button onClick={() => handleEliminar(r.id)}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
