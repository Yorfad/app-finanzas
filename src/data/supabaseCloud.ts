import type { Session } from '@supabase/supabase-js';
import type { Category, Entity, EntityKind, Transaction } from '../core/types';
import type { CloudAdapter, CloudUser, RemoteStore } from './cloud';

type Row = Record<string, unknown>;

const toRow: Record<EntityKind, (e: Entity, userId: string) => Row> = {
  categories: (e, user_id) => {
    const c = e as Category;
    return {
      user_id, id: c.id, name: c.name, type: c.type, icon: c.icon, color: c.color,
      keywords: c.keywords ?? [], created_at: c.createdAt, updated_at: c.updatedAt, deleted: !!c.deleted,
    };
  },
  transactions: (e, user_id) => {
    const t = e as Transaction;
    return {
      user_id, id: t.id, type: t.type, amount: t.amount, description: t.description,
      category_id: t.categoryId, date: t.date, created_at: t.createdAt, updated_at: t.updatedAt, deleted: !!t.deleted,
    };
  },
};

const iso = (v: unknown) => new Date(v as string).toISOString();

const fromRow: Record<EntityKind, (r: Row) => Entity> = {
  categories: (r) => ({
    id: r.id as string, name: r.name as string, type: r.type as Category['type'], icon: r.icon as string,
    color: r.color as string, keywords: (r.keywords as string[]) ?? [],
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at), deleted: r.deleted as boolean,
  }),
  transactions: (r) => ({
    id: r.id as string, type: r.type as Transaction['type'], amount: Number(r.amount),
    description: r.description as string, categoryId: r.category_id as string, date: r.date as string,
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at), deleted: r.deleted as boolean,
  }),
};

const PAGE = 1000;
/** Margen al pedir cambios: cubre escrituras concurrentes; los duplicados se descartan por updatedAt. */
const OVERLAP_MS = 10_000;

const toUser = (s: Session | null): CloudUser | null => (s ? { id: s.user.id, email: s.user.email } : null);

export async function createSupabaseCloud(url: string, anonKey: string, redirectTo?: string): Promise<CloudAdapter> {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const requireUserId = async () => {
    const { data } = await client.auth.getSession();
    if (!data.session) throw new Error('No has iniciado sesión');
    return data.session.user.id;
  };

  const remote: RemoteStore = {
    async push(kind, items) {
      const userId = await requireUserId();
      for (let i = 0; i < items.length; i += PAGE) {
        const rows = items.slice(i, i + PAGE).map((e) => toRow[kind](e, userId));
        const { error } = await client.from(kind).upsert(rows, { onConflict: 'user_id,id' });
        if (error) throw new Error(error.message);
      }
    },
    async pullSince(kind, cursor) {
      await requireUserId();
      const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;
      const items: Entity[] = [];
      let last: string | null = cursor;
      for (let from = 0; ; from += PAGE) {
        let q = client.from(kind).select('*').order('synced_at').range(from, from + PAGE - 1);
        if (since) q = q.gt('synced_at', since);
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        for (const r of data ?? []) {
          items.push(fromRow[kind](r));
          last = r.synced_at as string;
        }
        if (!data || data.length < PAGE) break;
      }
      return { items, cursor: last };
    },
  };

  return {
    remote,
    async getUser() {
      const { data } = await client.auth.getSession();
      return toUser(data.session);
    },
    onAuthChange(cb) {
      const { data } = client.auth.onAuthStateChange((_event, session) => cb(toUser(session)));
      return () => data.subscription.unsubscribe();
    },
    async signIn(email) {
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      await client.auth.signOut();
    },
  };
}
