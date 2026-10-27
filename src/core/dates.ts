const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = (): string => toISODate(new Date());
export const currentMonth = (): string => todayISO().slice(0, 7);

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
}

export function shiftMonth(month: string, delta: number): string {
  const d = parseISODate(`${month}-01`);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1)).slice(0, 7);
}

export function daysInMonth(month: string): number {
  const d = parseISODate(`${month}-01`);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function monthLabel(month: string, locale = 'es'): string {
  return capitalize(parseISODate(`${month}-01`).toLocaleDateString(locale, { month: 'long', year: 'numeric' }));
}

export function dayLabel(date: string, locale = 'es'): string {
  if (date === todayISO()) return 'Hoy';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === toISODate(yesterday)) return 'Ayer';
  return capitalize(parseISODate(date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }));
}
