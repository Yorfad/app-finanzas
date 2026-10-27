import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { suggestCategory } from '../core/autoCategorize';
import { FALLBACK_CATEGORY } from '../core/defaults';
import { frequentEntries, usageCount } from '../core/finance';
import { centsToInput, parseAmount } from '../core/money';
import type { Transaction, TxType } from '../core/types';
import { useFinance, useMoney } from '../state/FinanceProvider';
import { Sheet } from './Sheet';

interface Props {
  initial?: Transaction;
  defaultDate: string;
  onClose: () => void;
}

export function TransactionSheet({ initial, defaultDate, onClose }: Props) {
  const { categories, transactions, saveTransaction, deleteTransaction } = useFinance();
  const fmt = useMoney();
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amount) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [picked, setPicked] = useState(!!initial); // true cuando el usuario eligió la categoría a mano
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [error, setError] = useState('');

  const usage = useMemo(() => usageCount(transactions), [transactions]);
  const options = useMemo(
    () => categories.filter((c) => c.type === type).sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0)),
    [categories, type, usage],
  );
  const suggested = useMemo(
    () => suggestCategory(description, type, categories, transactions),
    [description, type, categories, transactions],
  );
  const frequent = useMemo(() => (initial ? [] : frequentEntries(transactions, type)), [initial, transactions, type]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const selected = picked && options.some((c) => c.id === categoryId) ? categoryId : suggested ?? '';

  useEffect(() => setError(''), [amount]);

  const pickCategory = (id: string) => {
    setCategoryId(id);
    setPicked(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cents = parseAmount(amount);
    if (cents === null) return setError('Escribe un monto válido');
    await saveTransaction({
      id: initial?.id,
      type,
      amount: cents,
      description,
      categoryId: selected || FALLBACK_CATEGORY[type],
      date: date || defaultDate,
    });
    onClose();
  };

  const remove = async () => {
    if (initial && confirm('¿Eliminar este movimiento?')) {
      await deleteTransaction(initial.id);
      onClose();
    }
  };

  return (
    <Sheet title={initial ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={onClose} onSubmit={submit}>
      <div className="segmented">
        <button type="button" className={type === 'expense' ? 'active expense' : ''} onClick={() => setType('expense')}>Gasto</button>
        <button type="button" className={type === 'income' ? 'active income' : ''} onClick={() => setType('income')}>Ingreso</button>
      </div>

      <input
        className={`amount-input ${type}`}
        inputMode="decimal"
        placeholder="0"
        autoFocus={!initial}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-label="Monto"
      />

      {frequent.length > 0 && !description && (
        <div className="chips">
          {frequent.map((f) => (
            <button
              type="button"
              key={`${f.description}|${f.categoryId}`}
              className="chip"
              onClick={() => {
                setAmount(centsToInput(f.amount));
                setDescription(f.description);
                pickCategory(f.categoryId);
              }}
            >
              {catById.get(f.categoryId)?.icon} {f.description} · {fmt(f.amount)}
            </button>
          ))}
        </div>
      )}

      <input
        placeholder="Descripción (ej. Supermercado)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        enterKeyHint="done"
      />

      <div className="label-row">
        <span>Categoría</span>
        {!picked && suggested && <span className="hint">✨ sugerida automáticamente</span>}
      </div>
      <div className="cat-grid">
        {options.map((c) => (
          <button
            type="button"
            key={c.id}
            className={`cat-pill ${selected === c.id ? 'selected' : ''}`}
            style={{ '--c': c.color } as CSSProperties}
            onClick={() => pickCategory(c.id)}
          >
            <span>{c.icon}</span>
            {c.name}
          </button>
        ))}
      </div>

      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Fecha" />

      {error && <p className="error">{error}</p>}

      <div className="sheet-actions">
        {initial && <button type="button" className="btn danger" onClick={remove}>Eliminar</button>}
        <button type="submit" className="btn primary">Guardar</button>
      </div>
    </Sheet>
  );
}
