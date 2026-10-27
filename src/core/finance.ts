import { normalize } from './text';
import type { BaseEntity, Category, Transaction, TxType } from './types';

export const alive = <T extends BaseEntity>(items: T[]): T[] => items.filter((i) => !i.deleted);

export function totals(txs: Transaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export const inMonth = (txs: Transaction[], month: string): Transaction[] =>
  txs.filter((t) => t.date.startsWith(month));

export function sortByNewest(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export interface DayGroup {
  date: string;
  items: Transaction[];
  net: number;
}

export function groupByDay(txs: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const t of sortByNewest(txs)) {
    let g = groups[groups.length - 1];
    if (!g || g.date !== t.date) groups.push((g = { date: t.date, items: [], net: 0 }));
    g.items.push(t);
    g.net += t.type === 'income' ? t.amount : -t.amount;
  }
  return groups;
}

export interface CategoryTotal {
  categoryId: string;
  category?: Category;
  total: number;
  count: number;
  share: number; // 0..1
}

export function totalsByCategory(txs: Transaction[], categories: Category[], type: TxType): CategoryTotal[] {
  const acc = new Map<string, { total: number; count: number }>();
  let sum = 0;
  for (const t of txs) {
    if (t.type !== type) continue;
    const cur = acc.get(t.categoryId) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    acc.set(t.categoryId, cur);
    sum += t.amount;
  }
  const byId = new Map(categories.map((c) => [c.id, c]));
  return [...acc]
    .map(([categoryId, v]) => ({ categoryId, category: byId.get(categoryId), ...v, share: sum ? v.total / sum : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Cuántas veces se usó cada categoría: sirve para ordenar las más usadas primero. */
export function usageCount(txs: Transaction[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of txs) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + 1);
  return m;
}

export interface FrequentEntry {
  description: string;
  categoryId: string;
  amount: number;
  count: number;
}

/** Movimientos que se repiten (misma descripción y categoría) en los últimos 90 días: atajos de un toque. */
export function frequentEntries(txs: Transaction[], type: TxType, limit = 4): FrequentEntry[] {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceIso = since.toISOString().slice(0, 10);
  const acc = new Map<string, FrequentEntry & { lastDate: string }>();
  for (const t of txs) {
    if (t.type !== type || t.date < sinceIso || !t.description.trim()) continue;
    const key = `${normalize(t.description)}|${t.categoryId}`;
    const cur = acc.get(key);
    if (!cur) {
      acc.set(key, { description: t.description.trim(), categoryId: t.categoryId, amount: t.amount, count: 1, lastDate: t.date });
    } else {
      cur.count += 1;
      if (t.date >= cur.lastDate) Object.assign(cur, { amount: t.amount, lastDate: t.date });
    }
  }
  return [...acc.values()]
    .filter((e) => e.count >= 2)
    .sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate))
    .slice(0, limit)
    .map(({ lastDate: _lastDate, ...e }) => e);
}
