export const CURRENCIES: { code: string; label: string; locale: string }[] = [
  { code: 'USD', label: 'Dólar estadounidense', locale: 'es-US' },
  { code: 'EUR', label: 'Euro', locale: 'es-ES' },
  { code: 'MXN', label: 'Peso mexicano', locale: 'es-MX' },
  { code: 'COP', label: 'Peso colombiano', locale: 'es-CO' },
  { code: 'ARS', label: 'Peso argentino', locale: 'es-AR' },
  { code: 'CLP', label: 'Peso chileno', locale: 'es-CL' },
  { code: 'PEN', label: 'Sol peruano', locale: 'es-PE' },
  { code: 'UYU', label: 'Peso uruguayo', locale: 'es-UY' },
  { code: 'BOB', label: 'Boliviano', locale: 'es-BO' },
  { code: 'PYG', label: 'Guaraní', locale: 'es-PY' },
  { code: 'VES', label: 'Bolívar', locale: 'es-VE' },
  { code: 'GTQ', label: 'Quetzal', locale: 'es-GT' },
  { code: 'HNL', label: 'Lempira', locale: 'es-HN' },
  { code: 'NIO', label: 'Córdoba', locale: 'es-NI' },
  { code: 'CRC', label: 'Colón costarricense', locale: 'es-CR' },
  { code: 'DOP', label: 'Peso dominicano', locale: 'es-DO' },
];

export const localeFor = (currency: string): string =>
  CURRENCIES.find((c) => c.code === currency)?.locale ?? 'es';

export function makeFormatter(currency: string): (cents: number) => string {
  let nf: Intl.NumberFormat;
  try {
    nf = new Intl.NumberFormat(localeFor(currency), { style: 'currency', currency, currencyDisplay: 'narrowSymbol' });
  } catch {
    nf = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return (cents) => nf.format(cents / 100);
}

/**
 * Convierte lo que escribe el usuario a centavos. Acepta "1234.5", "1.234,50", "1,234.50", "$ 20".
 * Si el último separador tiene 1-2 dígitos detrás se toma como decimal; si tiene 3, como miles.
 */
export function parseAmount(input: string): number | null {
  let s = input.replace(/[^\d.,]/g, '');
  if (!s) return null;
  const sep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  if (sep >= 0) {
    const decimals = s.length - sep - 1;
    const hasBoth = s.includes(',') && s.includes('.');
    if (hasBoth || decimals <= 2) {
      s = `${s.slice(0, sep).replace(/[.,]/g, '')}.${s.slice(sep + 1)}`;
    } else {
      s = s.replace(/[.,]/g, '');
    }
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** Centavos -> texto editable que parseAmount puede volver a leer (1250 -> "12.50", 1200 -> "12"). */
export const centsToInput = (cents: number): string =>
  cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
