import { useMemo, useState } from 'react';
import { dayLabel } from '../core/dates';
import { groupByDay, inMonth } from '../core/finance';
import { normalize } from '../core/text';
import type { Category, Transaction } from '../core/types';
import { useFinance, useMoney } from '../state/FinanceProvider';
import { Icon } from './Icon';

export function TransactionsView({ month, onEdit }: { month: string; onEdit: (tx: Transaction) => void }) {
  const { transactions, categories } = useFinance();
  const fmt = useMoney();
  const [query, setQuery] = useState('');
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const days = useMemo(() => {
    let list = inMonth(transactions, month);
    const q = normalize(query);
    if (q) {
      list = list.filter(
        (t) => normalize(t.description).includes(q) || normalize(catById.get(t.categoryId)?.name ?? '').includes(q),
      );
    }
    return groupByDay(list);
  }, [transactions, month, query, catById]);

  return (
    <section>
      <label className="search">
        <Icon name="search" />
        <input type="search" placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {!days.length && (
        <div className="empty">
          <p>{query ? 'Nada coincide con la búsqueda.' : 'Aún no hay movimientos este mes.'}</p>
          {!query && <p className="muted">Toca <b>+</b> para registrar un gasto o ingreso.</p>}
        </div>
      )}

      {days.map((d) => (
        <div key={d.date} className="day">
          <div className="day-head">
            <span>{dayLabel(d.date)}</span>
            <span className={d.net < 0 ? 'neg' : 'pos'}>{fmt(d.net)}</span>
          </div>
          <ul className="card list">
            {d.items.map((t) => (
              <TxRow key={t.id} tx={t} category={catById.get(t.categoryId)} fmt={fmt} onClick={() => onEdit(t)} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function TxRow({ tx, category, fmt, onClick }: { tx: Transaction; category?: Category; fmt: (n: number) => string; onClick: () => void }) {
  const name = category?.name ?? 'Sin categoría';
  return (
    <li>
      <button className="row" onClick={onClick}>
        <span className="bubble" style={{ background: `${category?.color ?? '#64748b'}22` }}>{category?.icon ?? '❔'}</span>
        <span className="row-main">
          <span className="row-title">{tx.description || name}</span>
          {tx.description && <span className="muted small">{name}</span>}
        </span>
        <span className={`amount ${tx.type === 'income' ? 'pos' : ''}`}>
          {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
        </span>
      </button>
    </li>
  );
}
