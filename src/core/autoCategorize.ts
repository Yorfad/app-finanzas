import { normalize, tokens } from './text';
import type { Category, Transaction, TxType } from './types';

/**
 * Sugiere una categoría a partir de la descripción, aprendiendo del historial:
 *  1. Si ya usaste exactamente esa descripción, repite la última categoría elegida.
 *  2. Si no, puntúa por palabras compartidas con movimientos anteriores (+1 c/u)
 *     y por palabras clave de la categoría (+3 c/u).
 */
export function suggestCategory(
  description: string,
  type: TxType,
  categories: Category[],
  history: Transaction[],
): string | null {
  const text = normalize(description);
  if (text.length < 2) return null;

  const valid = new Map(categories.filter((c) => c.type === type).map((c) => [c.id, c]));
  const relevant = history.filter((t) => t.type === type && valid.has(t.categoryId));

  let exact: Transaction | undefined;
  for (const t of relevant) {
    if (normalize(t.description) === text && (!exact || t.date > exact.date)) exact = t;
  }
  if (exact) return exact.categoryId;

  const scores = new Map<string, number>();
  const add = (id: string, n: number) => scores.set(id, (scores.get(id) ?? 0) + n);
  const words = tokens(text);

  if (words.length) {
    for (const t of relevant) {
      const seen = new Set(tokens(t.description));
      for (const w of words) if (seen.has(w)) add(t.categoryId, 1);
    }
  }

  for (const c of valid.values()) {
    for (const k of c.keywords ?? []) {
      const nk = normalize(k);
      if (nk && (words.includes(nk) || (nk.length >= 4 && text.includes(nk)))) add(c.id, 3);
    }
  }

  let best: string | null = null;
  let bestScore = 0;
  for (const [id, score] of scores) {
    if (score > bestScore) [best, bestScore] = [id, score];
  }
  return best;
}
