import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { COLORS, FALLBACK_CATEGORY } from '../core/defaults';
import { usageCount } from '../core/finance';
import type { Category, TxType } from '../core/types';
import { useFinance } from '../state/FinanceProvider';
import { Sheet } from './Sheet';

const SECTIONS: { type: TxType; title: string }[] = [
  { type: 'expense', title: 'Gastos' },
  { type: 'income', title: 'Ingresos' },
];

export function CategoriesView() {
  const { categories, transactions } = useFinance();
  const [editing, setEditing] = useState<{ cat?: Category; type: TxType } | null>(null);
  const usage = useMemo(() => usageCount(transactions), [transactions]);

  return (
    <section>
      <p className="muted small intro">
        Las categorías se ordenan solas según cuánto las usas. Añade palabras clave para que la app las sugiera al escribir.
      </p>
      {SECTIONS.map((s) => (
        <div key={s.type} className="block">
          <div className="block-head">
            <h3>{s.title}</h3>
            <button className="btn small" onClick={() => setEditing({ type: s.type })}>+ Nueva</button>
          </div>
          <ul className="card list">
            {categories
              .filter((c) => c.type === s.type)
              .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.name.localeCompare(b.name))
              .map((c) => (
                <li key={c.id}>
                  <button className="row" onClick={() => setEditing({ cat: c, type: c.type })}>
                    <span className="bubble" style={{ background: `${c.color}22` }}>{c.icon}</span>
                    <span className="row-main">
                      <span className="row-title">{c.name}</span>
                      {!!c.keywords?.length && <span className="muted small ellipsis">{c.keywords.join(', ')}</span>}
                    </span>
                    <span className="muted small">{usage.get(c.id) ?? 0} mov.</span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
      {editing && <CategoryEditor initial={editing.cat} type={editing.type} onClose={() => setEditing(null)} />}
    </section>
  );
}

function CategoryEditor({ initial, type, onClose }: { initial?: Category; type: TxType; onClose: () => void }) {
  const { saveCategory, deleteCategory } = useFinance();
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '📦');
  const [color, setColor] = useState(initial?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)]);
  const [keywords, setKeywords] = useState(initial?.keywords?.join(', ') ?? '');
  const isFallback = initial?.id === FALLBACK_CATEGORY[type];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await saveCategory({
      id: initial?.id,
      type,
      name,
      icon: icon.trim() || '📦',
      color,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
    });
    onClose();
  };

  const remove = async () => {
    if (initial && confirm(`¿Eliminar "${initial.name}"? Sus movimientos pasarán a "Otros".`)) {
      await deleteCategory(initial.id);
      onClose();
    }
  };

  return (
    <Sheet title={initial ? 'Editar categoría' : `Nueva categoría de ${type === 'expense' ? 'gasto' : 'ingreso'}`} onClose={onClose} onSubmit={submit}>
      <div className="icon-name">
        <input className="emoji-input" value={icon} onChange={(e) => setIcon(e.target.value)} aria-label="Emoji" maxLength={4} />
        <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!initial} required />
      </div>
      <div className="swatches">
        {COLORS.map((c) => (
          <button
            type="button"
            key={c}
            className={`swatch ${c === color ? 'selected' : ''}`}
            style={{ '--c': c } as CSSProperties}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <label className="field">
        <span className="muted small">Palabras clave (separadas por coma)</span>
        <input placeholder="ej. uber, taxi, gasolina" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
      </label>
      <div className="sheet-actions">
        {initial && !isFallback && <button type="button" className="btn danger" onClick={remove}>Eliminar</button>}
        <button type="submit" className="btn primary">Guardar</button>
      </div>
    </Sheet>
  );
}
