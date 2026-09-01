import { useEffect, useState } from 'react';
import { getUsuariActual } from '../services/api';
import {
  MovimentInventari,
  Producte,
  TipusProducte,
  confirmarMoviment,
  crearProducte,
  crearTipus,
  llistarMovimentsPendents,
  llistarProductes,
  llistarTipus,
  registrarMoviment,
} from '../services/inventari';
import BotoTornar from '../components/BotoTornar';

export default function Inventari() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [tipus, setTipus] = useState<TipusProducte[]>([]);
  const [productes, setProductes] = useState<Producte[]>([]);
  const [pendents, setPendents] = useState<MovimentInventari[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [mostrarNouTipus, setMostrarNouTipus] = useState(false);
  const [nomTipus, setNomTipus] = useState('');

  const [mostrarNouProducte, setMostrarNouProducte] = useState(false);
  const [nom, setNom] = useState('');
  const [tipusId, setTipusId] = useState('');
  const [quantitatInicial, setQuantitatInicial] = useState('0');
  const [ubicacio, setUbicacio] = useState('');
  const [estanteria, setEstanteria] = useState('');
  const [stockMinim, setStockMinim] = useState('0');

  const [producteMovimentId, setProducteMovimentId] = useState<Record<string, { tipus: 'ENTRADA' | 'SORTIDA'; quantitat: string }>>({});

  async function carregar() {
    setCarregant(true);
    try {
      const [dadesTipus, dadesProductes] = await Promise.all([llistarTipus(), llistarProductes()]);
      setTipus(dadesTipus);
      setProductes(dadesProductes);
      if (esEncarregat) {
        const dadesPendents = await llistarMovimentsPendents();
        setPendents(dadesPendents);
      }
    } catch {
      setError("No s'ha pogut carregar el magatzem");
    } finally {
      setCarregant(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleCrearTipus(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const nou = await crearTipus(nomTipus);
      setNomTipus('');
      setMostrarNouTipus(false);
      setTipus((prev) => [...prev, nou].sort((a, b) => a.nom.localeCompare(b.nom)));
    } catch {
      setError("No s'ha pogut crear el tipus (potser ja existeix)");
    }
  }

  async function handleCrearProducte(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await crearProducte({
        nom,
        tipusId,
        quantitat: Number(quantitatInicial) || 0,
        ubicacio,
        estanteria: estanteria === '' ? '' : Number(estanteria),
        stockMinim: Number(stockMinim) || 0,
      });
      setNom('');
      setTipusId('');
      setQuantitatInicial('0');
      setUbicacio('');
      setEstanteria('');
      setStockMinim('0');
      setMostrarNouProducte(false);
      carregar();
    } catch {
      setError("No s'ha pogut crear el producte");
    }
  }

  function actualitzarMoviment(producteId: string, camp: 'tipus' | 'quantitat', valor: string) {
    setProducteMovimentId((prev) => ({
      ...prev,
      [producteId]: {
        tipus: (camp === 'tipus' ? valor : prev[producteId]?.tipus) as 'ENTRADA' | 'SORTIDA',
        quantitat: camp === 'quantitat' ? valor : prev[producteId]?.quantitat || '',
      },
    }));
  }

  async function handleRegistrarMoviment(producteId: string) {
    setError('');
    setOk('');
    const moviment = producteMovimentId[producteId];
    const quantitat = Number(moviment?.quantitat);
    if (!moviment?.tipus || !quantitat || quantitat <= 0) {
      setError('Indica un tipus i una quantitat vàlida per registrar el moviment');
      return;
    }
    try {
      await registrarMoviment({ producteId, tipus: moviment.tipus, quantitat });
      setOk('Moviment registrat, pendent de confirmació per un encarregat');
      setProducteMovimentId((prev) => ({ ...prev, [producteId]: { tipus: moviment.tipus, quantitat: '' } }));
      if (esEncarregat) carregar();
    } catch {
      setError('No s\'ha pogut registrar el moviment');
    }
  }

  async function handleConfirmar(id: string, aprovat: boolean) {
    setError('');
    try {
      await confirmarMoviment(id, aprovat);
      carregar();
    } catch {
      setError('No s\'ha pogut actualitzar el moviment');
    }
  }

  if (carregant) return <p style={{ padding: 24, fontFamily: 'sans-serif' }}>Carregant magatzem...</p>;

  function targetaProducte(p: Producte) {
    const stockBaix = p.quantitat <= p.stockMinim;
    const moviment = producteMovimentId[p.id] || { tipus: 'ENTRADA' as const, quantitat: '' };
    return (
      <div
        key={p.id}
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 14,
          maxWidth: 560,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <strong>{p.nom}</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            Quantitat: <span style={{ color: stockBaix ? '#c0392b' : 'inherit', fontWeight: stockBaix ? 'bold' : 'normal' }}>{p.quantitat}</span>
            {stockBaix && ' ⚠ stock baix'}
            {p.ubicacio && ` · Ubicació: ${p.ubicacio}`}
            {p.estanteria !== null && ` · Estanteria: ${p.estanteria}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={moviment.tipus}
            onChange={(e) => actualitzarMoviment(p.id, 'tipus', e.target.value)}
            style={{ padding: 6 }}
          >
            <option value="ENTRADA">Entrada</option>
            <option value="SORTIDA">Sortida</option>
          </select>
          <input
            type="number"
            placeholder="Quantitat"
            value={moviment.quantitat}
            onChange={(e) => actualitzarMoviment(p.id, 'quantitat', e.target.value)}
            style={{ width: 90, padding: 6 }}
          />
          <button onClick={() => handleRegistrarMoviment(p.id)}>Registrar</button>
        </div>
      </div>
    );
  }

  const productesSenseTipus = productes.filter((p) => !p.tipusId);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Magatzem</h1>
        {esEncarregat && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMostrarNouTipus(!mostrarNouTipus)}>
              {mostrarNouTipus ? 'Cancel·lar' : '+ Nou tipus'}
            </button>
            <button onClick={() => setMostrarNouProducte(!mostrarNouProducte)}>
              {mostrarNouProducte ? 'Cancel·lar' : '+ Nou producte'}
            </button>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {ok && <p style={{ color: 'green' }}>{ok}</p>}

      {mostrarNouTipus && (
        <form
          onSubmit={handleCrearTipus}
          style={{ border: '1px solid #ddd', padding: 16, marginBottom: 20, maxWidth: 420 }}
        >
          <div style={{ marginBottom: 10 }}>
            <label>Nom del tipus (ex: Palets, Caixes petites, Ferramenta...)</label>
            <input
              value={nomTipus}
              onChange={(e) => setNomTipus(e.target.value)}
              required
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <button type="submit">Crear tipus</button>
        </form>
      )}

      {mostrarNouProducte && (
        <form
          onSubmit={handleCrearProducte}
          style={{ border: '1px solid #ddd', padding: 16, marginBottom: 20, maxWidth: 420 }}
        >
          <div style={{ marginBottom: 10 }}>
            <label>Nom</label>
            <input value={nom} onChange={(e) => setNom(e.target.value)} required style={{ width: '100%', padding: 6 }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Tipus de producte</label>
            <select
              value={tipusId}
              onChange={(e) => setTipusId(e.target.value)}
              required
              style={{ width: '100%', padding: 6 }}
            >
              <option value="">Selecciona un tipus...</option>
              {tipus.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </select>
            {tipus.length === 0 && (
              <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
                Encara no hi ha cap tipus creat — crea'n un primer amb "+ Nou tipus".
              </p>
            )}
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Quantitat</label>
            <input
              type="number"
              value={quantitatInicial}
              onChange={(e) => setQuantitatInicial(e.target.value)}
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Ubicació</label>
            <input value={ubicacio} onChange={(e) => setUbicacio(e.target.value)} style={{ width: '100%', padding: 6 }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Estanteria</label>
            <input
              type="number"
              value={estanteria}
              onChange={(e) => setEstanteria(e.target.value)}
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Stock mínim (per avisar quan quedi poc)</label>
            <input
              type="number"
              value={stockMinim}
              onChange={(e) => setStockMinim(e.target.value)}
              style={{ width: '100%', padding: 6 }}
            />
          </div>
          <button type="submit">Crear producte</button>
        </form>
      )}

      {esEncarregat && pendents.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16 }}>Moviments pendents de confirmar</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendents.map((m) => (
              <div
                key={m.id}
                style={{
                  border: '1px solid #f0c36d',
                  background: '#fffaf0',
                  borderRadius: 6,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  maxWidth: 520,
                }}
              >
                <span style={{ fontSize: 13 }}>
                  <strong>{m.tipus === 'ENTRADA' ? '+ Entrada' : '− Sortida'}</strong> de {m.quantitat} × {m.producte.nom}
                  <br />
                  Registrat per {m.usuariRegistra.nom} el {new Date(m.dataRegistre).toLocaleString()}
                </span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleConfirmar(m.id, true)}>Confirmar</button>
                  <button onClick={() => handleConfirmar(m.id, false)}>Rebutjar</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tipus.length === 0 && productes.length === 0 && (
        <p style={{ color: '#888' }}>Encara no hi ha tipus ni productes. Comença creant un tipus de producte.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {tipus.map((t) => {
          const productesDelTipus = productes.filter((p) => p.tipusId === t.id);
          return (
            <div key={t.id}>
              <h2 style={{ fontSize: 18, borderBottom: '2px solid #ddd', paddingBottom: 6 }}>{t.nom}</h2>
              {productesDelTipus.length === 0 ? (
                <p style={{ color: '#888', fontSize: 13 }}>Cap producte en aquest grup encara.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                  {productesDelTipus.map(targetaProducte)}
                </div>
              )}
            </div>
          );
        })}

        {productesSenseTipus.length > 0 && (
          <div>
            <h2 style={{ fontSize: 18, borderBottom: '2px solid #ddd', paddingBottom: 6 }}>Sense tipus</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {productesSenseTipus.map(targetaProducte)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
