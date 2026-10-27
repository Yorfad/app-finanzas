export type TxType = 'expense' | 'income';

/** Campos comunes a todo lo que se guarda/sincroniza. Los borrados son lógicos (`deleted`) para poder sincronizarlos. */
export interface BaseEntity {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO, decide quién gana al sincronizar (last-write-wins)
  deleted?: boolean;
}

export interface Category extends BaseEntity {
  name: string;
  type: TxType;
  icon: string; // emoji
  color: string; // hex
  /** Palabras que ayudan a autocategorizar (ej. "uber", "taxi"). */
  keywords?: string[];
}

export interface Transaction extends BaseEntity {
  type: TxType;
  /** En centavos (entero) para evitar errores de coma flotante. Siempre positivo. */
  amount: number;
  description: string;
  categoryId: string;
  date: string; // YYYY-MM-DD
}

export interface Settings {
  currency: string;
}

export interface Snapshot {
  categories: Category[];
  transactions: Transaction[];
}

export type EntityKind = keyof Snapshot;
export type Entity = Category | Transaction;
