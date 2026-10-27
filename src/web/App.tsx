import { useState } from 'react';
import { currentMonth, monthLabel, shiftMonth, todayISO } from '../core/dates';
import { inMonth, totals } from '../core/finance';
import type { Transaction } from '../core/types';
import { useFinance, useMoney } from '../state/FinanceProvider';
import { CategoriesView } from './CategoriesView';
import { Icon, type IconName } from './Icon';
import { SettingsView } from './SettingsView';
import { SummaryView } from './SummaryView';
import { TransactionSheet } from './TransactionSheet';
import { TransactionsView } from './TransactionsView';

type Tab = 'movs' | 'summary' | 'categories' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'movs', label: 'Movimientos', icon: 'list' },
  { id: 'summary', label: 'Resumen', icon: 'chart' },
  { id: 'categories', label: 'Categorías', icon: 'tag' },
  { id: 'settings', label: 'Ajustes', icon: 'gear' },
];

export function App() {
  const { ready, transactions, sync } = useFinance();
  const fmt = useMoney();
  const [tab, setTab] = useState<Tab>('movs');
  const [month, setMonth] = useState(currentMonth);
  const [sheet, setSheet] = useState<{ tx?: Transaction } | null>(null);

  if (!ready) return <div className="loading">Cargando…</div>;

  const all = totals(transactions);
  const mt = totals(inMonth(transactions, month));
  const showMonth = tab === 'movs' || tab === 'summary';
  const defaultDate = month === currentMonth() ? todayISO() : `${month}-01`;

  return (
    <div className="app">
      <header className="top">
        <div className="balance">
          <span className="muted">Saldo total</span>
          <strong className={all.balance < 0 ? 'neg' : ''}>{fmt(all.balance)}</strong>
          {sync.status === 'syncing' && <span className="sync-dot" title="Sincronizando" />}
        </div>
        {showMonth && (
          <>
            <div className="month-nav">
              <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior">‹</button>
              <button className="month-label" onClick={() => setMonth(currentMonth())}>{monthLabel(month)}</button>
              <button className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Mes siguiente">›</button>
            </div>
            <div className="month-stats">
              <div><span className="muted">Ingresos</span><b className="pos">{fmt(mt.income)}</b></div>
              <div><span className="muted">Gastos</span><b className="neg">{fmt(mt.expense)}</b></div>
            </div>
          </>
        )}
      </header>

      <main>
        {tab === 'movs' && <TransactionsView month={month} onEdit={(tx) => setSheet({ tx })} />}
        {tab === 'summary' && <SummaryView month={month} />}
        {tab === 'categories' && <CategoriesView />}
        {tab === 'settings' && <SettingsView />}
      </main>

      {showMonth && (
        <button className="fab" onClick={() => setSheet({})} aria-label="Nuevo movimiento">
          <Icon name="plus" />
        </button>
      )}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {sheet && <TransactionSheet initial={sheet.tx} defaultDate={defaultDate} onClose={() => setSheet(null)} />}
    </div>
  );
}
