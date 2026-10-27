import type { EntityKind } from '../core/types';
import type { RemoteStore } from './cloud';
import type { LocalStore } from './localStore';
import { readJson, type StorageDriver } from './storage';

const DIRTY_KEY = 'fin:sync:dirty';
const CURSOR_KEY = 'fin:sync:cursor';
const KINDS: EntityKind[] = ['categories', 'transactions'];

type Dirty = Record<EntityKind, string[]>;
type Cursor = Partial<Record<EntityKind, string>>;

/**
 * Sincronización local-first:
 *  - Cada cambio local se guarda al instante y su id entra en una cola de "pendientes".
 *  - Al sincronizar: se suben los pendientes y luego se bajan los cambios del servidor
 *    desde el último cursor, resolviendo conflictos por `updatedAt` (gana el más reciente).
 *  - Sin conexión no pasa nada: la cola espera al próximo intento.
 */
export class SyncEngine {
  private dirty: Dirty | null = null;

  constructor(
    private local: LocalStore,
    private driver: StorageDriver,
  ) {}

  private async getDirty(): Promise<Dirty> {
    this.dirty ??= await readJson<Dirty>(this.driver, DIRTY_KEY, { categories: [], transactions: [] });
    return this.dirty;
  }

  async markDirty(kind: EntityKind, ids: string[]): Promise<void> {
    const dirty = await this.getDirty();
    const set = new Set(dirty[kind]);
    ids.forEach((id) => set.add(id));
    dirty[kind] = [...set];
    await this.driver.setItem(DIRTY_KEY, JSON.stringify(dirty));
  }

  async pendingCount(): Promise<number> {
    const d = await this.getDirty();
    return d.categories.length + d.transactions.length;
  }

  /** Devuelve cuántos registros llegaron/cambiaron desde la nube. */
  async sync(remote: RemoteStore): Promise<number> {
    const dirty = await this.getDirty();
    const snap = await this.local.load();

    for (const kind of KINDS) {
      const ids = [...dirty[kind]];
      if (!ids.length) continue;
      const wanted = new Set(ids);
      await remote.push(kind, snap[kind].filter((e) => wanted.has(e.id)));
      // Solo quitamos lo que se subió: lo que se marcó durante el push queda para la próxima.
      dirty[kind] = dirty[kind].filter((id) => !wanted.has(id));
      await this.driver.setItem(DIRTY_KEY, JSON.stringify(dirty));
    }

    const cursor = await readJson<Cursor>(this.driver, CURSOR_KEY, {});
    let changed = 0;
    for (const kind of KINDS) {
      const res = await remote.pullSince(kind, cursor[kind] ?? null);
      changed += await this.local.upsertMany(kind, res.items, { onlyIfNewer: true });
      if (res.cursor) cursor[kind] = res.cursor;
    }
    await this.driver.setItem(CURSOR_KEY, JSON.stringify(cursor));
    return changed;
  }

  /** Al cerrar sesión: el próximo usuario empieza descargando todo de nuevo. */
  async reset(): Promise<void> {
    this.dirty = { categories: [], transactions: [] };
    await Promise.all([this.driver.removeItem(DIRTY_KEY), this.driver.removeItem(CURSOR_KEY)]);
  }
}
