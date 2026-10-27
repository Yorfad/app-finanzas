import type { Entity, EntityKind } from '../core/types';

/** Backend remoto genérico. Hoy lo implementa Supabase, pero podría ser Firebase, una API propia, etc. */
export interface RemoteStore {
  push(kind: EntityKind, items: Entity[]): Promise<void>;
  /** Trae lo que cambió en el servidor desde `cursor` (null = todo) y devuelve el nuevo cursor. */
  pullSince(kind: EntityKind, cursor: string | null): Promise<{ items: Entity[]; cursor: string | null }>;
}

export interface CloudUser {
  id: string;
  email?: string;
}

export interface CloudAdapter {
  remote: RemoteStore;
  getUser(): Promise<CloudUser | null>;
  onAuthChange(cb: (user: CloudUser | null) => void): () => void;
  /** Envía un enlace mágico de acceso al correo (sin contraseñas). */
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;
}
