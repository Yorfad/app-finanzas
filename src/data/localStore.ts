import type { Entity, EntityKind, Snapshot } from '../core/types';
import { readJson, type StorageDriver } from './storage';

const KEYS: Record<EntityKind, string> = {
  categories: 'fin:categories',
  transactions: 'fin:transactions',
};

/** Base de datos local: mantiene todo en memoria y lo persiste en el driver (localStorage, AsyncStorage...). */
export class LocalStore {
  private cache: Snapshot | null = null;

  constructor(private driver: StorageDriver) {}

  async load(): Promise<Snapshot> {
    if (!this.cache) {
      const [categories, transactions] = await Promise.all([
        readJson(this.driver, KEYS.categories, []),
        readJson(this.driver, KEYS.transactions, []),
      ]);
      this.cache ??= { categories, transactions };
    }
    return this.cache;
  }

  /**
   * Inserta o reemplaza por id. Con `onlyIfNewer` (usado al recibir datos de la nube)
   * solo reemplaza si el entrante tiene `updatedAt` más reciente: last-write-wins.
   * Devuelve cuántos registros cambiaron.
   */
  async upsertMany(kind: EntityKind, items: Entity[], opts: { onlyIfNewer?: boolean } = {}): Promise<number> {
    const snap = await this.load();
    const map = new Map<string, Entity>(snap[kind].map((e) => [e.id, e]));
    let changed = 0;
    for (const item of items) {
      const cur = map.get(item.id);
      if (opts.onlyIfNewer && cur && cur.updatedAt >= item.updatedAt) continue;
      map.set(item.id, item);
      changed++;
    }
    if (changed) {
      const list = [...map.values()];
      this.cache = { ...snap, [kind]: list } as Snapshot;
      await this.driver.setItem(KEYS[kind], JSON.stringify(list));
    }
    return changed;
  }
}
