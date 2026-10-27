import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { defaultCategories, FALLBACK_CATEGORY } from '../core/defaults';
import { alive } from '../core/finance';
import { newId, nowIso } from '../core/id';
import { makeFormatter } from '../core/money';
import type { Category, Entity, EntityKind, Settings, Snapshot, Transaction } from '../core/types';
import type { CloudAdapter, CloudUser } from '../data/cloud';
import { LocalStore } from '../data/localStore';
import { readJson, type StorageDriver } from '../data/storage';
import { SyncEngine } from '../data/syncEngine';

const SETTINGS_KEY = 'fin:settings';
const DEFAULT_SETTINGS: Settings = { currency: 'USD' };
const SYNC_DELAY_MS = 1500;

export type TransactionInput = Pick<Transaction, 'type' | 'amount' | 'description' | 'categoryId' | 'date'> & { id?: string };
export type CategoryInput = Pick<Category, 'name' | 'type' | 'icon' | 'color' | 'keywords'> & { id?: string };

export interface SyncState {
  /** off = sin nube configurada; signedOut = configurada pero sin sesión. */
  status: 'off' | 'signedOut' | 'idle' | 'syncing' | 'error';
  user?: CloudUser | null;
  error?: string;
  lastSync?: string;
}

interface FinanceContextValue {
  ready: boolean;
  categories: Category[];
  transactions: Transaction[];
  settings: Settings;
  saveTransaction(input: TransactionInput): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  saveCategory(input: CategoryInput): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  exportData(): Snapshot & { version: number; exportedAt: string };
  importData(data: unknown): Promise<number>;
  sync: SyncState & {
    run(): Promise<void>;
    signIn(email: string): Promise<void>;
    signOut(): Promise<void>;
  };
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance debe usarse dentro de <FinanceProvider>');
  return ctx;
}

export function useMoney(): (cents: number) => string {
  const { settings } = useFinance();
  return useMemo(() => makeFormatter(settings.currency), [settings.currency]);
}

interface Props {
  /** webStorageDriver en web, AsyncStorage en React Native. */
  driver: StorageDriver;
  /** Opcional: si no se pasa, la app funciona 100% local. */
  createCloud?: (() => Promise<CloudAdapter>) | null;
  children: ReactNode;
}

export function FinanceProvider({ driver, createCloud, children }: Props) {
  const { local, engine } = useMemo(() => {
    const local = new LocalStore(driver);
    return { local, engine: new SyncEngine(local, driver) };
  }, [driver]);

  const [snap, setSnap] = useState<Snapshot>({ categories: [], transactions: [] });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState<CloudAdapter | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({ status: createCloud ? 'signedOut' : 'off' });

  // Carga inicial + categorías por defecto la primera vez.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await local.load();
      if (!data.categories.length) {
        const seeds = defaultCategories();
        await local.upsertMany('categories', seeds);
        await engine.markDirty('categories', seeds.map((c) => c.id));
      }
      const s = await readJson(driver, SETTINGS_KEY, DEFAULT_SETTINGS);
      if (cancelled) return;
      setSettings({ ...DEFAULT_SETTINGS, ...s });
      setSnap(await local.load());
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [driver, local, engine]);

  // Conexión con la nube (si está configurada).
  useEffect(() => {
    if (!createCloud) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    createCloud()
      .then(async (c) => {
        if (cancelled) return;
        setCloud(c);
        const onUser = (user: CloudUser | null) =>
          setSyncState((s) => ({ ...s, user, status: user ? (s.status === 'signedOut' ? 'idle' : s.status) : 'signedOut' }));
        onUser(await c.getUser());
        unsub = c.onAuthChange(onUser);
      })
      .catch((e) => setSyncState({ status: 'error', error: String(e?.message ?? e) }));
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [createCloud]);

  const userId = syncState.user?.id;

  const runSync = useCallback(async () => {
    if (!cloud || !userId) return;
    setSyncState((s) => ({ ...s, status: 'syncing', error: undefined }));
    try {
      await engine.sync(cloud.remote);
      setSnap(await local.load());
      setSyncState((s) => ({ ...s, status: 'idle', lastSync: nowIso() }));
    } catch (e) {
      setSyncState((s) => ({ ...s, status: 'error', error: e instanceof Error ? e.message : String(e) }));
    }
  }, [cloud, userId, engine, local]);

  const runSyncRef = useRef(runSync);
  runSyncRef.current = runSync;
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const scheduleSync = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => runSyncRef.current(), SYNC_DELAY_MS);
  }, []);

  // Sincroniza al iniciar sesión / abrir la app.
  useEffect(() => {
    if (ready && userId) runSync();
  }, [ready, userId, runSync]);

  const persist = useCallback(
    async (kind: EntityKind, items: Entity[]) => {
      await local.upsertMany(kind, items);
      await engine.markDirty(kind, items.map((i) => i.id));
      setSnap(await local.load());
      scheduleSync();
    },
    [local, engine, scheduleSync],
  );

  const value = useMemo<FinanceContextValue>(() => {
    const categories = alive(snap.categories);
    const transactions = alive(snap.transactions);
    const stamp = <T extends Entity>(existing: T | undefined, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): T => {
      const now = nowIso();
      return { ...data, id: data.id ?? newId(), createdAt: existing?.createdAt ?? now, updatedAt: now, deleted: false } as T;
    };

    return {
      ready,
      categories,
      transactions,
      settings,

      async saveTransaction(input) {
        const existing = snap.transactions.find((t) => t.id === input.id);
        await persist('transactions', [stamp<Transaction>(existing, { ...input, description: input.description.trim() })]);
      },

      async deleteTransaction(id) {
        const t = snap.transactions.find((x) => x.id === id);
        if (t) await persist('transactions', [{ ...t, deleted: true, updatedAt: nowIso() }]);
      },

      async saveCategory(input) {
        const existing = snap.categories.find((c) => c.id === input.id);
        await persist('categories', [stamp<Category>(existing, { ...input, name: input.name.trim() })]);
      },

      async deleteCategory(id) {
        const c = snap.categories.find((x) => x.id === id);
        if (!c || id === FALLBACK_CATEGORY[c.type]) return;
        const now = nowIso();
        // Los movimientos de esa categoría pasan a "Otros" para no perder nada.
        const moved = transactions
          .filter((t) => t.categoryId === id)
          .map((t) => ({ ...t, categoryId: FALLBACK_CATEGORY[c.type], updatedAt: now }));
        if (moved.length) await persist('transactions', moved);
        await persist('categories', [{ ...c, deleted: true, updatedAt: now }]);
      },

      async updateSettings(patch) {
        const next = { ...settings, ...patch };
        setSettings(next);
        await driver.setItem(SETTINGS_KEY, JSON.stringify(next));
      },

      exportData() {
        return { version: 1, exportedAt: nowIso(), categories, transactions };
      },

      async importData(data) {
        const d = data as Partial<Snapshot> | null;
        if (!d || !Array.isArray(d.categories) || !Array.isArray(d.transactions)) {
          throw new Error('El archivo no es una copia de seguridad válida');
        }
        let n = 0;
        for (const kind of ['categories', 'transactions'] as const) {
          const items = (d[kind] as Entity[]).filter((e) => e && typeof e.id === 'string' && typeof e.updatedAt === 'string');
          n += await local.upsertMany(kind, items, { onlyIfNewer: true });
          await engine.markDirty(kind, items.map((i) => i.id));
        }
        setSnap(await local.load());
        scheduleSync();
        return n;
      },

      sync: {
        ...syncState,
        run: runSync,
        async signIn(email) {
          if (!cloud) throw new Error('La nube no está configurada');
          await cloud.signIn(email);
        },
        async signOut() {
          if (!cloud) return;
          await cloud.signOut();
          await engine.reset();
        },
      },
    };
  }, [snap, settings, ready, syncState, persist, runSync, cloud, driver, local, engine, scheduleSync]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
