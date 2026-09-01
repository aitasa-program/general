import { useState } from 'react';
import { Checklist } from '../services/checklists';

interface Props {
  item: Checklist['items'][number];
  onToggle: () => void;
  onGuardarText: (text: string) => void;
  onEliminar: () => void;
}

export default function FilaItemChecklist({ item, onToggle, onGuardarText, onEliminar }: Props) {
  const [editant, setEditant] = useState(false);
  const [text, setText] = useState(item.text);

  if (editant) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
        <input value={text} onChange={(e) => setText(e.target.value)} style={{ flex: 1 }} autoFocus />
        <button
          onClick={() => {
            onGuardarText(text);
            setEditant(false);
          }}
        >
          Desar
        </button>
        <button onClick={() => { setText(item.text); setEditant(false); }}>Cancel·lar</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <input type="checkbox" checked={item.marcat} onChange={onToggle} />
      <span
        onClick={() => setEditant(true)}
        style={{
          flex: 1,
          cursor: 'pointer',
          textDecoration: item.marcat ? 'line-through' : 'none',
          color: item.marcat ? '#aaa' : 'inherit',
        }}
        title="Clica per editar"
      >
        {item.text}
      </span>
      <button onClick={onEliminar} style={{ color: 'var(--c-error)', padding: '2px 8px' }}>✕</button>
    </div>
  );
}
