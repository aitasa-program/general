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

const SENSE_TIPUS = '__sense_tipus__';

export default function Inventari() {
  const usuariActual = getUsuariActual();
  const esEncarregat = usuariActual?.rol === 'ENCARREGAT';

  const [tipus, setTipus] = useState<TipusProducte[]>([]);
  const [productes, setProductes] = useState<Producte[]>([]);
  const [pendents, setPendents] = useState<MovimentInventari[]>([]);
  const [carregant, setCarregant] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [tipusSeleccionat, setTipusSeleccionat] = useState<string | null>(null);

  const [mostrarNouTipus, setMostrarNouTipus] = useState(false);
  const [nomTipus, setNomTipus] = useState('');

  const [mostrarNouProducte, setMostrarNouProducte] = useState(false);
  const [nom, setNom] = useState('');
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
        tipusId: tipusSeleccionat && tipusSeleccionat !== SENSE_TIPUS ? tipusSeleccionat : '',
        quantitat: Number(quantitatInicial) || 0,
        ubicacio,
        estanteria: estanteria === '' ? '' : Number(estanteria),
        stockMinim: Number(stockMinim) || 0,
      });
      setNom('');
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

  const productesSenseTipus = productes.filter((p) => !p.tipusId);

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

  // --- Vista de detall d'un tipus: només els productes d'aquell grup ---
  if (tipusSeleccionat) {
    const esSenseTipus = tipusSeleccionat === SENSE_TIPUS;
    const tipusActual = tipus.find((t) => t.id === tipusSeleccionat);
    const nomTipusActual = esSenseTipus ? 'Sense tipus' : tipusActual?.nom || '';
    const productesDelGrup = esSenseTipus ? productesSenseTipus : productes.filter((p) => p.tipusId === tipusSeleccionat);

    return (
      <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <BotoTornar />
        <button onClick={() => setTipusSeleccionat(null)} style={{ marginBottom: 12, display: 'block' }}>
          ← Tipus de producte
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>{nomTipusActual}</h1>
          {esEncarregat && !esSenseTipus && (
            <button onClick={() => setMostrarNouProducte(!mostrarNouProducte)}>
              {mostrarNouProducte ? 'Cancel·lar' : '+ Nou producte'}
            </button>
          )}
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        {ok && <p style={{ color: 'green' }}>{ok}</p>}

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

        {productesDelGrup.length === 0 ? (
          <p style={{ color: '#888' }}>Cap producte en aquest grup encara.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{productesDelGrup.map(targetaProducte)}</div>
        )}
      </div>
    );
  }

  // --- Vista principal: només els tipus de producte ---
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <BotoTornar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Magatzem</h1>
        {esEncarregat && (
          <button onClick={() => setMostrarNouTipus(!mostrarNouTipus)}>
            {mostrarNouTipus ? 'Cancel·lar' : '+ Nou tipus'}
          </button>
        )}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

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

      {tipus.length === 0 && productesSenseTipus.length === 0 && (
        <p style={{ color: '#888' }}>Encara no hi ha cap tipus de producte. Comença creant-ne un.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tipus.map((t) => {
          const total = productes.filter((p) => p.tipusId === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTipusSeleccionat(t.id)}
              style={{
                textAlign: 'left',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: 16,
                maxWidth: 420,
                fontSize: 16,
                cursor: 'pointer',
                background: 'white',
              }}
            >
              {t.nom} <span style={{ color: '#888', fontSize: 13 }}>({total} productes)</span>
            </button>
          );
        })}

        {productesSenseTipus.length > 0 && (
          <button
            onClick={() => setTipusSeleccionat(SENSE_TIPUS)}
            style={{
              textAlign: 'left',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 16,
              maxWidth: 420,
              fontSize: 16,
              cursor: 'pointer',
              background: 'white',
              color: '#888',
            }}
          >
            Sense tipus <span style={{ fontSize: 13 }}>({productesSenseTipus.length} productes)</span>
          </button>
        )}
      </div>
    </div>
  );
}
