import { useMemo } from 'react';
import { currentMonth, daysInMonth, shiftMonth } from '../core/dates';
import { inMonth, totals, totalsByCategory, type CategoryTotal } from '../core/finance';
import { useFinance, useMoney } from '../state/FinanceProvider';

export function SummaryView({ month }: { month: string }) {
  const { transactions, categories } = useFinance();
  const fmt = useMoney();

  const data = useMemo(() => {
    const list = inMonth(transactions, month);
    const t = totals(list);
    const prev = totals(inMonth(transactions, shiftMonth(month, -1)));
    const elapsed = month === currentMonth() ? new Date().getDate() : daysInMonth(month);
    return {
      t,
      prev,
      perDay: Math.round(t.expense / elapsed),
      savingRate: t.income ? t.balance / t.income : null,
      expenseChange: prev.expense ? (t.expense - prev.expense) / prev.expense : null,
      expenses: totalsByCategory(list, categories, 'expense'),
      incomes: totalsByCategory(list, categories, 'income'),
    };
  }, [transactions, categories, month]);

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <section>
      <div className="stats-grid">
        <div className="card stat">
          <span className="muted small">Ahorro del mes</span>
          <b className={data.t.balance < 0 ? 'neg' : 'pos'}>{fmt(data.t.balance)}</b>
          {data.savingRate !== null && <span className="muted small">{pct(data.savingRate)} de tus ingresos</span>}
        </div>
        <div className="card stat">
          <span className="muted small">Gasto diario promedio</span>
          <b>{fmt(data.perDay)}</b>
          {data.expenseChange !== null && (
            <span className={`small ${data.expenseChange > 0 ? 'neg' : 'pos'}`}>
              {data.expenseChange > 0 ? '▲' : '▼'} {pct(Math.abs(data.expenseChange))} vs. mes anterior
            </span>
          )}
        </div>
      </div>

      <Breakdown title="Gastos por categoría" rows={data.expenses} fmt={fmt} empty="Sin gastos este mes." />
      <Breakdown title="Ingresos por categoría" rows={data.incomes} fmt={fmt} empty="Sin ingresos este mes." />
    </section>
  );
}

function Breakdown({ title, rows, fmt, empty }: { title: string; rows: CategoryTotal[]; fmt: (n: number) => string; empty: string }) {
  return (
    <div className="block">
      <h3>{title}</h3>
      <div className="card pad">
        {!rows.length && <p className="muted">{empty}</p>}
        {rows.map((r) => (
          <div key={r.categoryId} className="bar-row">
            <div className="bar-label">
              <span>{r.category?.icon ?? '❔'} {r.category?.name ?? 'Sin categoría'}</span>
              <span>
                <b>{fmt(r.total)}</b> <span className="muted small">{Math.round(r.share * 100)}%</span>
              </span>
            </div>
            <div className="bar">
              <div style={{ width: `${Math.max(r.share * 100, 2)}%`, background: r.category?.color ?? '#64748b' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
